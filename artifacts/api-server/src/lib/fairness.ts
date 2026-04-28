// Fairness metric calculations.

import { embed } from "./embedding.js";
import { forward } from "./model.js";
import type { ModelState, ProcessedRow } from "./store.js";

export interface GroupMetrics {
  group: string;
  count: number;
  positives: number;
  negatives: number;
  accuracy: number;
  tpr: number;
  fpr: number;
  precision: number;
  positive_rate: number;
  auc: number;
  confusion: { tp: number; fp: number; tn: number; fn: number };
}

export interface FairnessReport {
  per_group: GroupMetrics[];
  demographic_parity_diff: number;
  equal_opportunity_diff: number;
  disparate_impact_ratio: number;
  verdict: "FAIR" | "NEEDS IMPROVEMENT";
  reasons: string[];
}

function auc(scores: number[], labels: number[]): number {
  if (scores.length === 0) return 0.5;
  const paired = scores.map((s, i) => ({ s, l: labels[i]! }))
    .sort((a, b) => a.s - b.s);
  let pos = 0, neg = 0, posSum = 0;
  paired.forEach((p, i) => {
    if (p.l === 1) {
      pos++;
      posSum += i + 1;
    } else neg++;
  });
  if (pos === 0 || neg === 0) return 0.5;
  return (posSum - (pos * (pos + 1)) / 2) / (pos * neg);
}

export function evaluate(
  model: ModelState,
  rows: ProcessedRow[],
  groupAxis: "ethnicity" | "gender" | "ageBracket" = "ethnicity",
): FairnessReport {
  const byGroup = new Map<string, { scores: number[]; preds: number[]; labels: number[] }>();
  for (const r of rows) {
    const x = embed(r.resume_text);
    const fwd = forward(model, x);
    const pred = fwd.pHire >= 0.5 ? 1 : 0;
    const g =
      groupAxis === "ethnicity" ? r.attrs.ethnicity :
      groupAxis === "gender" ? r.attrs.gender :
      r.attrs.ageBracket;
    if (!byGroup.has(g)) byGroup.set(g, { scores: [], preds: [], labels: [] });
    const b = byGroup.get(g)!;
    b.scores.push(fwd.pHire);
    b.preds.push(pred);
    b.labels.push(r.label);
  }
  const per_group: GroupMetrics[] = [];
  for (const [g, b] of byGroup.entries()) {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    let pos = 0, neg = 0;
    for (let i = 0; i < b.preds.length; i++) {
      const p = b.preds[i]!, l = b.labels[i]!;
      if (l === 1) pos++; else neg++;
      if (p === 1 && l === 1) tp++;
      else if (p === 1 && l === 0) fp++;
      else if (p === 0 && l === 0) tn++;
      else fn++;
    }
    const total = b.preds.length || 1;
    per_group.push({
      group: g,
      count: total,
      positives: pos,
      negatives: neg,
      accuracy: (tp + tn) / total,
      tpr: pos > 0 ? tp / pos : 0,
      fpr: neg > 0 ? fp / neg : 0,
      precision: (tp + fp) > 0 ? tp / (tp + fp) : 0,
      positive_rate: (tp + fp) / total,
      auc: auc(b.scores, b.labels),
      confusion: { tp, fp, tn, fn },
    });
  }
  per_group.sort((a, b) => b.count - a.count);
  const posRates = per_group.map((g) => g.positive_rate).filter((v) => Number.isFinite(v));
  const tprs = per_group.map((g) => g.tpr).filter((v) => Number.isFinite(v));
  const dp_diff = posRates.length >= 2 ? Math.max(...posRates) - Math.min(...posRates) : 0;
  const eo_diff = tprs.length >= 2 ? Math.max(...tprs) - Math.min(...tprs) : 0;
  const privileged = posRates.length ? Math.max(...posRates) : 1;
  const di_ratio = privileged > 0 && posRates.length ? Math.min(...posRates) / privileged : 1;

  const reasons: string[] = [];
  if (dp_diff >= 0.05) reasons.push(`Demographic parity gap ${(dp_diff * 100).toFixed(1)}% exceeds 5%`);
  if (eo_diff >= 0.05) reasons.push(`Equal opportunity gap ${(eo_diff * 100).toFixed(1)}% exceeds 5%`);
  if (di_ratio < 0.8) reasons.push(`Disparate impact ratio ${di_ratio.toFixed(2)} below 0.8 (4/5ths rule)`);
  const verdict: "FAIR" | "NEEDS IMPROVEMENT" = reasons.length === 0 ? "FAIR" : "NEEDS IMPROVEMENT";

  return {
    per_group,
    demographic_parity_diff: dp_diff,
    equal_opportunity_diff: eo_diff,
    disparate_impact_ratio: di_ratio,
    verdict,
    reasons,
  };
}
