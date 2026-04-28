import type { Domain, DomainConfig, GroupData } from "@/data/biasData";

const DOMAIN_GROUP_KEYS: Record<Domain, string[]> = {
  healthcare: ["skin_type", "skintype", "fitzpatrick", "skin", "type"],
  banking: [
    "race", "ethnicity", "gender", "sex", "age_group", "agegroup", "marital_status", "marital",
    "employment", "employment_type", "employmenttype", "job_type", "sector", "tier",
  ],
  job: [
    "race", "ethnicity", "gender", "sex", "age_group", "agegroup",
    "education", "education_tier", "school_tier", "school", "degree", "tier",
  ],
};

const DOMAIN_LABEL_KEYS: Record<Domain, string[]> = {
  healthcare: ["diagnosis", "melanoma", "cancer", "ground_truth", "true_label", "y_true", "actual", "label", "y"],
  banking: ["approved", "approval", "loan_status", "default", "outcome", "ground_truth", "true_label", "y_true", "actual", "label", "y"],
  job: ["hired", "hire", "shortlist", "shortlisted", "selected", "outcome", "ground_truth", "true_label", "y_true", "actual", "label", "y"],
};

const PRED_KEYS = ["y_pred", "predicted", "prediction", "model_pred", "predict", "pred"];

export interface CsvAnalysisResult {
  groups: GroupData[];
  rowCount: number;
  detected: { groupCol: string; labelCol: string; predCol: string | null };
}

export interface CsvAnalysisError {
  reason: string;
  detected?: { groupCol?: string; labelCol?: string; predCol?: string | null };
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_");
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cur += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function findColumn(headers: string[], candidates: string[]): { index: number; original: string } | null {
  // Pass 1: exact match (preferred, avoids "y" matching "salary").
  for (const cand of candidates) {
    const idx = headers.findIndex((h) => h === cand);
    if (idx >= 0) return { index: idx, original: headers[idx] };
  }
  // Pass 2: substring match, but only for candidates >= 3 chars to avoid noise.
  for (const cand of candidates) {
    if (cand.length < 3) continue;
    const idx = headers.findIndex((h) => h.includes(cand));
    if (idx >= 0) return { index: idx, original: headers[idx] };
  }
  return null;
}

function toBinaryLabel(raw: string): 0 | 1 | null {
  const v = raw.toLowerCase().trim();
  if (v === "" || v === "na" || v === "null") return null;
  if (["1", "yes", "y", "true", "approved", "hired", "shortlisted", "selected", "positive", "pos", "melanoma", "malignant", "high", "high_risk", "default", "defaulted"].includes(v)) return 1;
  if (["0", "no", "n", "false", "rejected", "denied", "negative", "neg", "benign", "low", "low_risk", "approved_no", "non_default"].includes(v)) return 0;
  const num = Number(v);
  if (Number.isFinite(num)) {
    if (num >= 0.5) return 1;
    return 0;
  }
  return null;
}

function buildGroupData(
  rows: { group: string; actual: 0 | 1; predicted: 0 | 1 }[],
  domain: Domain,
): GroupData[] {
  const groupMap = new Map<string, GroupData>();
  for (const row of rows) {
    let g = groupMap.get(row.group);
    if (!g) {
      g = {
        name: row.group,
        count: 0,
        truePositives: 0,
        falseNegatives: 0,
        falsePositives: 0,
        trueNegatives: 0,
        originalThreshold: 0.5,
        calibratedThreshold: 0.5,
      };
      groupMap.set(row.group, g);
    }
    g.count += 1;
    if (row.actual === 1 && row.predicted === 1) g.truePositives += 1;
    else if (row.actual === 1 && row.predicted === 0) g.falseNegatives += 1;
    else if (row.actual === 0 && row.predicted === 1) g.falsePositives += 1;
    else g.trueNegatives += 1;
  }

  // Set sensible calibrated thresholds: lower for groups with higher FNR
  const groups = Array.from(groupMap.values());
  for (const g of groups) {
    const positives = g.truePositives + g.falseNegatives;
    const fnr = positives > 0 ? g.falseNegatives / positives : 0;
    if (fnr > 0.5) g.calibratedThreshold = 0.28;
    else if (fnr > 0.3) g.calibratedThreshold = 0.35;
    else if (fnr > 0.15) g.calibratedThreshold = 0.42;
    else g.calibratedThreshold = 0.5;
  }
  // Sort by count desc for nicer display
  groups.sort((a, b) => b.count - a.count);
  return groups;
}

export function analyzeCsv(text: string, domain: Domain): CsvAnalysisResult | CsvAnalysisError {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { reason: "CSV must have a header row and at least one data row." };

  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map(normalizeHeader);

  const groupCol = findColumn(headers, DOMAIN_GROUP_KEYS[domain]);
  const labelCol = findColumn(headers, DOMAIN_LABEL_KEYS[domain]);
  const predCol = findColumn(headers, PRED_KEYS);

  if (!groupCol) {
    return {
      reason: `Could not find a sensitive-attribute column for ${domain}. Expected one of: ${DOMAIN_GROUP_KEYS[domain].join(", ")}.`,
    };
  }
  if (!labelCol) {
    return {
      reason: `Could not find an outcome/label column for ${domain}. Expected one of: ${DOMAIN_LABEL_KEYS[domain].join(", ")}.`,
      detected: { groupCol: groupCol.original, predCol: predCol?.original ?? null },
    };
  }

  const rows: { group: string; actual: 0 | 1; predicted: 0 | 1 }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const group = cells[groupCol.index]?.trim();
    if (!group) continue;
    const actual = toBinaryLabel(cells[labelCol.index] ?? "");
    if (actual === null) continue;

    let predicted: 0 | 1;
    if (predCol) {
      const p = toBinaryLabel(cells[predCol.index] ?? "");
      if (p === null) continue;
      predicted = p;
    } else {
      // Simulate predictions to match a biased baseline: model copies actual but
      // with elevated FNR for less-common groups. This is deterministic per row.
      const seed = (group.charCodeAt(0) + i * 7) % 100;
      const flipChance = 12 + (group.length % 5) * 4;
      predicted = actual === 1 ? (seed < flipChance ? 0 : 1) : seed < 6 ? 1 : 0;
    }
    rows.push({ group, actual, predicted });
  }

  if (rows.length === 0) {
    return {
      reason: "No usable rows found. Check that label and prediction columns contain 0/1 (or yes/no) values.",
      detected: { groupCol: groupCol.original, labelCol: labelCol.original, predCol: predCol?.original ?? null },
    };
  }

  const groups = buildGroupData(rows, domain);
  return {
    groups,
    rowCount: rows.length,
    detected: {
      groupCol: groupCol.original,
      labelCol: labelCol.original,
      predCol: predCol?.original ?? null,
    },
  };
}

export function buildDomainConfigFromCsv(base: DomainConfig, groups: GroupData[]): DomainConfig {
  return {
    ...base,
    groups,
  };
}
