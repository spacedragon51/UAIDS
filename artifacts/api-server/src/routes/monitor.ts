import { Router, type IRouter } from "express";
import { store } from "../lib/store.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

interface MonitorMetrics {
  total: number;
  per_group: Array<{
    group: string;
    count: number;
    accuracy: number | null;
    tpr: number;
    fpr: number;
    positive_rate: number;
  }>;
  delta_tpr: number;
  delta_fpr: number;
  alert: string | null;
}

function computeMonitorMetrics(): MonitorMetrics {
  const recent = store.predictionBuffer.slice(-100);
  const byGroup = new Map<string, { count: number; pos: number; tp: number; fp: number; tn: number; fn: number; correct: number; labelled: number }>();
  for (const p of recent) {
    const g = p.ethnicity;
    if (!byGroup.has(g)) byGroup.set(g, { count: 0, pos: 0, tp: 0, fp: 0, tn: 0, fn: 0, correct: 0, labelled: 0 });
    const v = byGroup.get(g)!;
    v.count++;
    if (p.predicted_label === 1) v.pos++;
    if (p.true_label !== undefined) {
      v.labelled++;
      if (p.predicted_label === p.true_label) v.correct++;
      if (p.predicted_label === 1 && p.true_label === 1) v.tp++;
      else if (p.predicted_label === 1 && p.true_label === 0) v.fp++;
      else if (p.predicted_label === 0 && p.true_label === 0) v.tn++;
      else v.fn++;
    }
  }
  const per_group: MonitorMetrics["per_group"] = [];
  const tprs: number[] = [];
  const fprs: number[] = [];
  for (const [group, v] of byGroup.entries()) {
    const tpr = v.tp + v.fn > 0 ? v.tp / (v.tp + v.fn) : 0;
    const fpr = v.fp + v.tn > 0 ? v.fp / (v.fp + v.tn) : 0;
    if (v.labelled > 0) {
      tprs.push(tpr);
      fprs.push(fpr);
    }
    per_group.push({
      group,
      count: v.count,
      accuracy: v.labelled > 0 ? v.correct / v.labelled : null,
      tpr,
      fpr,
      positive_rate: v.count ? v.pos / v.count : 0,
    });
  }
  const delta_tpr = tprs.length >= 2 ? Math.max(...tprs) - Math.min(...tprs) : 0;
  const delta_fpr = fprs.length >= 2 ? Math.max(...fprs) - Math.min(...fprs) : 0;
  let alert: string | null = null;
  if (delta_tpr > 0.05 || delta_fpr > 0.05) {
    const worst = per_group
      .filter((g) => g.accuracy !== null)
      .sort((a, b) => (a.tpr ?? 0) - (b.tpr ?? 0))[0]?.group ?? "unknown";
    alert = `FAIRNESS ALERT: Gap exceeded threshold for group ${worst} (ΔTPR=${(delta_tpr * 100).toFixed(1)}%, ΔFPR=${(delta_fpr * 100).toFixed(1)}%)`;
    logger.warn({ delta_tpr, delta_fpr, worst }, alert);
    store.alerts.push({ at: Date.now(), message: alert });
    if (store.alerts.length > 200) store.alerts.shift();
  }
  return { total: recent.length, per_group, delta_tpr, delta_fpr, alert };
}

// Hourly background job
let monitorTimer: NodeJS.Timeout | null = null;
function startMonitor() {
  if (monitorTimer) return;
  monitorTimer = setInterval(() => {
    if (store.predictionBuffer.length === 0) return;
    const metrics = computeMonitorMetrics();
    store.monitorHistory.push({ at: Date.now(), metrics });
    if (store.monitorHistory.length > 24 * 7) store.monitorHistory.shift();
  }, 60 * 60 * 1000);
}
startMonitor();

router.get("/monitor/fairness", (_req, res) => {
  const current = computeMonitorMetrics();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const week = 7 * day;
  const last24h = store.monitorHistory.filter((h) => now - h.at < day);
  const last7d = store.monitorHistory.filter((h) => now - h.at < week);
  res.json({
    current,
    historical: {
      last_24h: last24h,
      last_7d: last7d,
    },
    recent_alerts: store.alerts.slice(-20),
  });
});

router.post("/monitor/feedback", (req, res) => {
  const prediction_id = (req.body?.prediction_id || "").toString();
  const correct_label = Number(req.body?.correct_label);
  if (!prediction_id || (correct_label !== 0 && correct_label !== 1)) {
    return res.status(400).json({ error: "prediction_id and correct_label (0 or 1) are required." });
  }
  const rec = store.predictionBuffer.find((p) => p.id === prediction_id);
  if (!rec) return res.status(404).json({ error: "Prediction not found" });
  rec.true_label = correct_label as 0 | 1;
  store.feedbackQueue.push({ prediction_id, correct_label: correct_label as 0 | 1, at: Date.now() });
  res.json({ success: true, prediction_id, stored: true });
});

export default router;
