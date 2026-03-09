import { create } from "zustand";
import type { Body, Sketch, Operation } from "../api/types";

interface ProjectState {
  projectName: string;
  bodies: Body[];
  sketches: Sketch[];

  setProjectName: (name: string) => void;
  addBody: (body: Body) => void;
  removeBody: (bodyId: string) => void;
  updateBody: (bodyId: string, updates: Partial<Body>) => void;
  addOperation: (bodyId: string, operation: Operation) => void;
  addSketch: (sketch: Sketch) => void;
  removeSketch: (sketchId: string) => void;
  toggleBodyVisibility: (bodyId: string) => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectName: "Untitled Project",
  bodies: [],
  sketches: [],

  setProjectName: (name) => set({ projectName: name }),

  addBody: (body) =>
    set((state) => ({ bodies: [...state.bodies, body] })),

  removeBody: (bodyId) =>
    set((state) => ({
      bodies: state.bodies.filter((b) => b.id !== bodyId),
    })),

  updateBody: (bodyId, updates) =>
    set((state) => ({
      bodies: state.bodies.map((b) =>
        b.id === bodyId ? { ...b, ...updates } : b
      ),
    })),

  addOperation: (bodyId, operation) =>
    set((state) => ({
      bodies: state.bodies.map((b) =>
        b.id === bodyId
          ? { ...b, operations: [...b.operations, operation] }
          : b
      ),
    })),

  addSketch: (sketch) =>
    set((state) => ({ sketches: [...state.sketches, sketch] })),

  removeSketch: (sketchId) =>
    set((state) => ({
      sketches: state.sketches.filter((s) => s.id !== sketchId),
    })),

  toggleBodyVisibility: (bodyId) =>
    set((state) => ({
      bodies: state.bodies.map((b) =>
        b.id === bodyId ? { ...b, visible: !b.visible } : b
      ),
    })),

  reset: () => set({ projectName: "Untitled Project", bodies: [], sketches: [] }),
}));
