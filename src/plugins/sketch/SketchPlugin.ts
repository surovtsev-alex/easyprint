import * as THREE from "three";
import type { Plugin, Sketch, SketchPrimitive } from "@/core/api/types";
import type { CanvasAPI } from "@/core/api/CanvasAPI";
import type { EventBus } from "@/core/api/EventBus";
import { useEditorStore } from "@/core/store/editorStore";
import { useProjectStore } from "@/core/store/projectStore";
import { useHistoryStore } from "@/core/store/historyStore";
import { detectProfiles, snapPoint, snapToHorizontal, snapToVertical } from "./constraints";
import { getSketchTool, setSketchTool } from "./SketchToolbar";
import { v4 as uuidv4 } from "uuid";

// Shared selection state
let selectedPrimitiveIndex: number | null = null;
const selectionListeners: Set<() => void> = new Set();

export function getSelectedPrimitive(): number | null {
  return selectedPrimitiveIndex;
}

export function setSelectedPrimitive(idx: number | null): void {
  selectedPrimitiveIndex = idx;
  selectionListeners.forEach((fn) => fn());
}

export function onSelectionChange(fn: () => void): () => void {
  selectionListeners.add(fn);
  return () => { selectionListeners.delete(fn); };
}

const COLORS = {
  preview: 0x00ff88,
  primitive: 0x00aaff,
  selected: 0xffaa00,
  finished: 0x5588cc,
};

export class SketchPluginLogic {
  private api: CanvasAPI | null = null;
  private bus: EventBus | null = null;
  private currentSketch: Sketch | null = null;
  private sketchGroup: THREE.Group | null = null;
  private primitiveLines: THREE.Line[] = []; // index matches primitives[]
  private drawingState: {
    isDrawing: boolean;
    startPoint: [number, number] | null;
    previewLine: THREE.Line | null;
    arcPoints: [number, number][];
    polylinePoints: [number, number][];
    polylineLines: THREE.Line[];
  } = {
    isDrawing: false,
    startPoint: null,
    previewLine: null,
    arcPoints: [],
    polylinePoints: [],
    polylineLines: [],
  };
  private boundDblClick: ((e: MouseEvent) => void) | null = null;
  private dimensionDiv: HTMLDivElement | null = null;
  private unsubscribers: (() => void)[] = [];
  private boundMouseDown: ((e: MouseEvent) => void) | null = null;
  private boundMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundMouseUp: ((e: MouseEvent) => void) | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private sketchFinished = false;
  private dragState: {
    isDragging: boolean;
    primitiveIndex: number | null;
    startSketchPoint: [number, number] | null;
    originalPrimitive: SketchPrimitive | null;
  } = { isDragging: false, primitiveIndex: null, startSketchPoint: null, originalPrimitive: null };

  activate(api: CanvasAPI, bus: EventBus): void {
    this.api = api;
    this.bus = bus;

    // Show plane selector for new sketch
    useEditorStore.getState().setShowPlaneSelector(true);

    this.unsubscribers.push(
      bus.on("sketch:start", ({ plane }) => {
        this.startSketch(plane);
      })
    );

    this.unsubscribers.push(
      bus.on("sketch:complete", ({ sketchId }) => {
        this.finishSketch(sketchId);
      })
    );

    this.unsubscribers.push(
      bus.on("sketch:cancel", () => {
        this.cancelSketch();
      })
    );

    // Edit existing sketch
    this.unsubscribers.push(
      bus.on("sketch:edit" as any, ({ sketchId }: { sketchId: string }) => {
        this.editSketch(sketchId);
      })
    );
  }

  deactivate(): void {
    this.removeCanvasListeners();
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];

    // If sketch was finished, persist visuals; otherwise remove
    if (this.sketchFinished && this.sketchGroup && this.api && this.currentSketch) {
      // Remove plane indicator, dim colors for finished state
      this.removePlaneIndicator();
      this.dimSketchColors();
      this.api.storeSketchVisual(this.currentSketch.id, this.sketchGroup);
    } else if (this.sketchGroup && this.api) {
      this.api.removeHelper(this.sketchGroup);
    }

