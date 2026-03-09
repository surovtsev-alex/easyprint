"use client";

import { useState } from "react";
import { canvasAPI } from "@/core/api/CanvasAPI";

interface ExtrudeDialogProps {
  sketchId: string;
  onExtrude: (profileId: string, distance: number) => void;
  onCancel: () => void;
}

export function ExtrudeDialog({
  sketchId,
  onExtrude,
  onCancel,
}: ExtrudeDialogProps) {
  const [distance, setDistance] = useState(10);
  const sketch = canvasAPI.getSketch(sketchId);
  const profiles = sketch?.profiles.filter((p) => p.closed) || [];
  const [selectedProfile, setSelectedProfile] = useState(
    profiles[0]?.id || ""
  );

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 bg-gray-800/95 border border-gray-600 rounded-lg px-4 py-3 shadow-lg min-w-[280px]">
      <h3 className="text-white text-sm font-semibold mb-3">Extrude</h3>

      {profiles.length === 0 ? (
        <p className="text-gray-400 text-xs mb-3">
          No closed profiles found. Create a sketch with closed shapes first.
        </p>
      ) : (
        <>
          <div className="mb-3">
            <label className="text-gray-300 text-xs block mb-1">Profile</label>
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-200 text-xs"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} ({p.edges.length} edges)
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="text-gray-300 text-xs block mb-1">
              Distance (mm)
            </label>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-200 text-xs"
              step={1}
            />
          </div>
        </>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onExtrude(selectedProfile, distance)}
          disabled={!selectedProfile || profiles.length === 0}
          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-xs rounded transition-colors"
        >
          Extrude
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 bg-gray-600 hover:bg-gray-500 text-gray-200 text-xs rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
