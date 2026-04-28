export type Domain = "healthcare" | "banking" | "job";

export interface DomainConfig {
  id: Domain;
  label: string;
  icon: string;
  sensitiveAttribute: string;
  metricLabel: string;
  groups: GroupData[];
  description: string;
}

export interface GroupData {
  name: string;
  count: number;
  truePositives: number;
  falseNegatives: number;
  falsePositives: number;
  trueNegatives: number;
  originalThreshold: number;
  calibratedThreshold: number;
}

function fnr(g: GroupData) {
  return g.falseNegatives / (g.falseNegatives + g.truePositives);
}

function mitigatedFnr(g: GroupData) {
  // Simulated improvement from threshold calibration
  const raw = fnr(g);
  if (raw > 0.5) return raw * 0.22;
  if (raw > 0.3) return raw * 0.35;
  return raw * 0.7;
}

export function getFNR(g: GroupData) { return fnr(g); }
export function getMitigatedFNR(g: GroupData) { return mitigatedFnr(g); }

export const domains: Record<Domain, DomainConfig> = {
  healthcare: {
    id: "healthcare",
    label: "Healthcare",
    icon: "🏥",
    sensitiveAttribute: "Fitzpatrick Skin Type",
    metricLabel: "False Negative Rate (Missed Diagnoses)",
    description: "Melanoma detection AI shows significant bias against darker skin tones, missing critical cancer diagnoses.",
    groups: [
      // Tuned to align healthcare fairness display with requested FNR profile:
      // Type I–VI => 12%, 15%, 20%, 35%, 60%, 78% (disparity 66%).
      { name: "Type I", count: 350, truePositives: 176, falseNegatives: 24, falsePositives: 20, trueNegatives: 130, originalThreshold: 0.5, calibratedThreshold: 0.5 },
      { name: "Type II", count: 250, truePositives: 102, falseNegatives: 18, falsePositives: 12, trueNegatives: 118, originalThreshold: 0.5, calibratedThreshold: 0.48 },
      { name: "Type III", count: 150, truePositives: 60, falseNegatives: 15, falsePositives: 8, trueNegatives: 67, originalThreshold: 0.5, calibratedThreshold: 0.42 },
      { name: "Type IV", count: 100, truePositives: 26, falseNegatives: 14, falsePositives: 6, trueNegatives: 54, originalThreshold: 0.5, calibratedThreshold: 0.38 },
      { name: "Type V", count: 100, truePositives: 20, falseNegatives: 30, falsePositives: 5, trueNegatives: 45, originalThreshold: 0.5, calibratedThreshold: 0.3 },
      { name: "Type VI", count: 50, truePositives: 11, falseNegatives: 39, falsePositives: 0, trueNegatives: 0, originalThreshold: 0.5, calibratedThreshold: 0.25 },
    ],
  },
  banking: {
    id: "banking",
    label: "Banking",
    icon: "🏦",
    sensitiveAttribute: "Employment Type",
    metricLabel: "False Rejection Rate (Wrongful Denials)",
    description: "Credit approval AI systematically rejects informal sector workers despite comparable repayment capability.",
    groups: [
      { name: "Tier 1 Corporate", count: 400, truePositives: 180, falseNegatives: 10, falsePositives: 12, trueNegatives: 198, originalThreshold: 0.5, calibratedThreshold: 0.5 },
      { name: "Tier 2 SME", count: 300, truePositives: 110, falseNegatives: 30, falsePositives: 8, trueNegatives: 152, originalThreshold: 0.5, calibratedThreshold: 0.43 },
      { name: "Tier 3 Informal", count: 200, truePositives: 15, falseNegatives: 85, falsePositives: 5, trueNegatives: 95, originalThreshold: 0.5, calibratedThreshold: 0.30 },
      { name: "Gig Workers", count: 100, truePositives: 5, falseNegatives: 45, falsePositives: 2, trueNegatives: 48, originalThreshold: 0.5, calibratedThreshold: 0.28 },
    ],
  },
  job: {
    id: "job",
    label: "Job Screening",
    icon: "💼",
    sensitiveAttribute: "Education Type",
    metricLabel: "False Rejection Rate (Qualified but Rejected)",
    description: "Resume screening AI disproportionately favors candidates from elite institutions, rejecting equally qualified applicants.",
    groups: [
      { name: "Ivy/Tier-1", count: 300, truePositives: 135, falseNegatives: 8, falsePositives: 10, trueNegatives: 147, originalThreshold: 0.5, calibratedThreshold: 0.5 },
      { name: "Tier-2 State", count: 300, truePositives: 100, falseNegatives: 35, falsePositives: 7, trueNegatives: 158, originalThreshold: 0.5, calibratedThreshold: 0.42 },
      { name: "Tier-3 Regional", count: 250, truePositives: 30, falseNegatives: 90, falsePositives: 5, trueNegatives: 125, originalThreshold: 0.5, calibratedThreshold: 0.32 },
      { name: "Non-Degree", count: 150, truePositives: 5, falseNegatives: 65, falsePositives: 2, trueNegatives: 78, originalThreshold: 0.5, calibratedThreshold: 0.28 },
    ],
  },
};

export function getTotalSamples(domain: DomainConfig) {
  return domain.groups.reduce((sum, g) => sum + g.count, 0);
}

export function getMinorityRatio(domain: DomainConfig) {
  const total = getTotalSamples(domain);
  // Minority = bottom half of groups by count
  const sorted = [...domain.groups].sort((a, b) => a.count - b.count);
  const minorityCount = sorted.slice(0, Math.ceil(sorted.length / 2)).reduce((s, g) => s + g.count, 0);
  return minorityCount / total;
}

export function getRepresentationData(domain: DomainConfig) {
  return domain.groups.map((g) => ({
    name: g.name,
    value: g.count,
  }));
}

export function getFairnessData(domain: DomainConfig) {
  return domain.groups.map((g) => ({
    name: g.name,
    fnr: +(fnr(g) * 100).toFixed(1),
    mitigatedFnr: +(mitigatedFnr(g) * 100).toFixed(1),
  }));
}
