import * as THREE from "three";
import type { Plugin, Sketch, SketchPrimitive } from "@/core/api/types";
import type { CanvasAPI } from "@/core/api/CanvasAPI";
import type { EventBus } from "@/core/api/EventBus";
import { useEditorStore } from "@/core/store/editorStore";
import { useProjectStore } from "@/core/store/projectStore";
import { useHistoryStore } from "@/core/store/historyStore";
import { detectProfiles, snapPoint, snapToHorizontal, snapToVertical } from "./constraints";
import { getSketchTool } from "./SketchToolbar";
import { v4 as uuidv4 } from "uuid";

export class SketchPluginLogic {
  private api: CanvasAPI | null = null;
  private bus: EventBus | null = null;
  private currentSketch: Sketch | null = null;
  private sketchGroup: THREE.Group | null = null;
  private drawingState: {
    isDrawing: boolean;
    startPoint: [number, number] | null;
    previewLine: THREE.Line | null;
  } = { isDrawing: false, startPoint: null, previewLine: null };
  private unsubscribers: (() => void)[] = [];
  private boundMouseDown: ((e: MouseEvent) => void) | null = null;
  private boundMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundMouseUp: ((e: MouseEvent) => void) | null = null;
  private canvasElement: HTMLCanvasElement | null = null;

  activate(api: CanvasAPI, bus: EventBus): void {
    this.api = api;
    this.bus = bus;

    // Show plane selector
    useEditorStore.getState().setShowPlaneSelector(true);

    // Listen for sketch:start
    this.unsubscribers.push(
      bus.on("sketch:start", ({ plane }) => {
        this.startSketch(plane);
      })
    );

    // Listen for sketch:complete
    this.unsubscribers.push(
      bus.on("sketch:complete", ({ sketchId }) => {
        this.finishSketch(sketchId);
      })
    );

    // Listen for sketch:cancel
    this.unsubscribers.push(
      bus.on("sketch:cancel", () => {
        this.cancelSketch();
      })
    );
  }

  deactivate(): void {
    this.removeCanvasListeners();
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
    if (this.sketchGroup && this.api) {
      this.api.removeHelper(this.sketchGroup);
    }
    this.currentSketch = null;
    this.sketchGroup = null;
    useEditorStore.getState().setMode("idle");
    useEditorStore.getState().setSketchPlane(null);
    useEditorStore.getState().setSelectedSketch(null);
  }

