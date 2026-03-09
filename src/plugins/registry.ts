import type { Plugin } from "@/core/api/types";
import { canvasAPI } from "@/core/api/CanvasAPI";
import { eventBus } from "@/core/api/EventBus";

class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private activePlugins: Set<string> = new Set();

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin "${plugin.id}" is already registered.`);
      return;
    }
    this.plugins.set(plugin.id, plugin);
  }

  unregister(pluginId: string): void {
    this.deactivate(pluginId);
    this.plugins.delete(pluginId);
  }

  activate(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin "${pluginId}" not found.`);
      return;
    }
    if (this.activePlugins.has(pluginId)) return;

    plugin.activate(canvasAPI, eventBus);
    this.activePlugins.add(pluginId);
    eventBus.emit("tool:activate", { pluginId });
  }

  deactivate(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !this.activePlugins.has(pluginId)) return;

    plugin.deactivate();
    this.activePlugins.delete(pluginId);
    eventBus.emit("tool:deactivate", { pluginId });
  }

  deactivateAll(): void {
    for (const pluginId of this.activePlugins) {
      const plugin = this.plugins.get(pluginId);
      plugin?.deactivate();
    }
    this.activePlugins.clear();
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getPluginsByCategory(category: Plugin["category"]): Plugin[] {
    return this.getAllPlugins().filter((p) => p.category === category);
  }

  isActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId);
  }

  getActivePlugins(): Plugin[] {
    return Array.from(this.activePlugins)
      .map((id) => this.plugins.get(id))
      .filter(Boolean) as Plugin[];
  }
}

export const pluginRegistry = new PluginRegistry();
