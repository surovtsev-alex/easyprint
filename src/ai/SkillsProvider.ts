// Skills are loaded from /public/skills.json which is generated at build time
// by src/scripts/aggregate-skills.ts from plugin skill.md files.

export async function loadSkills(): Promise<Record<string, unknown>[]> {
  try {
    const basePath =
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "production"
        ? `/${process.env.NEXT_PUBLIC_REPO_NAME || "easyprint"}`
        : "";
    const res = await fetch(`${basePath}/skills.json`);
    if (res.ok) {
      return res.json();
    }
  } catch {
    console.warn("Could not load AI skills");
  }
  return [];
}
