import { saveProjectLocal, loadProjectLocal, listProjectsLocal } from "./IndexedDBStore";
import { saveProject as saveToDrive, loadProject as loadFromDrive, listProjects as listFromDrive } from "@/auth/DriveStorage";
import { getGoogleUser } from "@/auth/GoogleAuth";
import type { SerializedProject } from "./types";

export async function saveProject(project: SerializedProject): Promise<void> {
  // Always save locally
  await saveProjectLocal(project);

  // If authenticated, also save to Google Drive
  const user = getGoogleUser();
  if (user) {
    try {
      await saveToDrive(project.id, project.name, JSON.stringify(project));
    } catch (err) {
      console.warn("Failed to save to Google Drive:", err);
    }
  }
}

export async function loadProject(
  projectId: string
): Promise<SerializedProject | null> {
  // Try local first
  const local = await loadProjectLocal(projectId);
  if (local) return local;

  // Try Google Drive
  const user = getGoogleUser();
  if (user) {
    try {
      const data = await loadFromDrive(projectId);
      if (data) {
        const project = JSON.parse(data) as SerializedProject;
        // Cache locally
        await saveProjectLocal(project);
        return project;
      }
    } catch (err) {
      console.warn("Failed to load from Google Drive:", err);
    }
  }

  return null;
}

export async function listProjects(): Promise<
  Array<{ id: string; name: string; updatedAt: number; source: "local" | "drive" }>
> {
  const results: Array<{ id: string; name: string; updatedAt: number; source: "local" | "drive" }> = [];
  const seen = new Set<string>();

  // Local projects
  const localProjects = await listProjectsLocal();
  for (const p of localProjects) {
    results.push({ id: p.id, name: p.name, updatedAt: p.updatedAt, source: "local" });
    seen.add(p.id);
  }

  // Drive projects
  const user = getGoogleUser();
  if (user) {
    try {
      const driveProjects = await listFromDrive();
      for (const p of driveProjects) {
        if (!seen.has(p.id)) {
          results.push({
            id: p.id,
            name: p.name,
            updatedAt: new Date(p.modifiedTime).getTime(),
            source: "drive",
          });
        }
      }
    } catch (err) {
      console.warn("Failed to list from Google Drive:", err);
    }
  }

  return results.sort((a, b) => b.updatedAt - a.updatedAt);
}
