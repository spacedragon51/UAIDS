export const HEALTHCARE_SKIN_TYPES = [
  "Type I",
  "Type II",
  "Type III",
  "Type IV",
  "Type V",
  "Type VI",
] as const;

export type SkinType = (typeof HEALTHCARE_SKIN_TYPES)[number];

export interface HealthcarePredictResponse {
  prediction: string;
  confidence: number;
  explanation: string[];
  fairness: {
    FNR: Record<SkinType, number>;
    disparity: number;
    worst_group: string;
  };
  mitigation: string;
  status: string;
  risk_breakdown: Array<{ feature: string; contribution: number }>;
  top_factor: string;
}
