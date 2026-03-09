import { pluginRegistry } from "@/plugins/registry";

export class ToolExecutor {
  async execute(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    // Tool names follow the pattern: pluginId_toolName
    const parts = toolName.split("_");
    const pluginId = parts[0];
    const actionName = parts.slice(1).join("_");

    const plugin = pluginRegistry.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin "${pluginId}" not found for tool "${toolName}"`);
    }

    if (!plugin.aiTools || !plugin.aiTools[actionName]) {
      throw new Error(
        `Tool "${actionName}" not found in plugin "${pluginId}"`
      );
    }

    return plugin.aiTools[actionName](args);
  }
}
