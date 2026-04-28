const API_BASE = "/api";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  if (!res.ok) {
    const message = parsed && typeof parsed === "object" && parsed && "error" in parsed
      ? String((parsed as { error: unknown }).error)
      : `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return parsed as T;
}

export interface PerToneMetric {
  skin_tone: string;
  count: number;
  positives: number;
  true_positives: number;
  false_negatives: number;
  false_positives: number;
  true_negatives: number;
  fnr: number;
  tpr: number;
  selection_rate: number;
}

export interface ClinicalAnalysis {
  dataset_name: string;
  uploaded_at: number;
  total_rows: number;
  total_images: number;
  per_tone: PerToneMetric[];
  fnr_parity_gap: number;
  equal_opportunity_diff: number;
  worst_group: string;
  worst_group_fnr: number;
  best_group: string;
  best_group_fnr: number;
  severity: "Pass" | "Warning" | "Critical";
  flagged_filenames: string[];
}

export interface UploadBatchResponse {
  success: true;
  mapping_csv: string;
  images_extracted: number;
  analysis: ClinicalAnalysis;
}

export interface SummaryResponse {
  source: "gemini" | "fallback";
  summary: string;
  remediations: string[];
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  dataset_name: string;
  severity: ClinicalAnalysis["severity"];
  fnr_parity_score: number;
  timestamp: number;
}

export const clinicalApi = {
  uploadBatch: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return jsonFetch<UploadBatchResponse>(`${API_BASE}/clinical/upload-batch`, { method: "POST", body: fd });
  },
  analysis: () => jsonFetch<ClinicalAnalysis>(`${API_BASE}/clinical/analysis`),
  summary: () => jsonFetch<SummaryResponse>(`${API_BASE}/clinical/generate-summary`, { method: "POST" }),
  auditLogs: () => jsonFetch<{ count: number; entries: AuditLogEntry[] }>(`${API_BASE}/clinical/audit-logs`),
  imageUrl: (filename: string) => `${API_BASE}/clinical/image/${encodeURIComponent(filename)}`,
};
