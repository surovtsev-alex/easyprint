import type { Plugin } from "@/core/api/types";
import type { CanvasAPI } from "@/core/api/CanvasAPI";
import type { EventBus } from "@/core/api/EventBus";
import { STLImportPluginLogic } from "./STLImportPlugin";

function ImportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17,8 12,3 7,8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

const logic = new STLImportPluginLogic();

export const stlImportPlugin: Plugin = {
  id: "stl-import",
  name: "Import STL",
  icon: ImportIcon,
  category: "io",
  skillId: "stl-import",

  activate(api: CanvasAPI, bus: EventBus) {
    logic.activate(api, bus);
  },

  deactivate() {
    logic.deactivate();
  },

  aiTools: logic.getAITools(),
};
