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

export interface AuditLogEntry {
  id: string;
  user_id: string;
  dataset_name: string;
  severity: ClinicalAnalysis["severity"];
  fnr_parity_score: number;
  timestamp: number;
}

class ClinicalStore {
  lastAnalysis: ClinicalAnalysis | null = null;
  imageBuffers: Map<string, { buffer: Buffer; mime: string }> = new Map();
  auditLogs: AuditLogEntry[] = [];
  lastSummary: { summary: string; remediations: string[]; generated_at: number } | null = null;
}

export const clinicalStore = new ClinicalStore();
