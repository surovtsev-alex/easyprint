import fs from "fs";
import path from "path";

const PLUGINS_DIR = path.join(process.cwd(), "src", "plugins");
const OUTPUT_FILE = path.join(process.cwd(), "public", "skills.json");

interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

function parseSkillMd(content: string, pluginId: string): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  // Split by ### to find tool definitions
  const sections = content.split(/^### /m).slice(1);

  for (const section of sections) {
    const lines = section.trim().split("\n");
    const toolName = lines[0]?.trim() || "";
    const description = lines[1]?.trim() || "";

    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (let i = 2; i < lines.length; i++) {
      const paramMatch = lines[i].match(
        /^- `(\w+)` \((\w+)(?:, (required))?\)(?::\s*(.+))?/
      );
      if (paramMatch) {
        const [, paramName, paramType, isRequired, paramDesc] = paramMatch;
        properties[paramName] = {
          type: paramType === "number" ? "number" : "string",
          description: paramDesc?.trim() || "",
        };
        if (isRequired) {
          required.push(paramName);
        }
      }
    }

    tools.push({
      type: "function",
      function: {
        name: toolName.replace(/[^a-zA-Z0-9_-]/g, ""),
        description,
        parameters: {
          type: "object",
          properties,
          required,
        },
      },
    });
  }

  return tools;
}

function main() {
  const allTools: ToolDefinition[] = [];

  // Find all skill.md files in plugin directories
  const pluginDirs = fs.readdirSync(PLUGINS_DIR, { withFileTypes: true });

  for (const dir of pluginDirs) {
    if (!dir.isDirectory()) continue;

    const skillPath = path.join(PLUGINS_DIR, dir.name, "skill.md");
    if (!fs.existsSync(skillPath)) continue;

    const content = fs.readFileSync(skillPath, "utf-8");
    const tools = parseSkillMd(content, dir.name);
    allTools.push(...tools);

    console.log(`  Parsed ${tools.length} tools from ${dir.name}/skill.md`);
  }

  // Ensure public directory exists
  const publicDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allTools, null, 2));
  console.log(`\nGenerated ${OUTPUT_FILE} with ${allTools.length} total tools`);
}

main();
