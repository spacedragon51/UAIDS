import { Router, type IRouter } from "express";
import { store } from "../lib/store.js";
import { evaluate } from "../lib/fairness.js";

const router: IRouter = Router();

router.get("/fairness-metrics", (req, res) => {
  if (!store.model?.trained) return res.status(400).json({ error: "Model not trained yet." });
  const axisRaw = (req.query.axis as string) || "ethnicity";
  const axis: "ethnicity" | "gender" | "ageBracket" =
    axisRaw === "gender" ? "gender" : axisRaw === "ageBracket" || axisRaw === "age" ? "ageBracket" : "ethnicity";
  const testRows = store.processed.filter((r) => r.split === "test");
  const rows = testRows.length > 0 ? testRows : store.processed;
  const report = evaluate(store.model, rows, axis);
  res.json({ axis, evaluated_rows: rows.length, ...report, history: store.model.history });
});

export default router;
