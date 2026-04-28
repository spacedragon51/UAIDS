import { Router, type IRouter } from "express";
import { store } from "../lib/store.js";

const router: IRouter = Router();

router.get("/reject-queue", (_req, res) => {
  const items = store.predictionBuffer
    .filter((p) => p.rejected && !p.human_override)
    .sort((a, b) => b.timestamp - a.timestamp);
  res.json({ count: items.length, items });
});

router.post("/review", (req, res) => {
  const prediction_id = (req.body?.prediction_id || "").toString();
  const human_decision = Number(req.body?.human_decision);
  const reviewer_id = (req.body?.reviewer_id || "anonymous").toString();
  if (!prediction_id || (human_decision !== 0 && human_decision !== 1)) {
    return res.status(400).json({ error: "prediction_id and human_decision (0 or 1) required" });
  }
  const rec = store.predictionBuffer.find((p) => p.id === prediction_id);
  if (!rec) return res.status(404).json({ error: "Prediction not found" });
  rec.human_override = { decision: human_decision as 0 | 1, reviewer_id, at: Date.now() };
  rec.true_label = human_decision as 0 | 1;
  store.reviewedQueue.push({ prediction_id, human_decision: human_decision as 0 | 1, reviewer_id, at: Date.now() });
  res.json({ success: true, prediction_id, override: rec.human_override });
});

export default router;
