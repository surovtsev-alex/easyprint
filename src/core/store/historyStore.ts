import { create } from "zustand";
import type { Operation } from "../api/types";

interface HistoryState {
  operations: Operation[];
  currentIndex: number;

  addOperation: (operation: Operation) => void;
  undo: () => Operation | null;
  redo: () => Operation | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  operations: [],
  currentIndex: -1,

  addOperation: (operation) =>
    set((state) => {
      const newOps = state.operations.slice(0, state.currentIndex + 1);
      newOps.push(operation);
      return {
        operations: newOps,
        currentIndex: newOps.length - 1,
      };
    }),

  undo: () => {
    const state = get();
    if (state.currentIndex < 0) return null;
    const op = state.operations[state.currentIndex];
    set({ currentIndex: state.currentIndex - 1 });
    return op;
  },

  redo: () => {
    const state = get();
    if (state.currentIndex >= state.operations.length - 1) return null;
    set({ currentIndex: state.currentIndex + 1 });
    return state.operations[state.currentIndex + 1];
  },

  canUndo: () => get().currentIndex >= 0,
  canRedo: () => get().currentIndex < get().operations.length - 1,
  clear: () => set({ operations: [], currentIndex: -1 }),
}));
