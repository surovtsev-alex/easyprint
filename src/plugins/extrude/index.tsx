import type { Plugin } from "@/core/api/types";
import type { CanvasAPI } from "@/core/api/CanvasAPI";
import type { EventBus } from "@/core/api/EventBus";
import { ExtrudePluginLogic } from "./ExtrudePlugin";
import { ExtrudeDialog } from "./ExtrudeDialog";
import { useEditorStore } from "@/core/store/editorStore";

function ExtrudeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20h16" />
      <path d="M4 20V10l4-4h8l4 4v10" />
      <path d="M8 6v-2h8v2" />
    </svg>
  );
}

const logic = new ExtrudePluginLogic();

function ExtrudeToolbarWrapper() {
  const mode = useEditorStore((s) => s.mode);
  const selectedSketchId = useEditorStore((s) => s.selectedSketchId);

  if (mode !== "extrude" || !selectedSketchId) return null;

  return (
    <ExtrudeDialog
      sketchId={selectedSketchId}
      onExtrude={(profileId, distance) => {
        logic.extrude(selectedSketchId, profileId, distance);
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

export const extrudePlugin: Plugin = {
  id: "extrude",
  name: "Extrude",
  icon: ExtrudeIcon,
  category: "create",
  skillId: "extrude",

  activate(api: CanvasAPI, bus: EventBus) {
    logic.activate(api, bus);
  },

  deactivate() {
    logic.deactivate();
  },

  toolbar: ExtrudeToolbarWrapper,

  aiTools: logic.getAITools(),
};