    setSelectedPrimitive(null);
    this.primitiveLines = [];
    this.currentSketch = null;
    this.sketchGroup = null;
    this.sketchFinished = false;
    useEditorStore.getState().setMode("idle");
    useEditorStore.getState().setSketchPlane(null);
    useEditorStore.getState().setSelectedSketch(null);
  }

  private startSketch(plane: "XY" | "XZ" | "YZ"): void {
    if (!this.api) return;

    this.currentSketch = this.api.createSketch(plane);
    this.sketchFinished = false;
    useEditorStore.getState().setSelectedSketch(this.currentSketch.id);
    useProjectStore.getState().addSketch(this.currentSketch);

    this.createSketchGroup(plane);
    this.api.setCameraToPlane(plane);
    this.setupCanvasListeners();
  }

  editSketch(sketchId: string): void {
    if (!this.api) return;

    const sketch = this.api.getSketch(sketchId);
    if (!sketch) return;

    // Remove persisted visuals
    this.api.removeSketchVisual(sketchId);

    this.currentSketch = sketch;
    this.sketchFinished = false;
    useEditorStore.getState().setSelectedSketch(sketchId);
    useEditorStore.getState().setMode("sketch");
    useEditorStore.getState().setSketchPlane(sketch.plane);

    this.createSketchGroup(sketch.plane);

    // Re-render existing primitives
    this.primitiveLines = [];
    for (const prim of sketch.primitives) {
      this.renderPrimitive(prim);
    }

    this.api.setCameraToPlane(sketch.plane);
    this.setupCanvasListeners();
  }

  private createSketchGroup(plane: "XY" | "XZ" | "YZ"): void {
    if (!this.api) return;

    this.sketchGroup = new THREE.Group();
    this.sketchGroup.name = `sketch_${this.currentSketch?.id}`;
    this.api.addHelper(this.sketchGroup);

    const planeGeom = new THREE.PlaneGeometry(200, 200);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
    });
    const planeMesh = new THREE.Mesh(planeGeom, planeMat);
    planeMesh.name = "__plane_indicator__";

    if (plane === "XZ") planeMesh.rotation.x = -Math.PI / 2;
    else if (plane === "YZ") planeMesh.rotation.y = Math.PI / 2;
    this.sketchGroup.add(planeMesh);
  }

  private removePlaneIndicator(): void {
    if (!this.sketchGroup) return;
    const indicator = this.sketchGroup.getObjectByName("__plane_indicator__");
    if (indicator) {
      this.sketchGroup.remove(indicator);
      if (indicator instanceof THREE.Mesh) {
        indicator.geometry.dispose();
        (indicator.material as THREE.Material).dispose();
      }
    }
  }

  private dimSketchColors(): void {
    this.primitiveLines.forEach((line) => {
      if (line.material instanceof THREE.LineBasicMaterial) {
        line.material.color.setHex(COLORS.finished);
      }
    });
  }

  private setupCanvasListeners(): void {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    this.canvasElement = canvas;

    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundDblClick = this.handleDblClick.bind(this);

    canvas.addEventListener("mousedown", this.boundMouseDown);
    canvas.addEventListener("mousemove", this.boundMouseMove);
    canvas.addEventListener("mouseup", this.boundMouseUp);
    canvas.addEventListener("dblclick", this.boundDblClick);

    this.dimensionDiv = document.createElement("div");
    Object.assign(this.dimensionDiv.style, {
      position: "fixed", pointerEvents: "none", zIndex: "100",
      background: "rgba(0,0,0,0.75)", color: "#0f0", fontSize: "11px",
      padding: "2px 6px", borderRadius: "3px", fontFamily: "monospace",
      display: "none",
    });
    document.body.appendChild(this.dimensionDiv);
  }

  private removeCanvasListeners(): void {
    if (this.canvasElement) {
      if (this.boundMouseDown)
        this.canvasElement.removeEventListener("mousedown", this.boundMouseDown);
      if (this.boundMouseMove)
        this.canvasElement.removeEventListener("mousemove", this.boundMouseMove);
      if (this.boundMouseUp)
        this.canvasElement.removeEventListener("mouseup", this.boundMouseUp);
      if (this.boundDblClick)
        this.canvasElement.removeEventListener("dblclick", this.boundDblClick);
      this.canvasElement.style.cursor = "default";
    }
    if (this.dimensionDiv) {
      this.dimensionDiv.remove();
      this.dimensionDiv = null;
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

    if (plane === "XY") return [intersection.x, intersection.y];
    if (plane === "XZ") return [intersection.x, intersection.z];
    return [intersection.y, intersection.z];
  }

  // ── Selection & Drag ──

  private handleSelectDown(event: MouseEvent): void {
    const point = this.getPlanePoint(event);
    if (!point || !this.currentSketch) return;

    const bestIdx = this.findNearestPrimitive(point, 5);

    // Update highlight
    const prevIdx = getSelectedPrimitive();
    if (prevIdx !== null && prevIdx < this.primitiveLines.length) {
      const prevLine = this.primitiveLines[prevIdx];
      if (prevLine?.material instanceof THREE.LineBasicMaterial) {
        prevLine.material.color.setHex(COLORS.primitive);
      }
    }

    setSelectedPrimitive(bestIdx);

    if (bestIdx !== null && bestIdx < this.primitiveLines.length) {
      const line = this.primitiveLines[bestIdx];
      if (line?.material instanceof THREE.LineBasicMaterial) {
        line.material.color.setHex(COLORS.selected);
      }
    }

    // Start drag if we clicked on a primitive
    if (bestIdx !== null) {
      this.dragState = {
        isDragging: true,
        primitiveIndex: bestIdx,
        startSketchPoint: point,
        originalPrimitive: JSON.parse(JSON.stringify(this.currentSketch.primitives[bestIdx])),
      };
    }
  }

  private handleSelectMove(event: MouseEvent): void {
    if (this.dragState.isDragging && this.dragState.primitiveIndex !== null) {
      const point = this.getPlanePoint(event);
      if (!point || !this.currentSketch || !this.dragState.startSketchPoint || !this.dragState.originalPrimitive) return;

      const dx = point[0] - this.dragState.startSketchPoint[0];
      const dy = point[1] - this.dragState.startSketchPoint[1];

      const moved = this.movePrimitive(this.dragState.originalPrimitive, dx, dy);
      if (moved) {
        this.updatePrimitive(this.dragState.primitiveIndex, moved);
        this.showDimension(event, `Δ ${dx.toFixed(1)}, ${dy.toFixed(1)}`);
      }
      return;
    }

    // Hover cursor feedback
    const point = this.getPlanePoint(event);
    if (point && this.canvasElement) {
      const nearIdx = this.findNearestPrimitive(point, 5);
      this.canvasElement.style.cursor = nearIdx !== null ? "move" : "default";
    }
  }

  private handleSelectUp(): void {
    if (this.dragState.isDragging) {
      this.hideDimension();
    }
    this.dragState = { isDragging: false, primitiveIndex: null, startSketchPoint: null, originalPrimitive: null };
  }

  private movePrimitive(prim: SketchPrimitive, dx: number, dy: number): SketchPrimitive | null {
    switch (prim.type) {
      case "line":
        return {
          ...prim,
          start: [prim.start[0] + dx, prim.start[1] + dy],
          end: [prim.end[0] + dx, prim.end[1] + dy],
        };
      case "rectangle":
        return {
          ...prim,
          origin: [prim.origin[0] + dx, prim.origin[1] + dy],
        };
      case "circle":
        return {
          ...prim,
          center: [prim.center[0] + dx, prim.center[1] + dy],
        };
      case "ellipse":
        return {
          ...prim,
          center: [prim.center[0] + dx, prim.center[1] + dy],
        };
      case "arc":
        return {
          ...prim,
          center: [prim.center[0] + dx, prim.center[1] + dy],
        };
      case "polyline":
        return {
          ...prim,
          points: prim.points.map(([x, y]) => [x + dx, y + dy] as [number, number]),
        };
      default:
        return null;
    }
  }

  private findNearestPrimitive(point: [number, number], threshold: number): number | null {
    if (!this.currentSketch) return null;
    let best: number | null = null;
    let bestDist = threshold;

    this.currentSketch.primitives.forEach((prim, idx) => {
      const d = this.distToPrimitive(point, prim);
      if (d < bestDist) {
        bestDist = d;
        best = idx;
      }
    });
    return best;
  }

  private distToPrimitive(point: [number, number], prim: SketchPrimitive): number {
    const dist2D = (a: [number, number], b: [number, number]) =>
      Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);

    if (prim.type === "line") {
      return this.distToSegment(point, prim.start, prim.end);
    } else if (prim.type === "rectangle") {
      const { origin, width, height } = prim;
      const corners: [number, number][] = [
        origin,
        [origin[0] + width, origin[1]],
        [origin[0] + width, origin[1] + height],
        [origin[0], origin[1] + height],
      ];
      let min = Infinity;
      for (let i = 0; i < 4; i++) {
        min = Math.min(min, this.distToSegment(point, corners[i], corners[(i + 1) % 4]));
      }
      return min;
    } else if (prim.type === "circle") {
      return Math.abs(dist2D(point, prim.center) - prim.radius);
    } else if (prim.type === "ellipse") {
      // Approximate
      const angle = Math.atan2(point[1] - prim.center[1], point[0] - prim.center[0]);
      const ep: [number, number] = [
        prim.center[0] + Math.cos(angle) * prim.radiusX,
        prim.center[1] + Math.sin(angle) * prim.radiusY,
      ];
      return dist2D(point, ep);
    } else if (prim.type === "arc") {
      const d = dist2D(point, prim.center);
      return Math.abs(d - prim.radius);
    } else if (prim.type === "polyline") {
      let min = Infinity;
      for (let i = 0; i < prim.points.length - 1; i++) {
        min = Math.min(min, this.distToSegment(point, prim.points[i], prim.points[i + 1]));
      }
      if (prim.closed && prim.points.length > 1) {
        min = Math.min(min, this.distToSegment(point, prim.points[prim.points.length - 1], prim.points[0]));
      }
      return min;
    }
    return Infinity;
  }

  private distToSegment(p: [number, number], a: [number, number], b: [number, number]): number {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2);
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const proj: [number, number] = [a[0] + t * dx, a[1] + t * dy];
    return Math.sqrt((p[0] - proj[0]) ** 2 + (p[1] - proj[1]) ** 2);
  }

  // ── Update primitive (from properties panel) ──

  updatePrimitive(index: number, newPrim: SketchPrimitive): void {
    if (!this.currentSketch || !this.api) return;

    this.currentSketch.primitives[index] = newPrim;
    this.api.updatePrimitive(this.currentSketch.id, index, newPrim);
    useProjectStore.getState().updateSketchPrimitive(this.currentSketch.id, index, newPrim);

    // Re-render this specific primitive
    if (index < this.primitiveLines.length && this.sketchGroup) {
      const oldLine = this.primitiveLines[index];
      this.sketchGroup.remove(oldLine);
      oldLine.geometry.dispose();
    }

    const isSelected = getSelectedPrimitive() === index;
    const line = this.buildPrimitiveLine(newPrim, isSelected ? COLORS.selected : COLORS.primitive);
    if (line && this.sketchGroup) {
      this.sketchGroup.add(line);
      this.primitiveLines[index] = line;
    }
  }

  deletePrimitive(index: number): void {
    if (!this.currentSketch || !this.api) return;

    // Remove visual
    if (index < this.primitiveLines.length && this.sketchGroup) {
      const oldLine = this.primitiveLines[index];
      this.sketchGroup.remove(oldLine);
      oldLine.geometry.dispose();
      this.primitiveLines.splice(index, 1);
    }

    this.currentSketch.primitives.splice(index, 1);
    this.api.removePrimitive(this.currentSketch.id, index);
    useProjectStore.getState().removeSketchPrimitive(this.currentSketch.id, index);
    setSelectedPrimitive(null);
  }

  getCurrentSketch(): Sketch | null {
    return this.currentSketch;
  }

  // ── Mouse Handlers ──

  private handleMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    const tool = getSketchTool();

    if (tool === "select") {
      this.handleSelectDown(event);
      return;
    }

    // Deselect when drawing
    if (getSelectedPrimitive() !== null) {
      const prevIdx = getSelectedPrimitive()!;
      if (prevIdx < this.primitiveLines.length) {
        const prevLine = this.primitiveLines[prevIdx];
        if (prevLine?.material instanceof THREE.LineBasicMaterial) {
          prevLine.material.color.setHex(COLORS.primitive);
        }
      }
      setSelectedPrimitive(null);
    }

    const point = this.getPlanePoint(event);
    if (!point) return;

    const snapped = this.currentSketch
      ? snapPoint(point, this.currentSketch.primitives)
      : point;

    if (tool === "arc") {
      this.drawingState.arcPoints.push(snapped);
      if (this.drawingState.arcPoints.length === 3) {
        this.finalizeArc();
      }
      return;
    }

    if (tool === "polyline") {
      this.drawingState.polylinePoints.push(snapped);
      if (this.drawingState.polylinePoints.length > 1) {
        const pts = this.drawingState.polylinePoints;
        const prev = pts[pts.length - 2];
        const cur = pts[pts.length - 1];
        const worldPts = this.sketchToWorld(prev, cur);
        const geom = new THREE.BufferGeometry().setFromPoints(worldPts);
        const mat = new THREE.LineBasicMaterial({ color: COLORS.primitive, linewidth: 2 });
        const seg = new THREE.Line(geom, mat);
        if (this.sketchGroup) this.sketchGroup.add(seg);
        this.drawingState.polylineLines.push(seg);
      }
      this.drawingState.isDrawing = true;
      this.drawingState.startPoint = snapped;
      return;
    }

    this.drawingState.isDrawing = true;
    this.drawingState.startPoint = snapped;
  }

  private handleMouseMove(event: MouseEvent): void {
    const tool = getSketchTool();
    if (tool === "select") {
      this.handleSelectMove(event);
      return;
    }

    const point = this.getPlanePoint(event);
    if (!point || !this.sketchGroup) return;

    // Arc preview
    if (tool === "arc" && this.drawingState.arcPoints.length > 0) {
      if (this.drawingState.previewLine) {
        this.sketchGroup.remove(this.drawingState.previewLine);
        this.drawingState.previewLine.geometry.dispose();
      }
      const pts = [...this.drawingState.arcPoints, point];
      const worldPts = pts.map((p) => this.sketchPointToWorld(p));
      const geom = new THREE.BufferGeometry().setFromPoints(worldPts);
      const mat = new THREE.LineBasicMaterial({ color: COLORS.preview });
      this.drawingState.previewLine = new THREE.Line(geom, mat);
      this.sketchGroup.add(this.drawingState.previewLine);
      this.showDimension(event, `${this.drawingState.arcPoints.length}/3 pts`);
      return;
    }

    // Polyline preview
    if (tool === "polyline" && this.drawingState.polylinePoints.length > 0) {
      if (this.drawingState.previewLine) {
        this.sketchGroup.remove(this.drawingState.previewLine);
        this.drawingState.previewLine.geometry.dispose();
      }
      const last = this.drawingState.polylinePoints[this.drawingState.polylinePoints.length - 1];
      const worldPts = this.sketchToWorld(last, point);
      const geom = new THREE.BufferGeometry().setFromPoints(worldPts);
      const mat = new THREE.LineBasicMaterial({ color: COLORS.preview });
      this.drawingState.previewLine = new THREE.Line(geom, mat);
      this.sketchGroup.add(this.drawingState.previewLine);
      const len = Math.sqrt((point[0] - last[0]) ** 2 + (point[1] - last[1]) ** 2);
      this.showDimension(event, `${len.toFixed(1)} mm`);
      return;
    }

    if (!this.drawingState.isDrawing || !this.drawingState.startPoint) {
      this.hideDimension();
      return;
    }

    if (this.drawingState.previewLine) {
      this.sketchGroup.remove(this.drawingState.previewLine);
      this.drawingState.previewLine.geometry.dispose();
    }

    const start = this.drawingState.startPoint;

    if (tool === "line") {
      const len = Math.sqrt((point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2);
      this.showDimension(event, `${len.toFixed(1)} mm`);
      const points = this.sketchToWorld(start, point);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: COLORS.preview });
      this.drawingState.previewLine = new THREE.Line(geometry, material);
      this.sketchGroup.add(this.drawingState.previewLine);
    } else if (tool === "rectangle") {
      const w = Math.abs(point[0] - start[0]);
      const h = Math.abs(point[1] - start[1]);
      this.showDimension(event, `${w.toFixed(1)} × ${h.toFixed(1)} mm`);
      const corners = [
        start, [point[0], start[1]] as [number, number],
        point, [start[0], point[1]] as [number, number], start,
      ];
      const worldPoints = corners.map((c, i) =>
        i < corners.length - 1 ? this.sketchPointToWorld(c) : this.sketchPointToWorld(corners[0])
      );
      const geometry = new THREE.BufferGeometry().setFromPoints(worldPoints);
      const material = new THREE.LineBasicMaterial({ color: COLORS.preview });
      this.drawingState.previewLine = new THREE.Line(geometry, material);
      this.sketchGroup.add(this.drawingState.previewLine);
    } else if (tool === "circle") {
      const radius = Math.sqrt((point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2);
      this.showDimension(event, `R ${radius.toFixed(1)} mm`);
      this.drawingState.previewLine = this.buildCircleLine(start, radius, COLORS.preview);
      if (this.drawingState.previewLine) this.sketchGroup.add(this.drawingState.previewLine);
    } else if (tool === "ellipse") {
      const rx = Math.abs(point[0] - start[0]);
      const ry = Math.abs(point[1] - start[1]);
      this.showDimension(event, `${(rx * 2).toFixed(1)} × ${(ry * 2).toFixed(1)} mm`);
      this.drawingState.previewLine = this.buildEllipseLine(start, rx, ry, COLORS.preview);
      if (this.drawingState.previewLine) this.sketchGroup.add(this.drawingState.previewLine);
    }
  }

  private handleMouseUp(event: MouseEvent): void {
    if (event.button !== 0) return;
    const tool = getSketchTool();

    if (tool === "select") {
      this.handleSelectUp();
      return;
    }
    if (tool === "arc" || tool === "polyline") return;
    if (!this.drawingState.isDrawing) return;

    const point = this.getPlanePoint(event);
    if (!point || !this.currentSketch || !this.api) return;

    const start = this.drawingState.startPoint!;
    let primitive: SketchPrimitive | null = null;

    if (tool === "line") {
      let line: SketchPrimitive = { type: "line", start, end: point };
      line = snapToHorizontal(line as any) as any;
      line = snapToVertical(line as any) as any;
      primitive = line;
    } else if (tool === "rectangle") {
      const w = Math.abs(point[0] - start[0]);
      const h = Math.abs(point[1] - start[1]);
      if (w > 0.1 && h > 0.1) {
        primitive = {
          type: "rectangle",
          origin: [Math.min(start[0], point[0]), Math.min(start[1], point[1])],
          width: w, height: h,
        };
      }
    } else if (tool === "circle") {
      const radius = Math.sqrt((point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2);
      if (radius > 0.1) primitive = { type: "circle", center: start, radius };
    } else if (tool === "ellipse") {
      const rx = Math.abs(point[0] - start[0]);
      const ry = Math.abs(point[1] - start[1]);
      if (rx > 0.1 && ry > 0.1) {
        primitive = { type: "ellipse", center: start, radiusX: rx, radiusY: ry };
      }
    }

    if (primitive) {
      this.api.addPrimitive(this.currentSketch.id, primitive);
      this.renderPrimitive(primitive);
    }

    if (this.drawingState.previewLine && this.sketchGroup) {
      this.sketchGroup.remove(this.drawingState.previewLine);
      this.drawingState.previewLine.geometry.dispose();
      this.drawingState.previewLine = null;
    }

    this.hideDimension();
    this.drawingState.isDrawing = false;
    this.drawingState.startPoint = null;
  }

  private handleDblClick(_event: MouseEvent): void {
    const tool = getSketchTool();
    if (tool === "polyline") {
      this.finalizePolyline(false);
    }
  }

  // ── Primitive builders ──

  private buildCircleLine(center: [number, number], radius: number, color: number): THREE.Line {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      pts.push(this.sketchPointToWorld([
        center[0] + Math.cos(angle) * radius,
        center[1] + Math.sin(angle) * radius,
      ]));
    }
    return new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color })
    );
  }

  private buildEllipseLine(center: [number, number], rx: number, ry: number, color: number): THREE.Line {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      pts.push(this.sketchPointToWorld([
        center[0] + Math.cos(angle) * rx,
        center[1] + Math.sin(angle) * ry,
      ]));
    }
    return new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color })
    );
  }

  private buildPrimitiveLine(prim: SketchPrimitive, color: number): THREE.Line | null {
    const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    if (prim.type === "line") {
      const pts = this.sketchToWorld(prim.start, prim.end);
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
    } else if (prim.type === "rectangle") {
      const { origin, width, height } = prim;
      const corners: [number, number][] = [
        origin, [origin[0] + width, origin[1]],
        [origin[0] + width, origin[1] + height],
        [origin[0], origin[1] + height], origin,
      ];
      return new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(corners.map((c) => this.sketchPointToWorld(c))),
        mat
      );
    } else if (prim.type === "circle") {
      return this.buildCircleLine(prim.center, prim.radius, color);
    } else if (prim.type === "ellipse") {
      return this.buildEllipseLine(prim.center, prim.radiusX, prim.radiusY, color);
    } else if (prim.type === "arc") {
      const pts: THREE.Vector3[] = [];
      let { startAngle, endAngle } = prim;
      if (endAngle < startAngle) endAngle += Math.PI * 2;
      for (let i = 0; i <= 64; i++) {
        const angle = startAngle + (i / 64) * (endAngle - startAngle);
        pts.push(this.sketchPointToWorld([
          prim.center[0] + Math.cos(angle) * prim.radius,
          prim.center[1] + Math.sin(angle) * prim.radius,
        ]));
      }
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
    } else if (prim.type === "polyline") {
      const pts = prim.points.map((p) => this.sketchPointToWorld(p));
      if (prim.closed && pts.length > 0) pts.push(this.sketchPointToWorld(prim.points[0]));
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
    }
    return null;
  }

  // ── Arc/Polyline finalization ──

  private finalizeArc(): void {
    if (!this.currentSketch || !this.api) return;
    const pts = this.drawingState.arcPoints;
    if (pts.length !== 3) return;

    const arc = this.computeArcFrom3Points(pts[0], pts[1], pts[2]);
    if (arc) {
      const primitive: SketchPrimitive = {
        type: "arc", center: arc.center, radius: arc.radius,
        startAngle: arc.startAngle, endAngle: arc.endAngle,
      };
      this.api.addPrimitive(this.currentSketch.id, primitive);
      this.renderPrimitive(primitive);
    }

    if (this.drawingState.previewLine && this.sketchGroup) {
      this.sketchGroup.remove(this.drawingState.previewLine);
      this.drawingState.previewLine.geometry.dispose();
      this.drawingState.previewLine = null;
    }
    this.drawingState.arcPoints = [];
    this.hideDimension();
  }

  private computeArcFrom3Points(
    p1: [number, number], p2: [number, number], p3: [number, number]
  ): { center: [number, number]; radius: number; startAngle: number; endAngle: number } | null {
    const ax = p1[0], ay = p1[1], bx = p2[0], by = p2[1], cx = p3[0], cy = p3[1];
    const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(D) < 1e-10) return null;

    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / D;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / D;
    const center: [number, number] = [ux, uy];
    const radius = Math.sqrt((ax - ux) ** 2 + (ay - uy) ** 2);

    const norm = (a: number) => (a < 0 ? a + Math.PI * 2 : a);
    const a1 = norm(Math.atan2(ay - uy, ax - ux));
    const aMid = norm(Math.atan2(by - uy, bx - ux));
    const a3 = norm(Math.atan2(cy - uy, cx - ux));

    const inArcCCW = a1 < a3 ? (aMid >= a1 && aMid <= a3) : (aMid >= a1 || aMid <= a3);
    return inArcCCW
      ? { center, radius, startAngle: a1, endAngle: a3 }
      : { center, radius, startAngle: a3, endAngle: a1 };
  }

  private finalizePolyline(closed: boolean): void {
    if (!this.currentSketch || !this.api) return;
    const pts = this.drawingState.polylinePoints;
    if (pts.length < 2) { this.clearPolylineState(); return; }

    const primitive: SketchPrimitive = { type: "polyline", points: [...pts], closed };
    this.api.addPrimitive(this.currentSketch.id, primitive);

    for (const seg of this.drawingState.polylineLines) {
      if (this.sketchGroup) this.sketchGroup.remove(seg);
      seg.geometry.dispose();
    }
    this.renderPrimitive(primitive);
    this.clearPolylineState();
  }

  private clearPolylineState(): void {
    if (this.drawingState.previewLine && this.sketchGroup) {
      this.sketchGroup.remove(this.drawingState.previewLine);
      this.drawingState.previewLine.geometry.dispose();
      this.drawingState.previewLine = null;
    }
    this.drawingState.polylinePoints = [];
    this.drawingState.polylineLines = [];
    this.drawingState.isDrawing = false;
    this.drawingState.startPoint = null;
    this.hideDimension();
  }

  // ── Render primitive ──

  private renderPrimitive(primitive: SketchPrimitive): void {
    const line = this.buildPrimitiveLine(primitive, COLORS.primitive);
    if (line && this.sketchGroup) {
      this.sketchGroup.add(line);
      this.primitiveLines.push(line);
    }
  }

  // ── Coordinate helpers ──

  private showDimension(event: MouseEvent, text: string): void {
    if (!this.dimensionDiv) return;
    this.dimensionDiv.textContent = text;
    this.dimensionDiv.style.display = "block";
    this.dimensionDiv.style.left = `${event.clientX + 14}px`;
    this.dimensionDiv.style.top = `${event.clientY - 20}px`;
  }

  private hideDimension(): void {
    if (this.dimensionDiv) this.dimensionDiv.style.display = "none";
  }

  private sketchPointToWorld(point: [number, number]): THREE.Vector3 {
    if (!this.currentSketch) return new THREE.Vector3();
    const offset = this.currentSketch.planeOffset;
    switch (this.currentSketch.plane) {
      case "XY": return new THREE.Vector3(point[0], point[1], offset);
      case "XZ": return new THREE.Vector3(point[0], offset, point[1]);
      case "YZ": return new THREE.Vector3(offset, point[0], point[1]);
    }
  }

  private sketchToWorld(start: [number, number], end: [number, number]): THREE.Vector3[] {
    return [this.sketchPointToWorld(start), this.sketchPointToWorld(end)];
  }

  // ── Finish / Cancel ──

  private finishSketch(sketchId: string): void {
    if (!this.api || !this.currentSketch) return;

    const sketch = this.api.getSketch(sketchId);
    if (!sketch) return;

    const profiles = detectProfiles(sketch.primitives);
    this.api.setProfiles(sketchId, profiles);

    useHistoryStore.getState().addOperation({
      id: uuidv4(),
      type: "sketch",
      label: `Sketch (${sketch.plane})`,
      icon: "S",
      params: { plane: sketch.plane, primitiveCount: sketch.primitives.length },
      timestamp: Date.now(),
    });

    this.sketchFinished = true;
    this.removeCanvasListeners();
    setSelectedPrimitive(null);
    useEditorStore.getState().setMode("idle");
  }

  private cancelSketch(): void {
    if (this.currentSketch && this.api) {
      const sketchId = this.currentSketch.id;
      useProjectStore.getState().removeSketch(sketchId);
    }
    if (this.sketchGroup && this.api) {
      this.api.removeHelper(this.sketchGroup);
    }
    this.removeCanvasListeners();
    this.currentSketch = null;
    this.sketchGroup = null;
    this.primitiveLines = [];
    useEditorStore.getState().setMode("idle");
    useEditorStore.getState().setSketchPlane(null);
  }

  // ── AI tools ──
  getAITools() {
    return {
      start: async (params: Record<string, unknown>) => {
        const plane = params.plane as "XY" | "XZ" | "YZ";
        this.startSketch(plane);
        return { success: true, sketchId: this.currentSketch?.id };
      },
      add_line: async (params: Record<string, unknown>) => {
        if (!this.currentSketch || !this.api) return { success: false };
        const prim: SketchPrimitive = {
          type: "line", start: [params.x1 as number, params.y1 as number],
          end: [params.x2 as number, params.y2 as number],
        };
        this.api.addPrimitive(this.currentSketch.id, prim);
        this.renderPrimitive(prim);
        return { success: true };
      },
      add_rectangle: async (params: Record<string, unknown>) => {
        if (!this.currentSketch || !this.api) return { success: false };
        const prim: SketchPrimitive = {
          type: "rectangle", origin: [params.x as number, params.y as number],
          width: params.width as number, height: params.height as number,
        };
        this.api.addPrimitive(this.currentSketch.id, prim);
        this.renderPrimitive(prim);
        return { success: true };
      },
      add_circle: async (params: Record<string, unknown>) => {
        if (!this.currentSketch || !this.api) return { success: false };
        const prim: SketchPrimitive = {
          type: "circle", center: [params.cx as number, params.cy as number],
          radius: params.radius as number,
        };
        this.api.addPrimitive(this.currentSketch.id, prim);
        this.renderPrimitive(prim);
        return { success: true };
      },
      add_arc: async (params: Record<string, unknown>) => {
        if (!this.currentSketch || !this.api) return { success: false };
        const prim: SketchPrimitive = {
          type: "arc", center: [params.cx as number, params.cy as number],
          radius: params.radius as number,
          startAngle: params.startAngle as number, endAngle: params.endAngle as number,
        };
        this.api.addPrimitive(this.currentSketch.id, prim);
        this.renderPrimitive(prim);
        return { success: true };
      },
      add_ellipse: async (params: Record<string, unknown>) => {
        if (!this.currentSketch || !this.api) return { success: false };
        const prim: SketchPrimitive = {
          type: "ellipse", center: [params.cx as number, params.cy as number],
          radiusX: params.radiusX as number, radiusY: params.radiusY as number,
        };
        this.api.addPrimitive(this.currentSketch.id, prim);
        this.renderPrimitive(prim);
        return { success: true };
      },
      add_polyline: async (params: Record<string, unknown>) => {
        if (!this.currentSketch || !this.api) return { success: false };
        const prim: SketchPrimitive = {
          type: "polyline", points: params.points as [number, number][],
          closed: (params.closed as boolean) ?? false,
        };
        this.api.addPrimitive(this.currentSketch.id, prim);
        this.renderPrimitive(prim);
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
