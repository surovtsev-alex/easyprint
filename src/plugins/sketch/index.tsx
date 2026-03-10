import type { Plugin } from "@/core/api/types";
import type { CanvasAPI } from "@/core/api/CanvasAPI";
import type { EventBus } from "@/core/api/EventBus";
import { SketchPluginLogic } from "./SketchPlugin";
import { SketchToolbar } from "./SketchToolbar";
import { SketchPropertiesPanel, setLogicRef } from "./SketchPropertiesPanel";

function SketchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

const logic = new SketchPluginLogic();

// Wire up logic ref for properties panel
setLogicRef(logic);

function SketchToolbarWithPanel() {
  return (
    <>
      <SketchToolbar />
      <SketchPropertiesPanel />
    </>
  );
}

export { logic as sketchLogic };

export const sketchPlugin: Plugin = {
  id: "sketch",
  name: "Sketch",
  icon: SketchIcon,
  category: "sketch",
  skillId: "sketch",

  activate(api: CanvasAPI, bus: EventBus) {
    logic.activate(api, bus);
  },

  deactivate() {
    logic.deactivate();
  },

  toolbar: SketchToolbarWithPanel,

  aiTools: logic.getAITools(),
};
