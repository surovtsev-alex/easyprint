"use client";

import { useHistoryStore } from "@/core/store/historyStore";

const operationIcons: Record<string, string> = {
  sketch: "S",
  extrude: "E",
  hole: "H",
  import: "I",
};

export function Timeline() {
  const operations = useHistoryStore((s) => s.operations);
  const currentIndex = useHistoryStore((s) => s.currentIndex);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  return (
    <div
      className="h-10 border-t border-gray-700 flex items-center px-3 gap-1"
      style={{ backgroundColor: "#1a1a2e" }}
    >
      {/* Undo/Redo */}
      <button
        onClick={undo}
        disabled={currentIndex < 0}
        className="px-2 py-1 text-xs text-gray-400 hover:text-white disabled:text-gray-700 transition-colors"
        title="Undo"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="1,4 1,10 7,10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
      <button
        onClick={redo}
        disabled={currentIndex >= operations.length - 1}
        className="px-2 py-1 text-xs text-gray-400 hover:text-white disabled:text-gray-700 transition-colors"
        title="Redo"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="23,4 23,10 17,10" />
          <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
        </svg>
      </button>

      <div className="w-px h-5 bg-gray-700 mx-2" />

      {/* Operation Timeline */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {operations.length === 0 && (
          <span className="text-gray-600 text-xs italic">
            Timeline: Start by creating a sketch
          </span>
        )}
        {operations.map((op, index) => (
          <div
            key={op.id}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
              index <= currentIndex
                ? "bg-gray-700 text-gray-200"
                : "bg-gray-800 text-gray-500"
            }`}
            title={op.label}
          >
            <span className="w-4 h-4 flex items-center justify-center bg-gray-600 rounded text-[10px] font-bold">
              {operationIcons[op.type] || "?"}
            </span>
            <span className="truncate max-w-[80px]">{op.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
