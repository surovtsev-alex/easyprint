import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import type { CanvasAPI } from "@/core/api/CanvasAPI";
import type { EventBus } from "@/core/api/EventBus";
import { useEditorStore } from "@/core/store/editorStore";

export class STLExportPluginLogic {
  private api: CanvasAPI | null = null;
  private bus: EventBus | null = null;
  private unsubscribers: (() => void)[] = [];

  activate(api: CanvasAPI, bus: EventBus): void {
    this.api = api;
    this.bus = bus;

    this.unsubscribers.push(
      bus.on("stl:export", ({ bodyId }) => {
        this.exportBody(bodyId);
      })
    );

    // Auto-export selected body
    const selectedBodyId = useEditorStore.getState().selectedBodyId;
    if (selectedBodyId) {
      this.exportBody(selectedBodyId);
    }
  }

  deactivate(): void {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
  }

  exportBody(bodyId: string, filename?: string, binary = true): boolean {
    if (!this.api) return false;

    const body = this.api.getBody(bodyId);
    if (!body) return false;

    const exporter = new STLExporter();

    if (binary) {
      const result = exporter.parse(body.mesh, { binary: true });
      const blob = new Blob([result], { type: "application/octet-stream" });
      this.downloadBlob(blob, `${filename || body.name}.stl`);
    } else {
      const result = exporter.parse(body.mesh, { binary: false });
      const blob = new Blob([result], { type: "text/plain" });
      this.downloadBlob(blob, `${filename || body.name}.stl`);
    }

    return true;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  getAITools() {
    return {
      export: async (params: Record<string, unknown>) => {
        const success = this.exportBody(
          params.bodyId as string,
          params.filename as string | undefined,
          (params.binary as boolean) ?? true
        );
        return { success };
      },
    };
  }
}
