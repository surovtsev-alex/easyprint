"use client";

import { useState } from "react";
import { useProjectStore } from "@/core/store/projectStore";

interface HoleDialogProps {
  onCreateHole: (
    bodyId: string,
    position: [number, number, number],
    radius: number,
    depth: number,
    direction: "x" | "y" | "z"
  ) => void;
  onCancel: () => void;
}

export function HoleDialog({ onCreateHole, onCancel }: HoleDialogProps) {
  const bodies = useProjectStore((s) => s.bodies);
  const [bodyId, setBodyId] = useState(bodies[0]?.id || "");
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState(0);
  const [radius, setRadius] = useState(3);
  const [depth, setDepth] = useState(10);
  const [direction, setDirection] = useState<"x" | "y" | "z">("y");

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 bg-gray-800/95 border border-gray-600 rounded-lg px-4 py-3 shadow-lg min-w-[280px]">
      <h3 className="text-white text-sm font-semibold mb-3">Create Hole</h3>

      {bodies.length === 0 ? (
        <p className="text-gray-400 text-xs mb-3">
          No bodies available. Create a body first using Extrude.
        </p>
      ) : (
        <>
          <div className="mb-2">
            <label className="text-gray-300 text-xs block mb-1">Body</label>
            <select
              value={bodyId}
              onChange={(e) => setBodyId(e.target.value)}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-200 text-xs"
            >
              {bodies.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <label className="text-gray-300 text-xs block mb-1">X</label>
              <input type="number" value={x} onChange={(e) => setX(Number(e.target.value))}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-200 text-xs" step={1} />
            </div>
            <div>
              <label className="text-gray-300 text-xs block mb-1">Y</label>
              <input type="number" value={y} onChange={(e) => setY(Number(e.target.value))}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-200 text-xs" step={1} />
            </div>
            <div>
              <label className="text-gray-300 text-xs block mb-1">Z</label>
              <input type="number" value={z} onChange={(e) => setZ(Number(e.target.value))}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-200 text-xs" step={1} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <label className="text-gray-300 text-xs block mb-1">Radius</label>
              <input type="number" value={radius} onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-200 text-xs" step={0.5} min={0.1} />
            </div>
            <div>
              <label className="text-gray-300 text-xs block mb-1">Depth</label>
              <input type="number" value={depth} onChange={(e) => setDepth(Number(e.target.value))}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-200 text-xs" step={1} min={0.1} />
            </div>
            <div>
              <label className="text-gray-300 text-xs block mb-1">Dir</label>
              <select value={direction} onChange={(e) => setDirection(e.target.value as "x" | "y" | "z")}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-200 text-xs">
                <option value="x">X</option>
                <option value="y">Y</option>
                <option value="z">Z</option>
              </select>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onCreateHole(bodyId, [x, y, z], radius, depth, direction)}
          disabled={!bodyId || bodies.length === 0}
          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-xs rounded transition-colors"
        >
          Create Hole
        </button>
        <button onClick={onCancel}
          className="flex-1 py-1.5 bg-gray-600 hover:bg-gray-500 text-gray-200 text-xs rounded transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
