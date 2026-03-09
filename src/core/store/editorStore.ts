import { create } from "zustand";

export type EditorMode = "idle" | "sketch" | "extrude" | "hole" | "select";
export type ViewportMode = "single" | "quad";

interface EditorState {
  mode: EditorMode;
  activePluginId: string | null;
  selectedBodyId: string | null;
  selectedSketchId: string | null;
  viewportMode: ViewportMode;
  sketchPlane: "XY" | "XZ" | "YZ" | null;
  showPlaneSelector: boolean;

  setMode: (mode: EditorMode) => void;
  setActivePlugin: (pluginId: string | null) => void;
  setSelectedBody: (bodyId: string | null) => void;
  setSelectedSketch: (sketchId: string | null) => void;
  setViewportMode: (mode: ViewportMode) => void;
  setSketchPlane: (plane: "XY" | "XZ" | "YZ" | null) => void;
  setShowPlaneSelector: (show: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  mode: "idle",
  activePluginId: null,
  selectedBodyId: null,
  selectedSketchId: null,
  viewportMode: "single",
  sketchPlane: null,
  showPlaneSelector: false,

  setMode: (mode) => set({ mode }),
  setActivePlugin: (pluginId) => set({ activePluginId: pluginId }),
  setSelectedBody: (bodyId) => set({ selectedBodyId: bodyId }),
  setSelectedSketch: (sketchId) => set({ selectedSketchId: sketchId }),
  setViewportMode: (mode) => set({ viewportMode: mode }),
  setSketchPlane: (plane) => set({ sketchPlane: plane }),
  setShowPlaneSelector: (show) => set({ showPlaneSelector: show }),
}));
