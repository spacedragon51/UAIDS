import { Router, type IRouter, type Request } from "express";
import multer from "multer";
import Papa from "papaparse";
import { store, type ResumeRow } from "../lib/store.js";
import { buildBiasReport } from "../lib/biasReport.js";
import { preprocess } from "../lib/preprocess.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

interface MulterRequest extends Request {
  file?: { buffer: Buffer; originalname: string; mimetype: string; size: number };
}

router.post("/upload-dataset", upload.single("file"), (req, res) => {
  const r = req as MulterRequest;
  try {
    if (!r.file) {
      return res.status(400).json({ error: "No file uploaded. Send a CSV under field name 'file'." });
    }
    const csvText = r.file.buffer.toString("utf-8");
    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
    });
    if (parsed.errors && parsed.errors.length > 0) {
      r.log?.warn({ errors: parsed.errors.slice(0, 3) }, "CSV parse warnings");
    }
    const required = ["resume_text", "label", "name", "graduation_year"];
    const headers = parsed.meta.fields || [];
    const missing = required.filter((c) => !headers.includes(c));
    if (missing.length > 0) {
      return res.status(400).json({
        error: `CSV missing required columns: ${missing.join(", ")}`,
        expected_columns: required,
        found_columns: headers,
      });
    }
    const rows: ResumeRow[] = [];
    for (const row of parsed.data) {
      const resume_text = (row["resume_text"] || "").toString();
      const labelStr = (row["label"] ?? "").toString().trim();
      const label = labelStr === "1" ? 1 : labelStr === "0" ? 0 : NaN;
      const name = (row["name"] || "").toString();
      const gyStr = (row["graduation_year"] || "").toString();
      const gy = parseInt(gyStr, 10);
      if (!resume_text || !Number.isFinite(label) || !Number.isFinite(gy)) continue;
      rows.push({ resume_text, label, name, graduation_year: gy });
    }
    if (rows.length === 0) {
      return res.status(400).json({ error: "No valid rows found in CSV." });
    }
    store.rawRows = rows;
    store.processed = [];
    store.preprocessSummary = null;
    store.model = null;
    store.predictionBuffer = [];
    const biasReport = buildBiasReport(rows);
    store.biasReport = biasReport;
    res.json({
      success: true,
      filename: r.file.originalname,
      rows_loaded: rows.length,
      bias_report: biasReport,
      dashboard_url: "/dashboard/bias",
    });
  } catch (e) {
    r.log?.error({ err: e }, "upload-dataset failed");
    res.status(500).json({ error: e instanceof Error ? e.message : "Upload failed" });
  }
});

router.get("/bias-report", (_req, res) => {
  if (!store.biasReport) return res.status(404).json({ error: "No dataset uploaded yet." });
  res.json(store.biasReport);
});

router.post("/preprocess", (req, res) => {
  if (store.rawRows.length === 0) {
    return res.status(400).json({ error: "Upload a dataset first via /api/upload-dataset" });
  }
  const axis = (req.body?.sensitive_axis === "gender" ? "gender" : "ethnicity") as
    | "ethnicity"
    | "gender";
  const result = preprocess(store.rawRows, axis);
  store.processed = result.rows;
  store.preprocessSummary = {
    sensitive_axis: axis,
    total_samples: result.totalSamples,
    augmented_samples: result.augmentedSamples,
    split_stats: result.splitStats,
    weight_distribution: result.weightDistribution,
  };
  res.json(store.preprocessSummary);
});

router.get("/preprocess", (_req, res) => {
  if (!store.preprocessSummary) return res.status(404).json({ error: "Preprocess not run yet." });
  res.json(store.preprocessSummary);
});

router.get("/dataset/status", (_req, res) => {
  res.json({
    uploaded: store.rawRows.length > 0,
    rows: store.rawRows.length,
    preprocessed: store.processed.length > 0,
    trained: !!store.model?.trained,
  });
});

export default router;
