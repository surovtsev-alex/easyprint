"use client";

import { useEditorStore } from "@/core/store/editorStore";
import { pluginRegistry } from "@/plugins/registry";
import type { Plugin } from "@/core/api/types";

const categoryLabels: Record<string, string> = {
  sketch: "Sketch",
  create: "Create",
  modify: "Modify",
  io: "Import/Export",
};

function ToolButton({ plugin }: { plugin: Plugin }) {
  const activePluginId = useEditorStore((s) => s.activePluginId);
  const isActive = activePluginId === plugin.id;
  const Icon = plugin.icon;

  const handleClick = () => {
    if (isActive) {
      pluginRegistry.deactivate(plugin.id);
      useEditorStore.getState().setActivePlugin(null);
      useEditorStore.getState().setMode("idle");
    } else {
      pluginRegistry.deactivateAll();
      pluginRegistry.activate(plugin.id);
      useEditorStore.getState().setActivePlugin(plugin.id);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex flex-col items-center justify-center px-3 py-1.5 rounded text-xs transition-colors min-w-[56px] ${
        isActive
          ? "bg-blue-600 text-white"
          : "text-gray-300 hover:bg-gray-700 hover:text-white"
      }`}
      title={plugin.name}
    >
      <div className="w-5 h-5 flex items-center justify-center mb-0.5">
        <Icon />
      </div>
      <span className="truncate max-w-[52px]">{plugin.name}</span>
    </button>
  );
}

function ToolGroup({
  category,
  plugins,
}: {
  category: string;
  plugins: Plugin[];
}) {
  if (plugins.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-500 text-[10px] uppercase tracking-wider mr-1 hidden lg:block">
        {categoryLabels[category] || category}
      </span>
      {plugins.map((plugin) => (
        <ToolButton key={plugin.id} plugin={plugin} />
      ))}
      <div className="w-px h-6 bg-gray-700 mx-1" />
    </div>
  );
}

export function Toolbar() {
  const allPlugins = pluginRegistry.getAllPlugins();
  const viewportMode = useEditorStore((s) => s.viewportMode);
  const setViewportMode = useEditorStore((s) => s.setViewportMode);

  const categories = ["sketch", "create", "modify", "io"];
  const grouped = categories.map((cat) => ({
    category: cat,
    plugins: allPlugins.filter((p) => p.category === cat),
  }));

  return (
    <div className="h-12 bg-gray-850 border-b border-gray-700 flex items-center px-3 gap-1"
      style={{ backgroundColor: "#1e1e2e" }}
    >
      <div className="flex items-center mr-4">
        <span className="text-blue-400 font-bold text-sm tracking-wide">
          EasyPrint
        </span>
      </div>

      <div className="flex items-center gap-1 flex-1">
        {grouped.map((g) => (
          <ToolGroup key={g.category} {...g} />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            setViewportMode(viewportMode === "single" ? "quad" : "single")
          }
          className="px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 rounded transition-colors"
          title="Toggle viewport mode"
        >
          {viewportMode === "single" ? "⊞ Quad" : "□ Single"}
        </button>
      </div>
    </div>
  );
}
