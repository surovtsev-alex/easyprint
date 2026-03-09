import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { CanvasAPI } from "@/core/api/CanvasAPI";
import type { EventBus } from "@/core/api/EventBus";
import { useProjectStore } from "@/core/store/projectStore";
import { useHistoryStore } from "@/core/store/historyStore";
import { v4 as uuidv4 } from "uuid";

export class STLImportPluginLogic {
  private api: CanvasAPI | null = null;
  private bus: EventBus | null = null;
  private unsubscribers: (() => void)[] = [];

  activate(api: CanvasAPI, bus: EventBus): void {
    this.api = api;
    this.bus = bus;

    this.unsubscribers.push(
      bus.on("stl:import", ({ file }) => {
        this.importFile(file);
      })
    );

    // Open file picker immediately
    this.openFilePicker();
  }

  deactivate(): void {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
  }

  private openFilePicker(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".stl";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.importFile(file);
      }
    };
    input.click();
  }

  importFile(file: File, name?: string): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer || !this.api) return;

      const loader = new STLLoader();
      const geometry = loader.parse(buffer);
      geometry.computeVertexNormals();

      // Center the geometry
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      geometry.boundingBox?.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);

      const material = new THREE.MeshStandardMaterial({
        color: 0x88aacc,
        metalness: 0.3,
        roughness: 0.6,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const bodyName =
        name || file.name.replace(/\.stl$/i, "") || "Imported Body";
      const body = this.api.addBody(bodyName, mesh);

      useProjectStore.getState().addBody(body);

      const operation = {
        id: uuidv4(),
        type: "import" as const,
        label: `Import ${bodyName}`,
        icon: "I",
        params: { filename: file.name },
        timestamp: Date.now(),
      };
      useProjectStore.getState().addOperation(body.id, operation);
      useHistoryStore.getState().addOperation(operation);
    };
    reader.readAsArrayBuffer(file);
  }

  getAITools() {
    return {
      import: async (params: Record<string, unknown>) => {
        this.openFilePicker();
        return {
          success: true,
          message: "File picker opened. User needs to select a file.",
        };
      },
    };
  }
}
