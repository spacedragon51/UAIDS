const API_BASE = "/api";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  if (!res.ok) {
    const message = (parsed && typeof parsed === "object" && parsed && "error" in parsed)
      ? String((parsed as { error: unknown }).error)
      : `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return parsed as T;
}

export interface BiasReport {
  total: number;
  ethnicity: Array<{ group: string; count: number; percentage: number; underrepresented: boolean }>;
  gender: Array<{ group: string; count: number; percentage: number; underrepresented: boolean }>;
  age: Array<{ group: string; count: number; percentage: number; underrepresented: boolean }>;
  underrepresented_groups: string[];
  label_distribution: { hire: number; reject: number };
  per_group_hire_rate: Array<{ group: string; axis: string; hire_rate: number; count: number }>;
}

export interface UploadResponse {
  success: boolean;
  filename: string;
  rows_loaded: number;
  bias_report: BiasReport;
}

export interface DatasetStatus {
  uploaded: boolean;
  rows: number;
  preprocessed: boolean;
  trained: boolean;
}

export interface PreprocessSummary {
  sensitive_axis: "ethnicity" | "gender";
  total_samples: number;
  augmented_samples: number;
  split_stats: {
    byEthnicity: { train: Record<string, number>; validation: Record<string, number>; test: Record<string, number> };
    byGender: { train: Record<string, number>; validation: Record<string, number>; test: Record<string, number> };
  };
  weight_distribution: Array<{ group: string; weight: number; count: number }>;
}

export interface TrainResponse {
  success: boolean;
  trained_at: number;
  version: string;
  groups: string[];
  epochs_run: number;
  final: { epoch: number; loss_main: number; loss_adversary: number; fairness_gap: number; val_accuracy: number } | null;
  history: Array<{ epoch: number; loss_main: number; loss_adversary: number; fairness_gap: number; val_accuracy: number }>;
}

export interface FairnessReport {
  axis: string;
  evaluated_rows: number;
  per_group: Array<{
    group: string;
    count: number;
    accuracy: number;
    tpr: number;
    fpr: number;
    precision: number;
    positive_rate: number;
    auc: number;
    confusion: { tp: number; fp: number; tn: number; fn: number };
  }>;
  demographic_parity_diff: number;
  equal_opportunity_diff: number;
  disparate_impact_ratio: number;
  verdict: "FAIR" | "NEEDS IMPROVEMENT";
  reasons: string[];
  history: Array<{ epoch: number; loss_main: number; loss_adversary: number; fairness_gap: number; val_accuracy: number }>;
}

export interface PredictResponse {
  prediction_id: string;
  prediction: number;
  hire_probability: number;
  confidence: number;
  sensitive_group_prediction: string;
  sensitive_group_probs: Record<string, number>;
  detected_attributes: { ethnicity: string; gender: string; age: number; ageBracket: string };
  reject: boolean;
  reject_reason: string | null;
  recommendation: string;
}

export interface ExplainResponse {
  hire_probability: number;
  tokens: Array<{ token: string; importance: number; index: number }>;
  top_tokens: Array<{ token: string; importance: number; index: number }>;
}

export interface MonitorResponse {
  current: {
    total: number;
    per_group: Array<{ group: string; count: number; accuracy: number | null; tpr: number; fpr: number; positive_rate: number }>;
    delta_tpr: number;
    delta_fpr: number;
    alert: string | null;
  };
  historical: { last_24h: Array<unknown>; last_7d: Array<unknown> };
  recent_alerts: Array<{ at: number; message: string }>;
}

export interface RejectQueueResponse {
  count: number;
  items: Array<{
    id: string;
    timestamp: number;
    predicted_label: number;
    predicted_probability: number;
    confidence: number;
    sensitive_group: string;
    ethnicity: string;
    gender: string;
    age_bracket: string;
    reject_reason?: string;
    resume_excerpt: string;
  }>;
}

export const api = {
  status: () => jsonFetch<DatasetStatus>(`${API_BASE}/dataset/status`),
  seedSample: () => jsonFetch<UploadResponse>(`${API_BASE}/seed-sample`, { method: "POST" }),
  uploadDataset: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return jsonFetch<UploadResponse>(`${API_BASE}/upload-dataset`, { method: "POST", body: fd });
  },
  biasReport: () => jsonFetch<BiasReport>(`${API_BASE}/bias-report`),
  preprocess: (axis: "ethnicity" | "gender") =>
    jsonFetch<PreprocessSummary>(`${API_BASE}/preprocess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sensitive_axis: axis }),
    }),
  preprocessSummary: () => jsonFetch<PreprocessSummary>(`${API_BASE}/preprocess`),
  train: (epochs?: number) =>
    jsonFetch<TrainResponse>(`${API_BASE}/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epochs }),
    }),
  modelStatus: () => jsonFetch<{ trained: boolean; version?: string; groups?: string[]; trainedAt?: number; history?: TrainResponse["history"] }>(`${API_BASE}/model/status`),
  fairness: (axis: "ethnicity" | "gender" | "ageBracket") =>
    jsonFetch<FairnessReport>(`${API_BASE}/fairness-metrics?axis=${axis}`),
  predict: (resume_text: string, name?: string, graduation_year?: number) =>
    jsonFetch<PredictResponse>(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_text, name, graduation_year }),
    }),
  explain: (resume_text: string) =>
    jsonFetch<ExplainResponse>(`${API_BASE}/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_text }),
    }),
  monitor: () => jsonFetch<MonitorResponse>(`${API_BASE}/monitor/fairness`),
  feedback: (prediction_id: string, correct_label: 0 | 1) =>
    jsonFetch<{ success: boolean }>(`${API_BASE}/monitor/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prediction_id, correct_label }),
    }),
  rejectQueue: () => jsonFetch<RejectQueueResponse>(`${API_BASE}/reject-queue`),
  review: (prediction_id: string, human_decision: 0 | 1, reviewer_id: string) =>
    jsonFetch<{ success: boolean }>(`${API_BASE}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prediction_id, human_decision, reviewer_id }),
    }),
  eeocReport: () => jsonFetch<unknown>(`${API_BASE}/compliance/eeoc-report`, { method: "POST" }),
  auditLog: () => jsonFetch<{ window_days: number; total: number; entries: Array<Record<string, unknown>> }>(`${API_BASE}/compliance/audit-log`),
  certificate: () => jsonFetch<unknown>(`${API_BASE}/compliance/certificate`, { method: "POST" }),
  sampleCsvUrl: `${API_BASE}/sample-dataset.csv`,
};
