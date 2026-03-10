"use client";

import { useEditorStore } from "@/core/store/editorStore";
import { eventBus } from "@/core/api/EventBus";

export type SketchTool = "line" | "rectangle" | "circle" | "arc" | "ellipse" | "polyline" | "select";

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const map: Record<string, SketchTool> = {
        l: "line", r: "rectangle", c: "circle",
        a: "arc", e: "ellipse", p: "polyline", s: "select",
      };
      const t = map[e.key.toLowerCase()];
      if (t) setSketchTool(t);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  if (mode !== "sketch") return null;

  const tools: { id: SketchTool; label: string; icon: string; tip?: string }[] = [
    { id: "line", label: "Line", icon: "╱", tip: "Draw a line (L)" },
    { id: "rectangle", label: "Rect", icon: "▭", tip: "Draw a rectangle (R)" },
    { id: "circle", label: "Circle", icon: "○", tip: "Draw a circle (C)" },
    { id: "arc", label: "Arc", icon: "⌒", tip: "Draw a 3-point arc (A)" },
    { id: "ellipse", label: "Ellipse", icon: "⬮", tip: "Draw an ellipse (E)" },
    { id: "polyline", label: "Polyline", icon: "⏌", tip: "Draw connected lines, dbl-click to finish (P)" },
    { id: "select", label: "Select", icon: "↖", tip: "Select primitives (S)" },
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
          title={t.tip || t.label}
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
