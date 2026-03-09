import type { Plugin } from "@/core/api/types";
import type { CanvasAPI } from "@/core/api/CanvasAPI";
import type { EventBus } from "@/core/api/EventBus";
import { STLExportPluginLogic } from "./STLExportPlugin";

function ExportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

const logic = new STLExportPluginLogic();

export const stlExportPlugin: Plugin = {
  id: "stl-export",
  name: "Export STL",
  icon: ExportIcon,
  category: "io",
  skillId: "stl-export",

  activate(api: CanvasAPI, bus: EventBus) {
    logic.activate(api, bus);
  },

  deactivate() {
    logic.deactivate();
  },

  aiTools: logic.getAITools(),
};
