"use client";

import { useState, useEffect, useCallback } from "react";
import { useEditorStore } from "@/core/store/editorStore";
import type { SketchPrimitive } from "@/core/api/types";
import { getSelectedPrimitive, onSelectionChange, setSelectedPrimitive } from "./SketchPlugin";

// We need access to the logic instance to call updatePrimitive/deletePrimitive
let logicRef: {
  getCurrentSketch: () => { primitives: SketchPrimitive[] } | null;
  updatePrimitive: (idx: number, prim: SketchPrimitive) => void;
  deletePrimitive: (idx: number) => void;
} | null = null;

export function setLogicRef(ref: typeof logicRef): void {
  logicRef = ref;
}

function NumInput({
  label, value, onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(value.toFixed(2));

  useEffect(() => {
    setText(value.toFixed(2));
  }, [value]);

  const commit = () => {
    const n = parseFloat(text);
    if (!isNaN(n)) onChange(n);
    else setText(value.toFixed(2));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 text-[10px] uppercase w-8 shrink-0">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-white focus:border-blue-500 outline-none"
      />
    </div>
  );
}

export function SketchPropertiesPanel() {
  const mode = useEditorStore((s) => s.mode);
  const [selectedIdx, setLocalIdx] = useState<number | null>(getSelectedPrimitive());

  useEffect(() => {
    return onSelectionChange(() => {
      setLocalIdx(getSelectedPrimitive());
    });
  }, []);

  if (mode !== "sketch" || selectedIdx === null || !logicRef) return null;

  const sketch = logicRef.getCurrentSketch();
  if (!sketch || selectedIdx >= sketch.primitives.length) return null;

  const prim = sketch.primitives[selectedIdx];

  const update = (newPrim: SketchPrimitive) => {
    logicRef!.updatePrimitive(selectedIdx, newPrim);
  };

  const handleDelete = () => {
    logicRef!.deletePrimitive(selectedIdx);
  };

  return (
    <div className="absolute top-14 right-2 z-20 bg-gray-800/95 border border-gray-600 rounded-lg p-3 shadow-lg w-56">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-200 uppercase">
          {prim.type}
        </span>
        <button
          onClick={handleDelete}
          className="text-red-400 hover:text-red-300 text-xs px-1"
          title="Delete primitive"
        >
          Del
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {prim.type === "line" && (
          <>
            <NumInput label="X1" value={prim.start[0]} onChange={(v) =>
              update({ ...prim, start: [v, prim.start[1]] })} />
            <NumInput label="Y1" value={prim.start[1]} onChange={(v) =>
              update({ ...prim, start: [prim.start[0], v] })} />
            <NumInput label="X2" value={prim.end[0]} onChange={(v) =>
              update({ ...prim, end: [v, prim.end[1]] })} />
            <NumInput label="Y2" value={prim.end[1]} onChange={(v) =>
              update({ ...prim, end: [prim.end[0], v] })} />
          </>
        )}
        {prim.type === "rectangle" && (
          <>
            <NumInput label="X" value={prim.origin[0]} onChange={(v) =>
              update({ ...prim, origin: [v, prim.origin[1]] })} />
            <NumInput label="Y" value={prim.origin[1]} onChange={(v) =>
              update({ ...prim, origin: [prim.origin[0], v] })} />
            <NumInput label="W" value={prim.width} onChange={(v) =>
              update({ ...prim, width: Math.max(0.1, v) })} />
            <NumInput label="H" value={prim.height} onChange={(v) =>
              update({ ...prim, height: Math.max(0.1, v) })} />
          </>
        )}
        {prim.type === "circle" && (
          <>
            <NumInput label="CX" value={prim.center[0]} onChange={(v) =>
              update({ ...prim, center: [v, prim.center[1]] })} />
            <NumInput label="CY" value={prim.center[1]} onChange={(v) =>
              update({ ...prim, center: [prim.center[0], v] })} />
            <NumInput label="R" value={prim.radius} onChange={(v) =>
              update({ ...prim, radius: Math.max(0.1, v) })} />
          </>
        )}
        {prim.type === "ellipse" && (
          <>
            <NumInput label="CX" value={prim.center[0]} onChange={(v) =>
              update({ ...prim, center: [v, prim.center[1]] })} />
            <NumInput label="CY" value={prim.center[1]} onChange={(v) =>
              update({ ...prim, center: [prim.center[0], v] })} />
            <NumInput label="RX" value={prim.radiusX} onChange={(v) =>
              update({ ...prim, radiusX: Math.max(0.1, v) })} />
            <NumInput label="RY" value={prim.radiusY} onChange={(v) =>
              update({ ...prim, radiusY: Math.max(0.1, v) })} />
          </>
        )}
        {prim.type === "arc" && (
          <>
            <NumInput label="CX" value={prim.center[0]} onChange={(v) =>
              update({ ...prim, center: [v, prim.center[1]] })} />
            <NumInput label="CY" value={prim.center[1]} onChange={(v) =>
              update({ ...prim, center: [prim.center[0], v] })} />
            <NumInput label="R" value={prim.radius} onChange={(v) =>
              update({ ...prim, radius: Math.max(0.1, v) })} />
            <NumInput label="S°" value={+(prim.startAngle * 180 / Math.PI).toFixed(1)} onChange={(v) =>
              update({ ...prim, startAngle: v * Math.PI / 180 })} />
            <NumInput label="E°" value={+(prim.endAngle * 180 / Math.PI).toFixed(1)} onChange={(v) =>
              update({ ...prim, endAngle: v * Math.PI / 180 })} />
          </>
        )}
        {prim.type === "polyline" && (
          <>
            <div className="text-[10px] text-gray-400 mb-1">{prim.points.length} points</div>
            {prim.points.map((pt, i) => (
              <div key={i} className="flex gap-1">
                <NumInput label={`X${i}`} value={pt[0]} onChange={(v) => {
                  const pts = prim.points.map(p => [...p] as [number, number]);
                  pts[i][0] = v;
                  update({ ...prim, points: pts });
                }} />
                <NumInput label={`Y${i}`} value={pt[1]} onChange={(v) => {
                  const pts = prim.points.map(p => [...p] as [number, number]);
                  pts[i][1] = v;
                  update({ ...prim, points: pts });
                }} />
              </div>
            ))}
            <label className="flex items-center gap-1.5 text-[10px] text-gray-300 mt-1">
              <input
                type="checkbox"
                checked={prim.closed}
                onChange={(e) => update({ ...prim, closed: e.target.checked })}
                className="rounded"
              />
              Closed
            </label>
          </>
        )}
      </div>
      <div className="text-[9px] text-gray-500 mt-2 border-t border-gray-700 pt-1.5">
        Select tool (S) — click to select, drag to move
      </div>
    </div>
  );
}
