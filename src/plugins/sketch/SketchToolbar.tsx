"use client";

import { useEditorStore } from "@/core/store/editorStore";
import { eventBus } from "@/core/api/EventBus";

export type SketchTool = "line" | "circle" | "rectangle" | "select";

let currentSketchTool: SketchTool = "line";
const listeners: Set<() => void> = new Set();

export function getSketchTool(): SketchTool {
  return currentSketchTool;
}

export function setSketchTool(tool: SketchTool): void {
  currentSketchTool = tool;
  listeners.forEach((fn) => fn());
}

function useSketchTool(): SketchTool {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const fn = () => forceUpdate((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return currentSketchTool;
}

import { useState, useEffect } from "react";

export function SketchToolbar() {
  const mode = useEditorStore((s) => s.mode);
  const tool = useSketchTool();

  if (mode !== "sketch") return null;

  const tools = [
    { id: "line" as const, label: "Line", icon: "╱" },
    { id: "rectangle" as const, label: "Rect", icon: "▭" },
    { id: "circle" as const, label: "Circle", icon: "○" },
    { id: "select" as const, label: "Select", icon: "↖" },
  ];

  const handleFinish = () => {
    const sketchId = useEditorStore.getState().selectedSketchId;
    if (sketchId) {
      eventBus.emit("sketch:complete", { sketchId });
    }
  };

  const handleCancel = () => {
    eventBus.emit("sketch:cancel", undefined as never);
  };

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-gray-800/95 border border-gray-600 rounded-lg px-2 py-1 shadow-lg">
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => setSketchTool(t.id)}
          className={`px-3 py-1 rounded text-xs transition-colors ${
            tool === t.id
              ? "bg-blue-600 text-white"
              : "text-gray-300 hover:bg-gray-700"
          }`}
          title={t.label}
        >
          <span className="mr-1">{t.icon}</span>
          {t.label}
        </button>
      ))}
      <div className="w-px h-5 bg-gray-600 mx-1" />
      <button
        onClick={handleFinish}
        className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
      >
        Finish
      </button>
      <button
        onClick={handleCancel}
        className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-gray-200 text-xs rounded transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
