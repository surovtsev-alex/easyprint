"use client";

import { useProjectStore } from "@/core/store/projectStore";
import { useEditorStore } from "@/core/store/editorStore";
import { canvasAPI } from "@/core/api/CanvasAPI";
import { pluginRegistry } from "@/plugins/registry";
import { eventBus } from "@/core/api/EventBus";

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={visible ? "text-gray-300" : "text-gray-600"}
    >
      {visible ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  );
}

export function Sidebar() {
  const bodies = useProjectStore((s) => s.bodies);
  const sketches = useProjectStore((s) => s.sketches);
  const selectedBodyId = useEditorStore((s) => s.selectedBodyId);
  const setSelectedBody = useEditorStore((s) => s.setSelectedBody);
  const toggleBodyVisibility = useProjectStore((s) => s.toggleBodyVisibility);

  return (
    <div
      className="w-56 border-r border-gray-700 flex flex-col text-sm overflow-hidden"
      style={{ backgroundColor: "#16162a" }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700">
        <h2 className="text-gray-300 font-semibold text-xs uppercase tracking-wider">
          Browser
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Bodies */}
        <div className="px-2 py-1">
          <div className="text-gray-500 text-[10px] uppercase tracking-wider px-1 py-1">
            Bodies ({bodies.length})
          </div>
          {bodies.length === 0 && (
            <div className="text-gray-600 text-xs px-1 py-2 italic">
              No bodies yet
            </div>
          )}
          {bodies.map((body) => (
            <div
              key={body.id}
              className={`flex items-center gap-2 px-1 py-1 rounded cursor-pointer transition-colors ${
                selectedBodyId === body.id
                  ? "bg-blue-600/30 text-white"
                  : "text-gray-300 hover:bg-gray-700/50"
              }`}
              onClick={() => setSelectedBody(body.id)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBodyVisibility(body.id);
                  const b = canvasAPI.getBody(body.id);
                  if (b) b.mesh.visible = !b.mesh.visible;
                }}
                className="hover:text-white"
              >
                <EyeIcon visible={body.visible} />
              </button>
              <span className="text-xs truncate">{body.name}</span>
              <span className="text-gray-500 text-[10px] ml-auto">
                {body.operations.length} ops
              </span>
            </div>
          ))}
        </div>

        {/* Sketches */}
        <div className="px-2 py-1 border-t border-gray-700/50">
          <div className="text-gray-500 text-[10px] uppercase tracking-wider px-1 py-1">
            Sketches ({sketches.length})
          </div>
          {sketches.length === 0 && (
            <div className="text-gray-600 text-xs px-1 py-2 italic">
              No sketches yet
            </div>
          )}
          {sketches.map((sketch) => (
            <div
              key={sketch.id}
              className="flex items-center gap-2 px-1 py-1 rounded text-gray-300 hover:bg-gray-700/50 cursor-pointer text-xs"
              onDoubleClick={() => {
                // Activate sketch plugin and enter edit mode
                pluginRegistry.deactivateAll();
                pluginRegistry.activate("sketch");
                useEditorStore.getState().setActivePlugin("sketch");
                // Small delay to let plugin activate before sending edit event
                setTimeout(() => {
                  eventBus.emit("sketch:edit", { sketchId: sketch.id });
                }, 50);
              }}
              title="Double-click to edit"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
              <span className="truncate">
                Sketch ({sketch.plane}) - {sketch.primitives.length} elements
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
