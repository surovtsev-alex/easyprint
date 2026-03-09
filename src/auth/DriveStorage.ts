import { getGoogleUser } from "./GoogleAuth";

const APP_FOLDER = "EasyPrint Projects";

async function getHeaders(): Promise<Headers> {
  const user = getGoogleUser();
  if (!user) throw new Error("Not authenticated");
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${user.accessToken}`);
  return headers;
}

async function findOrCreateAppFolder(): Promise<string> {
  const headers = await getHeaders();

  // Search for existing folder
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${APP_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    { headers }
  );
  const searchData = await searchRes.json();

  if (searchData.files?.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      ...Object.fromEntries(headers),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: APP_FOLDER,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  const folder = await createRes.json();
  return folder.id;
}

export async function saveProject(
  projectId: string,
  name: string,
  data: string
): Promise<string> {
  const headers = await getHeaders();
  const folderId = await findOrCreateAppFolder();

  // Check if file already exists
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${projectId}.json' and '${folderId}' in parents and trashed=false`,
    { headers }
  );
  const searchData = await searchRes.json();
  const existingFileId = searchData.files?.[0]?.id;

  const metadata = {
    name: `${projectId}.json`,
    description: name,
    parents: existingFileId ? undefined : [folderId],
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", new Blob([data], { type: "application/json" }));

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

  const method = existingFileId ? "PATCH" : "POST";

  const res = await fetch(url, {
    method,
    headers: { Authorization: (await getHeaders()).get("Authorization")! },
    body: form,
  });

  const result = await res.json();
  return result.id;
}

export async function loadProject(projectId: string): Promise<string | null> {
  const headers = await getHeaders();
  const folderId = await findOrCreateAppFolder();

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${projectId}.json' and '${folderId}' in parents and trashed=false`,
    { headers }
  );
  const searchData = await searchRes.json();
  const fileId = searchData.files?.[0]?.id;

  if (!fileId) return null;

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers }
  );

  return res.text();
}

export async function listProjects(): Promise<
  Array<{ id: string; name: string; modifiedTime: string }>
> {
  const headers = await getHeaders();
  const folderId = await findOrCreateAppFolder();

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,description,modifiedTime)`,
    { headers }
  );
  const data = await res.json();

  return (data.files || []).map((f: Record<string, string>) => ({
    id: f.name?.replace(".json", ""),
    name: f.description || f.name,
    modifiedTime: f.modifiedTime,
  }));
}

export async function deleteProject(projectId: string): Promise<void> {
  const headers = await getHeaders();
  const folderId = await findOrCreateAppFolder();

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${projectId}.json' and '${folderId}' in parents and trashed=false`,
    { headers }
  );
  const searchData = await searchRes.json();
  const fileId = searchData.files?.[0]?.id;

  if (fileId) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers,
    });
  }
}
