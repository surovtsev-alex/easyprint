"use client";

import { useEditorStore } from "@/core/store/editorStore";
import { pluginRegistry } from "@/plugins/registry";

export function ActivePluginToolbar() {
  const activePluginId = useEditorStore((s) => s.activePluginId);

  if (!activePluginId) return null;

  const plugin = pluginRegistry.getPlugin(activePluginId);
  if (!plugin?.toolbar) return null;

  const ToolbarComponent = plugin.toolbar;
  return <ToolbarComponent />;
}
