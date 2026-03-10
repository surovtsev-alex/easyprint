"use client";

import { useState } from "react";
import { canvasAPI } from "@/core/api/CanvasAPI";
import { useProjectStore } from "@/core/store/projectStore";

interface ExtrudeDialogProps {
  sketchId?: string;
  onExtrude: (sketchId: string, profileId: string, distance: number) => void;
  onCancel: () => void;
}

export function ExtrudeDialog({
  sketchId: initialSketchId,
  onExtrude,
  onCancel,
}: ExtrudeDialogProps) {
  const allSketches = useProjectStore((s) => s.sketches);

  // Find sketches that have closed profiles
  const sketchesWithProfiles = allSketches.filter((s) => {
    const sketch = canvasAPI.getSketch(s.id);
    return sketch && sketch.profiles.some((p) => p.closed);
  });

  const [selectedSketchId, setSelectedSketchId] = useState(
    initialSketchId || sketchesWithProfiles[0]?.id || ""
  );

  const sketch = selectedSketchId ? canvasAPI.getSketch(selectedSketchId) : null;
  const profiles = sketch?.profiles.filter((p) => p.closed) || [];

  const [selectedProfile, setSelectedProfile] = useState(
    profiles[0]?.id || ""
  );
  const [distance, setDistance] = useState(10);

  // Update profile selection when sketch changes
  const handleSketchChange = (id: string) => {
    setSelectedSketchId(id);
    const sk = canvasAPI.getSketch(id);
    const profs = sk?.profiles.filter((p) => p.closed) || [];
    setSelectedProfile(profs[0]?.id || "");
  };

  const noSketches = sketchesWithProfiles.length === 0;

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 bg-gray-800/95 border border-gray-600 rounded-lg px-4 py-3 shadow-lg min-w-[280px]">
      <h3 className="text-white text-sm font-semibold mb-3">Extrude</h3>

      {noSketches ? (
        <p className="text-gray-400 text-xs mb-3">
          No sketches with closed profiles found. Draw a rectangle, circle, or closed shape first.
        </p>
      ) : (
        <>
          {/* Sketch selector */}
          {sketchesWithProfiles.length > 0 && (
            <div className="mb-3">
              <label className="text-gray-300 text-xs block mb-1">Sketch</label>
              <select
                value={selectedSketchId}
                onChange={(e) => handleSketchChange(e.target.value)}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-200 text-xs"
              >
                {sketchesWithProfiles.map((s) => (
                  <option key={s.id} value={s.id}>
                    Sketch ({s.plane}) - {s.primitives.length} elements
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Profile selector */}
          <div className="mb-3">
            <label className="text-gray-300 text-xs block mb-1">Profile</label>
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-gray-200 text-xs"
            >
              {profiles.map((p, i) => (
                <option key={p.id} value={p.id}>
                  Profile {i + 1} ({p.edges.length} edges)
                </option>
              ))}
            </select>
          </div>

          {/* Distance */}
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
          onClick={() => onExtrude(selectedSketchId, selectedProfile, distance)}
          disabled={!selectedProfile || !selectedSketchId || noSketches}
          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs rounded transition-colors"
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
