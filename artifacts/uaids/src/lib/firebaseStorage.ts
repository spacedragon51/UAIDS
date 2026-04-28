import {
  ref,
  uploadBytes,
  listAll,
  getDownloadURL,
  getMetadata,
  deleteObject,
} from "firebase/storage";
import { storage, firebaseConfigured } from "./firebase";

export interface SavedDataset {
  name: string;
  fullPath: string;
  size: number;
  uploadedAt: string;
  downloadURL: string;
}

function datasetsPath(uid: string): string {
  return `users/${uid}/datasets`;
}

export async function uploadDataset(
  uid: string,
  file: File,
): Promise<SavedDataset> {
  if (!firebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const stamped = `${Date.now()}_${safeName}`;
  const r = ref(storage, `${datasetsPath(uid)}/${stamped}`);
  const snap = await uploadBytes(r, file, { contentType: "text/csv" });
  const [downloadURL, meta] = await Promise.all([
    getDownloadURL(snap.ref),
    getMetadata(snap.ref),
  ]);
  return {
    name: stamped,
    fullPath: snap.ref.fullPath,
    size: meta.size ?? file.size,
    uploadedAt: meta.timeCreated ?? new Date().toISOString(),
    downloadURL,
  };
}

export async function listDatasets(uid: string): Promise<SavedDataset[]> {
  if (!firebaseConfigured) return [];
  const r = ref(storage, datasetsPath(uid));
  const res = await listAll(r);
  const items = await Promise.all(
    res.items.map(async (item) => {
      const [url, meta] = await Promise.all([
        getDownloadURL(item),
        getMetadata(item),
      ]);
      return {
        name: item.name,
        fullPath: item.fullPath,
        size: meta.size ?? 0,
        uploadedAt: meta.timeCreated ?? "",
        downloadURL: url,
      } satisfies SavedDataset;
    }),
  );
  items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  return items;
}

export async function deleteDataset(fullPath: string): Promise<void> {
  if (!firebaseConfigured) return;
  await deleteObject(ref(storage, fullPath));
}

export async function fetchDatasetAsFile(
  url: string,
  filename: string,
): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch dataset (${res.status})`);
  const blob = await res.blob();
  return new File([blob], filename, { type: "text/csv" });
}
