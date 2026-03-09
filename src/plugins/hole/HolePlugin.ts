import * as THREE from "three";
import type { CanvasAPI } from "@/core/api/CanvasAPI";
import type { EventBus } from "@/core/api/EventBus";
import { useProjectStore } from "@/core/store/projectStore";
import { useHistoryStore } from "@/core/store/historyStore";
import { useEditorStore } from "@/core/store/editorStore";
import { v4 as uuidv4 } from "uuid";
import { SUBTRACTION, Evaluator, Brush } from "three-bvh-csg";

export class HolePluginLogic {
  private api: CanvasAPI | null = null;
  private bus: EventBus | null = null;
  private unsubscribers: (() => void)[] = [];
  private evaluator = new Evaluator();

  activate(api: CanvasAPI, bus: EventBus): void {
    this.api = api;
    this.bus = bus;
    useEditorStore.getState().setMode("hole");

    this.unsubscribers.push(
      bus.on("hole:request", ({ bodyId, position, radius, depth }) => {
        this.createHole(bodyId, position, radius, depth, "y");
      })
    );
  }

  deactivate(): void {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
    useEditorStore.getState().setMode("idle");
  }

  createHole(
    bodyId: string,
    position: [number, number, number],
    radius: number,
    depth: number,
    direction: "x" | "y" | "z" = "y"
  ): boolean {
    if (!this.api) return false;

    const body = this.api.getBody(bodyId);
    if (!body) return false;

    // Create cylinder brush for the hole
    const cylinderGeometry = new THREE.CylinderGeometry(
      radius,
      radius,
      depth,
      32
    );

    // Orient cylinder based on direction
    if (direction === "x") {
      cylinderGeometry.rotateZ(Math.PI / 2);
    } else if (direction === "z") {
      cylinderGeometry.rotateX(Math.PI / 2);
    }

    // Position the cylinder
    cylinderGeometry.translate(position[0], position[1], position[2]);

    const cylinderBrush = new Brush(cylinderGeometry);
    cylinderBrush.updateMatrixWorld();

    // Create brush from existing body mesh
    const bodyBrush = new Brush(body.mesh.geometry.clone());
    bodyBrush.position.copy(body.mesh.position);
    bodyBrush.rotation.copy(body.mesh.rotation);
    bodyBrush.scale.copy(body.mesh.scale);
    bodyBrush.updateMatrixWorld();

    // Perform CSG subtraction
    const result = this.evaluator.evaluate(bodyBrush, cylinderBrush, SUBTRACTION);

    // Create new mesh with the result
    const material =
      body.mesh.material instanceof THREE.Material
        ? body.mesh.material.clone()
        : new THREE.MeshStandardMaterial({ color: 0x6699cc });

    const newMesh = new THREE.Mesh(result.geometry, material);
    newMesh.castShadow = true;
    newMesh.receiveShadow = true;

    // Replace the body mesh
    this.api.updateBodyMesh(bodyId, newMesh);

    // Record operation
    const operation = {
      id: uuidv4(),
      type: "hole" as const,
      label: `Hole R${radius} D${depth}`,
      icon: "H",
      params: { bodyId, position, radius, depth, direction },
      timestamp: Date.now(),
    };
    useProjectStore.getState().addOperation(bodyId, operation);
    useHistoryStore.getState().addOperation(operation);

    this.bus?.emit("hole:complete", { bodyId });

    return true;
  }

  getAITools() {
    return {
      create: async (params: Record<string, unknown>) => {
        const success = this.createHole(
          params.bodyId as string,
          [params.x as number, params.y as number, params.z as number],
          params.radius as number,
          params.depth as number,
          (params.direction as "x" | "y" | "z") || "y"
        );
        return { success };
      },
    };
  }
}
