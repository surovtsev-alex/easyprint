import * as THREE from "three";
import type { CanvasAPI } from "@/core/api/CanvasAPI";
import type { EventBus } from "@/core/api/EventBus";
import type { SketchPrimitive } from "@/core/api/types";
import { useProjectStore } from "@/core/store/projectStore";
import { useHistoryStore } from "@/core/store/historyStore";
import { useEditorStore } from "@/core/store/editorStore";
import { v4 as uuidv4 } from "uuid";

export class ExtrudePluginLogic {
  private api: CanvasAPI | null = null;
  private bus: EventBus | null = null;
  private unsubscribers: (() => void)[] = [];

  activate(api: CanvasAPI, bus: EventBus): void {
    this.api = api;
    this.bus = bus;

    useEditorStore.getState().setMode("extrude");

    this.unsubscribers.push(
      bus.on("extrude:request", ({ sketchId, profileId }) => {
        this.extrude(sketchId, profileId, 10);
      })
    );
  }

  deactivate(): void {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
    useEditorStore.getState().setMode("idle");
  }

  extrude(
    sketchId: string,
    profileId: string,
    distance: number,
    name?: string
  ): string | null {
    if (!this.api) return null;

    const sketch = this.api.getSketch(sketchId);
    if (!sketch) return null;

    const profile = sketch.profiles.find((p) => p.id === profileId);
    if (!profile || !profile.closed) return null;

    // Build a THREE.Shape from the profile primitives
    const shape = this.buildShape(sketch.primitives, profile.edges);
    if (!shape) return null;

    // Create extruded geometry
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: Math.abs(distance),
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Transform geometry based on plane
    this.transformGeometryForPlane(geometry, sketch.plane, sketch.planeOffset, distance);

    const material = new THREE.MeshStandardMaterial({
      color: 0x6699cc,
      metalness: 0.3,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const bodyName = name || `Body ${useProjectStore.getState().bodies.length + 1}`;
    const body = this.api.addBody(bodyName, mesh);

    // Add to project store
    useProjectStore.getState().addBody(body);

    // Add operation
    const operation = {
      id: uuidv4(),
      type: "extrude" as const,
      label: `Extrude ${distance}mm`,
      icon: "E",
      params: { sketchId, profileId, distance },
      timestamp: Date.now(),
    };
    useProjectStore.getState().addOperation(body.id, operation);
    useHistoryStore.getState().addOperation(operation);

    this.bus?.emit("extrude:complete", { bodyId: body.id });

    return body.id;
  }

  private buildShape(
    primitives: SketchPrimitive[],
    edgeIndices: number[]
  ): THREE.Shape | null {
    const shape = new THREE.Shape();

    for (const idx of edgeIndices) {
      const prim = primitives[idx];
      if (!prim) continue;

      if (prim.type === "rectangle") {
        const { origin, width, height } = prim;
        shape.moveTo(origin[0], origin[1]);
        shape.lineTo(origin[0] + width, origin[1]);
        shape.lineTo(origin[0] + width, origin[1] + height);
        shape.lineTo(origin[0], origin[1] + height);
        shape.closePath();
        return shape;
      }

      if (prim.type === "circle") {
        const { center, radius } = prim;
        shape.absarc(center[0], center[1], radius, 0, Math.PI * 2, false);
        return shape;
      }

      if (prim.type === "ellipse") {
        const { center, radiusX, radiusY } = prim;
        shape.absellipse(center[0], center[1], radiusX, radiusY, 0, Math.PI * 2, false, 0);
        return shape;
      }

      if (prim.type === "polyline") {
        if (prim.points.length < 2) continue;
        shape.moveTo(prim.points[0][0], prim.points[0][1]);
        for (let i = 1; i < prim.points.length; i++) {
          shape.lineTo(prim.points[i][0], prim.points[i][1]);
        }
        if (prim.closed) shape.closePath();
        return shape;
      }

      if (prim.type === "arc") {
        const { center, radius, startAngle, endAngle } = prim;
        if (idx === edgeIndices[0]) {
          const sx = center[0] + Math.cos(startAngle) * radius;
          const sy = center[1] + Math.sin(startAngle) * radius;
          shape.moveTo(sx, sy);
        }
        shape.absarc(center[0], center[1], radius, startAngle, endAngle, false);
      }

      if (prim.type === "line") {
        if (idx === edgeIndices[0]) {
          shape.moveTo(prim.start[0], prim.start[1]);
        }
        shape.lineTo(prim.end[0], prim.end[1]);
      }
    }

    // Close for line/arc loops
    if (edgeIndices.length > 0) {
      shape.closePath();
    }

    return shape;
  }

  private transformGeometryForPlane(
    geometry: THREE.ExtrudeGeometry,
    plane: "XY" | "XZ" | "YZ",
    offset: number,
    distance: number
  ): void {
    // ExtrudeGeometry creates shape in XY plane, extrudes along +Z from z=0 to z=depth.
    // Sketch coords (sx, sy) are the shape's (x, y). We must rotate+translate
    // so geometry matches sketch's sketchPointToWorld mapping:
    //   XY: (sx, sy, offset), extrude along Z
    //   XZ: (sx, offset, sy), extrude along Y
    //   YZ: (offset, sx, sy), extrude along X
    const depth = Math.abs(distance);

    if (plane === "XY") {
      // No rotation needed. Shape (sx, sy) already at world (sx, sy).
      // Extrusion along +Z: z goes 0..depth.
      // For d>0: want Z from offset to offset+depth
      // For d<0: want Z from offset-depth to offset
      if (distance >= 0) {
        geometry.translate(0, 0, offset);
      } else {
        geometry.translate(0, 0, offset + distance);
      }
    } else if (plane === "XZ") {
      // Need (sx, sy, z) → (sx, z_mapped, sy)
      // rotateX(+π/2): (x, y, z) → (x, -z, y)
      // Shape base (sx, sy, 0) → (sx, 0, sy) ✓
      // Extrusion tip (sx, sy, depth) → (sx, -depth, sy)
      // So extrusion extends in -Y direction (Y from -depth to 0)
      geometry.rotateX(Math.PI / 2);
      // For d>0: want Y from offset to offset+depth → shift by offset+depth
      // For d<0: want Y from offset-depth to offset → shift by offset
      if (distance >= 0) {
        geometry.translate(0, offset + distance, 0);
      } else {
        geometry.translate(0, offset, 0);
      }
    } else {
      // YZ plane: need (sx, sy, z) → (z_mapped, sx, sy)
      // This is a cyclic permutation: x→y, y→z, z→x
      // No single axis rotation achieves this, so use a direct matrix.
      const m = new THREE.Matrix4();
      m.set(
        0, 0, 1, 0,  // x_out = z_in
        1, 0, 0, 0,  // y_out = x_in
        0, 1, 0, 0,  // z_out = y_in
        0, 0, 0, 1
      );
      geometry.applyMatrix4(m);
      // Shape base (sx, sy, 0) → (0, sx, sy) ✓
      // Extrusion tip (sx, sy, depth) → (depth, sx, sy)
      // So extrusion extends in +X direction (X from 0 to depth)
      // For d>0: want X from offset to offset+depth → shift by offset
      // For d<0: want X from offset-depth to offset → shift by offset+distance
      if (distance >= 0) {
        geometry.translate(offset, 0, 0);
      } else {
        geometry.translate(offset + distance, 0, 0);
      }
    }
  }

  getAITools() {
    return {
      create: async (params: Record<string, unknown>) => {
        const bodyId = this.extrude(
          params.sketchId as string,
          params.profileId as string,
          params.distance as number,
          params.name as string | undefined
        );
        return { success: !!bodyId, bodyId };
      },
    };
  }
}
