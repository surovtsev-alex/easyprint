import type { Plugin } from "@/core/api/types";
import type { CanvasAPI } from "@/core/api/CanvasAPI";
import type { EventBus } from "@/core/api/EventBus";
import { HolePluginLogic } from "./HolePlugin";
import { HoleDialog } from "./HoleDialog";
import { useEditorStore } from "@/core/store/editorStore";

function HoleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

const logic = new HolePluginLogic();

function HoleToolbarWrapper() {
  const mode = useEditorStore((s) => s.mode);
  if (mode !== "hole") return null;

  return (
    <HoleDialog
      onCreateHole={(bodyId, position, radius, depth, direction) => {
        logic.createHole(bodyId, position, radius, depth, direction);
        useEditorStore.getState().setMode("idle");
        useEditorStore.getState().setActivePlugin(null);
      }}
      onCancel={() => {
        useEditorStore.getState().setMode("idle");
        useEditorStore.getState().setActivePlugin(null);
      }}
    />
  );
}

export const holePlugin: Plugin = {
  id: "hole",
  name: "Hole",
  icon: HoleIcon,
  category: "modify",
  skillId: "hole",

  activate(api: CanvasAPI, bus: EventBus) {
    logic.activate(api, bus);
  },

  deactivate() {
    logic.deactivate();
  },

  toolbar: HoleToolbarWrapper,

  aiTools: logic.getAITools(),
};
