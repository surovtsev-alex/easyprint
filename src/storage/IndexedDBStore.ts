import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { SerializedProject } from "./types";

interface EasyPrintDB extends DBSchema {
  projects: {
    key: string;
    value: SerializedProject;
    indexes: { "by-updated": number };
  };
}

let db: IDBPDatabase<EasyPrintDB> | null = null;

async function getDB(): Promise<IDBPDatabase<EasyPrintDB>> {
  if (db) return db;

  db = await openDB<EasyPrintDB>("easyprint", 1, {
    upgrade(database) {
      const store = database.createObjectStore("projects", {
        keyPath: "id",
      });
      store.createIndex("by-updated", "updatedAt");
    },
  });

  return db;
}

export async function saveProjectLocal(
  project: SerializedProject
): Promise<void> {
  const database = await getDB();
  await database.put("projects", project);
}

export async function loadProjectLocal(
  projectId: string
): Promise<SerializedProject | undefined> {
  const database = await getDB();
  return database.get("projects", projectId);
}

export async function listProjectsLocal(): Promise<SerializedProject[]> {
  const database = await getDB();
  return database.getAllFromIndex("projects", "by-updated");
}

export async function deleteProjectLocal(projectId: string): Promise<void> {
  const database = await getDB();
  await database.delete("projects", projectId);
}
