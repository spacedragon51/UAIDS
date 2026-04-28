import { Router, type IRouter } from "express";
import { store, type PredictionRecord } from "../lib/store.js";
import { train, predict } from "../lib/model.js";
import { explain } from "../lib/explain.js";
import { detectAttributes } from "../lib/bias.js";
import { tokenize } from "../lib/embedding.js";

const router: IRouter = Router();

router.post("/train", (req, res) => {
  if (store.processed.length === 0) {
    return res.status(400).json({ error: "Run /api/preprocess first." });
  }
  const epochs = Math.min(50, Math.max(1, Number(req.body?.epochs) || 20));
  const summary = store.preprocessSummary as { sensitive_axis?: "ethnicity" | "gender" } | null;
  const axis = summary?.sensitive_axis ?? "ethnicity";
  const model = train(store.processed, axis, { epochs });
  store.model = model;
  res.json({
    success: true,
    trained_at: model.trainedAt,
    version: model.version,
    groups: model.groups,
    epochs_run: model.history.length,
    final: model.history[model.history.length - 1] ?? null,
    history: model.history,
  });
});

function evaluateRejection(text: string, confidence: number, sensitiveGroup: string) {
  const wc = tokenize(text).length;
  if (confidence < 0.6) {
    return { reject: true, reason: `Low confidence (${confidence.toFixed(2)} < 0.6 threshold)` };
  }
  // Underrepresented if predicted group has < 100 samples in training
  const groupCount = store.processed.filter((r) =>
    (store.model?.groupAxis === "ethnicity" ? r.attrs.ethnicity : r.attrs.gender) === sensitiveGroup,
  ).length;
  if (groupCount > 0 && groupCount < 100) {
    return {
      reject: true,
      reason: `Group "${sensitiveGroup}" underrepresented (${groupCount} training samples < 100)`,
    };
  }
  if (wc < 100 || wc > 5000) {
    return { reject: true, reason: `Resume length atypical (${wc} tokens, expected 100–5000)` };
  }
  return { reject: false, reason: null };
}

router.post("/predict", (req, res) => {
  if (!store.model?.trained) return res.status(400).json({ error: "Model not trained yet." });
  const text = (req.body?.resume_text || "").toString();
  if (!text.trim()) return res.status(400).json({ error: "resume_text is required" });
  const name = (req.body?.name || "").toString();
  const gy = Number(req.body?.graduation_year) || new Date().getFullYear() - 4;
  const attrs = detectAttributes({ name, resume_text: text, graduation_year: gy });
  const p = predict(store.model, text);
  const reject = evaluateRejection(text, p.confidence, p.sensitive_group_prediction);
  const id = `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const record: PredictionRecord = {
    id,
    timestamp: Date.now(),
    predicted_label: p.hire_probability >= 0.5 ? 1 : 0,
    predicted_probability: p.hire_probability,
    confidence: p.confidence,
    sensitive_group: p.sensitive_group_prediction,
    ethnicity: attrs.ethnicity,
    gender: attrs.gender,
    age_bracket: attrs.ageBracket,
    rejected: reject.reject,
    reject_reason: reject.reason ?? undefined,
    resume_excerpt: text.slice(0, 240),
  };
  store.pushPrediction(record);
  res.json({
    prediction_id: id,
    prediction: p.hire_probability,
    hire_probability: p.hire_probability,
    confidence: p.confidence,
    sensitive_group_prediction: p.sensitive_group_prediction,
    sensitive_group_probs: p.sensitive_group_probs,
    detected_attributes: attrs,
    reject: reject.reject,
    reject_reason: reject.reason,
    recommendation: reject.reject
      ? "Send to human recruiter for review"
      : "Automatic decision available",
  });
});

router.post("/explain", (req, res) => {
  if (!store.model?.trained) return res.status(400).json({ error: "Model not trained yet." });
  const text = (req.body?.resume_text || "").toString();
  if (!text.trim()) return res.status(400).json({ error: "resume_text is required" });
  const result = explain(store.model, text);
  res.json(result);
});

router.get("/model/status", (_req, res) => {
  if (!store.model) return res.json({ trained: false });
  res.json({
    trained: store.model.trained,
    version: store.model.version,
    trainedAt: store.model.trainedAt,
    groups: store.model.groups,
    history: store.model.history,
  });
});

export default router;
