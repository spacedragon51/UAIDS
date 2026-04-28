import type { ClinicalAnalysis, PerToneMetric } from "./clinicalStore.js";

export interface MappingRow {
  filename: string;
  true_label: string;
  predicted_label: string;
  skin_tone: string;
}

const POSITIVE_TOKENS = new Set([
  "1",
  "true",
  "malignant",
  "positive",
  "pos",
  "yes",
  "cancer",
  "melanoma",
]);

function isPositive(value: string): boolean {
  return POSITIVE_TOKENS.has((value ?? "").toString().trim().toLowerCase());
}

export function analyzeMapping(
  rows: MappingRow[],
  totalImages: number,
  datasetName: string,
): ClinicalAnalysis {
  const buckets = new Map<string, { rows: MappingRow[]; tp: number; fn: number; fp: number; tn: number }>();
  for (const row of rows) {
    const tone = (row.skin_tone || "Unknown").toString().trim() || "Unknown";
    const truth = isPositive(row.true_label);
    const pred = isPositive(row.predicted_label);
    const b = buckets.get(tone) ?? { rows: [], tp: 0, fn: 0, fp: 0, tn: 0 };
    b.rows.push(row);
    if (truth && pred) b.tp += 1;
    else if (truth && !pred) b.fn += 1;
    else if (!truth && pred) b.fp += 1;
    else b.tn += 1;
    buckets.set(tone, b);
  }

  const per_tone: PerToneMetric[] = Array.from(buckets.entries()).map(([skin_tone, b]) => {
    const positives = b.tp + b.fn;
    const fnr = positives > 0 ? b.fn / positives : 0;
    const tpr = positives > 0 ? b.tp / positives : 0;
    const count = b.rows.length;
    const selection_rate = count > 0 ? (b.tp + b.fp) / count : 0;
    return {
      skin_tone,
      count,
      positives,
      true_positives: b.tp,
      false_negatives: b.fn,
      false_positives: b.fp,
      true_negatives: b.tn,
      fnr,
      tpr,
      selection_rate,
    };
  });

  per_tone.sort((a, b) => a.skin_tone.localeCompare(b.skin_tone));

  const tonesWithPositives = per_tone.filter((t) => t.positives > 0);
  const baseList = tonesWithPositives.length > 0 ? tonesWithPositives : per_tone;

  let worst = baseList[0];
  let best = baseList[0];
  for (const t of baseList) {
    if (t.fnr > worst.fnr) worst = t;
    if (t.fnr < best.fnr) best = t;
  }
  const fnr_parity_gap = (worst?.fnr ?? 0) - (best?.fnr ?? 0);
  const equal_opportunity_diff = (best?.tpr ?? 0) - (worst?.tpr ?? 0);

  let severity: ClinicalAnalysis["severity"] = "Pass";
  if (fnr_parity_gap >= 0.2) severity = "Critical";
  else if (fnr_parity_gap >= 0.1) severity = "Warning";

  const flagged_filenames = worst
    ? rows
        .filter(
          (r) =>
            (r.skin_tone || "Unknown").toString().trim() === worst.skin_tone &&
            isPositive(r.true_label) &&
            !isPositive(r.predicted_label),
        )
        .map((r) => r.filename)
    : [];

  return {
    dataset_name: datasetName,
    uploaded_at: Date.now(),
    total_rows: rows.length,
    total_images: totalImages,
    per_tone,
    fnr_parity_gap,
    equal_opportunity_diff,
    worst_group: worst?.skin_tone ?? "n/a",
    worst_group_fnr: worst?.fnr ?? 0,
    best_group: best?.skin_tone ?? "n/a",
    best_group_fnr: best?.fnr ?? 0,
    severity,
    flagged_filenames,
  };
}

export function buildFallbackSummary(a: ClinicalAnalysis): {
  summary: string;
  remediations: string[];
} {
  const gapPct = (a.fnr_parity_gap * 100).toFixed(1);
  const eodPct = (a.equal_opportunity_diff * 100).toFixed(1);
  const worstPct = (a.worst_group_fnr * 100).toFixed(1);
  const summary = [
    `Severity is ${a.severity} with a False Negative Rate parity gap of ${gapPct}% across skin tones, meaning some patients are missed far more often than others.`,
    `The most disadvantaged group is "${a.worst_group}" with a missed-diagnosis rate of ${worstPct}%, ${a.flagged_filenames.length} of those misses flagged for clinical review.`,
    `Equal Opportunity Difference is ${eodPct}%, indicating uneven true-positive recall that should be addressed before clinical deployment.`,
  ].join(" ");
  const remediations = [
    `Rebalance training data and apply targeted augmentation for "${a.worst_group}" cases to lift recall on this skin tone.`,
    "Calibrate per-group decision thresholds and re-evaluate FNR parity to bring the gap below 10% before release.",
    "Route the flagged false-negative cases to a dermatologist review queue and use the corrected labels to fine-tune the model.",
  ];
  return { summary, remediations };
}
