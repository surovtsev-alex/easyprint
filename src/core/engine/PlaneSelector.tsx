"use client";

import { useState } from "react";

interface PlaneSelectorProps {
  onSelect: (plane: "XY" | "XZ" | "YZ") => void;
  onCancel: () => void;
}

const planes = [
  {
    id: "XY" as const,
    label: "XY Plane (Front)",
    description: "Draw on the front plane",
    color: "bg-blue-500/20 border-blue-500 hover:bg-blue-500/40",
  },
  {
    id: "XZ" as const,
    label: "XZ Plane (Top)",
    description: "Draw on the top plane",
    color: "bg-green-500/20 border-green-500 hover:bg-green-500/40",
  },
  {
    id: "YZ" as const,
    label: "YZ Plane (Right)",
    description: "Draw on the right plane",
    color: "bg-red-500/20 border-red-500 hover:bg-red-500/40",
  },
];

export function PlaneSelector({ onSelect, onCancel }: PlaneSelectorProps) {
  const [hoveredPlane, setHoveredPlane] = useState<string | null>(null);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-2xl max-w-sm w-full mx-4">
        <h3 className="text-white text-lg font-semibold mb-2">
          Select Sketch Plane
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          Choose a plane to start your sketch
        </p>

        <div className="space-y-2">
          {planes.map((plane) => (
            <button
              key={plane.id}
              className={`w-full p-3 rounded-lg border text-left transition-all ${plane.color}`}
              onMouseEnter={() => setHoveredPlane(plane.id)}
              onMouseLeave={() => setHoveredPlane(null)}
              onClick={() => onSelect(plane.id)}
            >
              <div className="text-white font-medium">{plane.label}</div>
              <div className="text-gray-300 text-xs mt-0.5">
                {plane.description}
              </div>
            </button>
          ))}
        </div>

        <button
          className="mt-4 w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
