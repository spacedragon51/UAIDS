import type { SensitiveAttributes } from "./bias.js";

export interface ResumeRow {
  resume_text: string;
  label: number;
  name: string;
  graduation_year: number;
}

export interface ProcessedRow extends ResumeRow {
  id: string;
  attrs: SensitiveAttributes;
  split: "train" | "validation" | "test";
  weight: number;
  synthetic: boolean;
}

export interface PredictionRecord {
  id: string;
  timestamp: number;
  predicted_label: 0 | 1;
  predicted_probability: number;
  confidence: number;
  true_label?: 0 | 1;
  sensitive_group: string;
  ethnicity: string;
  gender: string;
  age_bracket: string;
  rejected: boolean;
  reject_reason?: string;
  human_override?: { decision: 0 | 1; reviewer_id: string; at: number };
  resume_excerpt: string;
}

export interface TrainingHistoryEntry {
  epoch: number;
  loss_main: number;
  loss_adversary: number;
  fairness_gap: number;
  val_accuracy: number;
}

export interface ModelState {
  trained: boolean;
  trainedAt?: number;
  groupAxis: "ethnicity" | "gender";
  groups: string[];
  // weights of feature extractor 384x128
  W1: Float32Array;
  b1: Float32Array;
  // classifier 128x1
  W2: Float32Array;
  b2: number;
  // adversary 128 x G
  Wa: Float32Array;
  ba: Float32Array;
  history: TrainingHistoryEntry[];
  version: string;
}

class Store {
  rawRows: ResumeRow[] = [];
  processed: ProcessedRow[] = [];
  preprocessSummary: unknown = null;
  biasReport: unknown = null;
  model: ModelState | null = null;
  predictionBuffer: PredictionRecord[] = [];
  monitorHistory: Array<{ at: number; metrics: unknown }> = [];
  alerts: Array<{ at: number; message: string }> = [];
  feedbackQueue: Array<{ prediction_id: string; correct_label: 0 | 1; at: number }> = [];
  reviewedQueue: Array<{ prediction_id: string; human_decision: 0 | 1; reviewer_id: string; at: number }> = [];
  certificates: Array<{ id: string; issuedAt: number; expiresAt: number; payload: unknown }> = [];

  pushPrediction(p: PredictionRecord) {
    this.predictionBuffer.push(p);
    if (this.predictionBuffer.length > 500) this.predictionBuffer.shift();
  }
}

export const store = new Store();