  private startSketch(plane: "XY" | "XZ" | "YZ"): void {
    if (!this.api) return;

    this.currentSketch = this.api.createSketch(plane);
    useEditorStore.getState().setSelectedSketch(this.currentSketch.id);
    useProjectStore.getState().addSketch(this.currentSketch);

    // Create a group for sketch visualization
    this.sketchGroup = new THREE.Group();
    this.sketchGroup.name = `sketch_${this.currentSketch.id}`;
    this.api.addHelper(this.sketchGroup);

    // Add sketch plane indicator
    const planeGeom = new THREE.PlaneGeometry(200, 200);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
    });
    const planeMesh = new THREE.Mesh(planeGeom, planeMat);

    if (plane === "XZ") {
      planeMesh.rotation.x = -Math.PI / 2;
    } else if (plane === "YZ") {
      planeMesh.rotation.y = Math.PI / 2;
    }
    this.sketchGroup.add(planeMesh);

    // Set camera to face the plane
    this.api.setCameraToPlane(plane);

    // Attach mouse listeners to canvas
    this.setupCanvasListeners();
  }

  private setupCanvasListeners(): void {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    this.canvasElement = canvas;

    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);

    canvas.addEventListener("mousedown", this.boundMouseDown);
    canvas.addEventListener("mousemove", this.boundMouseMove);
    canvas.addEventListener("mouseup", this.boundMouseUp);
  }

  private removeCanvasListeners(): void {
    if (this.canvasElement) {
      if (this.boundMouseDown)
        this.canvasElement.removeEventListener("mousedown", this.boundMouseDown);
      if (this.boundMouseMove)
        this.canvasElement.removeEventListener("mousemove", this.boundMouseMove);
      if (this.boundMouseUp)
        this.canvasElement.removeEventListener("mouseup", this.boundMouseUp);
    }
  }

  private getPlanePoint(event: MouseEvent): [number, number] | null {
    if (!this.api || !this.canvasElement || !this.currentSketch) return null;

    const rect = this.canvasElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const camera = this.api.getCamera();
    if (!camera) return null;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Intersect with the sketch plane
    const plane = this.currentSketch.plane;
    const planeNormal =
      plane === "XY"
        ? new THREE.Vector3(0, 0, 1)
        : plane === "XZ"
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(1, 0, 0);

    const threePlane = new THREE.Plane(planeNormal, -this.currentSketch.planeOffset);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(threePlane, intersection);

    if (!intersection) return null;

    // Convert 3D point to 2D sketch coordinates
    if (plane === "XY") return [intersection.x, intersection.y];
    if (plane === "XZ") return [intersection.x, intersection.z];
    return [intersection.y, intersection.z]; // YZ
  }

  private handleMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return; // left click only
    const tool = getSketchTool();
    if (tool === "select") return;

    const point = this.getPlanePoint(event);
    if (!point) return;

    const snapped = this.currentSketch
      ? snapPoint(point, this.currentSketch.primitives)
      : point;

    this.drawingState.isDrawing = true;
    this.drawingState.startPoint = snapped;
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.drawingState.isDrawing || !this.drawingState.startPoint) return;

    const point = this.getPlanePoint(event);
    if (!point || !this.sketchGroup) return;

    // Remove previous preview
    if (this.drawingState.previewLine) {
      this.sketchGroup.remove(this.drawingState.previewLine);
      this.drawingState.previewLine.geometry.dispose();
    }

    const tool = getSketchTool();
    const start = this.drawingState.startPoint;

    if (tool === "line") {
      const points = this.sketchToWorld(start, point);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0x00ff88 });
      this.drawingState.previewLine = new THREE.Line(geometry, material);
      this.sketchGroup.add(this.drawingState.previewLine);
    } else if (tool === "rectangle") {
      const corners = [
        start,
        [point[0], start[1]] as [number, number],
        point,
        [start[0], point[1]] as [number, number],
        start,
      ];
      const worldPoints = corners.map((c, i) =>
        i < corners.length - 1
          ? this.sketchPointToWorld(c)
          : this.sketchPointToWorld(corners[0])
      );
      const geometry = new THREE.BufferGeometry().setFromPoints(worldPoints);
      const material = new THREE.LineBasicMaterial({ color: 0x00ff88 });
      this.drawingState.previewLine = new THREE.Line(geometry, material);
      this.sketchGroup.add(this.drawingState.previewLine);
    } else if (tool === "circle") {
      const radius = Math.sqrt(
        (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2
      );
      const segments = 64;
      const circlePoints: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const cp: [number, number] = [
          start[0] + Math.cos(angle) * radius,
          start[1] + Math.sin(angle) * radius,
        ];
        circlePoints.push(this.sketchPointToWorld(cp));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(circlePoints);
      const material = new THREE.LineBasicMaterial({ color: 0x00ff88 });
      this.drawingState.previewLine = new THREE.Line(geometry, material);
      this.sketchGroup.add(this.drawingState.previewLine);
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (event.button !== 0 || !this.drawingState.isDrawing) return;

    const point = this.getPlanePoint(event);
    if (!point || !this.currentSketch || !this.api) return;

    const start = this.drawingState.startPoint!;
    const tool = getSketchTool();

    let primitive: SketchPrimitive | null = null;

    if (tool === "line") {
      let line: SketchPrimitive = { type: "line", start, end: point };
      line = snapToHorizontal(line as any) as any;
      line = snapToVertical(line as any) as any;
      primitive = line;
    } else if (tool === "rectangle") {
      primitive = {
        type: "rectangle",
        origin: [Math.min(start[0], point[0]), Math.min(start[1], point[1])],
        width: Math.abs(point[0] - start[0]),
        height: Math.abs(point[1] - start[1]),
      };
    } else if (tool === "circle") {
      const radius = Math.sqrt(
        (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2
      );
      primitive = { type: "circle", center: start, radius };
    }

    if (primitive) {
      this.api.addPrimitive(this.currentSketch.id, primitive);
      this.renderPrimitive(primitive);
    }

    // Clean up preview
    if (this.drawingState.previewLine && this.sketchGroup) {
      this.sketchGroup.remove(this.drawingState.previewLine);
      this.drawingState.previewLine.geometry.dispose();
      this.drawingState.previewLine = null;
    }

    this.drawingState.isDrawing = false;
    this.drawingState.startPoint = null;
  }

  private renderPrimitive(primitive: SketchPrimitive): void {
    if (!this.sketchGroup) return;

    const material = new THREE.LineBasicMaterial({ color: 0x00aaff, linewidth: 2 });

    if (primitive.type === "line") {
      const points = this.sketchToWorld(primitive.start, primitive.end);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      this.sketchGroup.add(new THREE.Line(geometry, material));
    } else if (primitive.type === "rectangle") {
      const { origin, width, height } = primitive;
      const corners: [number, number][] = [
        origin,
        [origin[0] + width, origin[1]],
        [origin[0] + width, origin[1] + height],
        [origin[0], origin[1] + height],
        origin,
      ];
      const worldPoints = corners.map((c) => this.sketchPointToWorld(c));
      const geometry = new THREE.BufferGeometry().setFromPoints(worldPoints);
      this.sketchGroup.add(new THREE.Line(geometry, material));
    } else if (primitive.type === "circle") {
      const segments = 64;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const cp: [number, number] = [
          primitive.center[0] + Math.cos(angle) * primitive.radius,
          primitive.center[1] + Math.sin(angle) * primitive.radius,
        ];
        points.push(this.sketchPointToWorld(cp));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      this.sketchGroup.add(new THREE.Line(geometry, material));
    }
  }

  private sketchPointToWorld(point: [number, number]): THREE.Vector3 {
    if (!this.currentSketch) return new THREE.Vector3();
    const offset = this.currentSketch.planeOffset;
    switch (this.currentSketch.plane) {
      case "XY":
        return new THREE.Vector3(point[0], point[1], offset);
      case "XZ":
        return new THREE.Vector3(point[0], offset, point[1]);
      case "YZ":
        return new THREE.Vector3(offset, point[0], point[1]);
    }
  }

  private sketchToWorld(
    start: [number, number],
    end: [number, number]
  ): THREE.Vector3[] {
    return [this.sketchPointToWorld(start), this.sketchPointToWorld(end)];
  }

  private finishSketch(sketchId: string): void {
    if (!this.api || !this.currentSketch) return;

    const sketch = this.api.getSketch(sketchId);
    if (!sketch) return;

    // Detect profiles
    const profiles = detectProfiles(sketch.primitives);
    this.api.setProfiles(sketchId, profiles);

    // Record operation
    useHistoryStore.getState().addOperation({
      id: uuidv4(),
      type: "sketch",
      label: `Sketch (${sketch.plane})`,
      icon: "S",
      params: { plane: sketch.plane, primitiveCount: sketch.primitives.length },
      timestamp: Date.now(),
    });

    this.removeCanvasListeners();
    useEditorStore.getState().setMode("idle");
  }

  private cancelSketch(): void {
    if (this.currentSketch && this.api) {
      // Remove sketch from store and API
      const sketchId = this.currentSketch.id;
      useProjectStore.getState().removeSketch(sketchId);
    }
    if (this.sketchGroup && this.api) {
      this.api.removeHelper(this.sketchGroup);
    }
    this.removeCanvasListeners();
    this.currentSketch = null;
    this.sketchGroup = null;
    useEditorStore.getState().setMode("idle");
    useEditorStore.getState().setSketchPlane(null);
  }

  // AI tools
  getAITools() {
    return {
      start: async (params: Record<string, unknown>) => {
        const plane = params.plane as "XY" | "XZ" | "YZ";
        this.startSketch(plane);
        return { success: true, sketchId: this.currentSketch?.id };
      },
      add_line: async (params: Record<string, unknown>) => {
        if (!this.currentSketch || !this.api) return { success: false };
        const primitive: SketchPrimitive = {
          type: "line",
          start: [params.x1 as number, params.y1 as number],
          end: [params.x2 as number, params.y2 as number],
        };
        this.api.addPrimitive(this.currentSketch.id, primitive);
        this.renderPrimitive(primitive);
        return { success: true };
      },
      add_rectangle: async (params: Record<string, unknown>) => {
        if (!this.currentSketch || !this.api) return { success: false };
        const primitive: SketchPrimitive = {
          type: "rectangle",
          origin: [params.x as number, params.y as number],
          width: params.width as number,
          height: params.height as number,
        };
        this.api.addPrimitive(this.currentSketch.id, primitive);
        this.renderPrimitive(primitive);
        return { success: true };
      },
      add_circle: async (params: Record<string, unknown>) => {
        if (!this.currentSketch || !this.api) return { success: false };
        const primitive: SketchPrimitive = {
          type: "circle",
          center: [params.cx as number, params.cy as number],
          radius: params.radius as number,
        };
        this.api.addPrimitive(this.currentSketch.id, primitive);
        this.renderPrimitive(primitive);
        return { success: true };
      },
      finish: async () => {
        if (!this.currentSketch) return { success: false };
        this.finishSketch(this.currentSketch.id);
        return { success: true };
      },
    };
  }
}
