import { Router, type IRouter, type Request } from "express";
import multer from "multer";
import Papa from "papaparse";
import JSZip from "jszip";
import { randomUUID } from "node:crypto";
import { clinicalStore } from "../lib/clinicalStore.js";
import { analyzeMapping, buildFallbackSummary, type MappingRow } from "../lib/clinicalAnalysis.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

interface MulterRequest extends Request {
  file?: { buffer: Buffer; originalname: string; mimetype: string; size: number };
}

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tif", ".tiff"]);
const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".webp": "image/webp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
};

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

function basename(path: string): string {
  const norm = path.replace(/\\/g, "/");
  const slash = norm.lastIndexOf("/");
  return slash === -1 ? norm : norm.slice(slash + 1);
}

router.post("/clinical/upload-batch", upload.single("file"), async (req, res) => {
  const r = req as MulterRequest;
  try {
    if (!r.file) {
      return res.status(400).json({ error: "No file uploaded. Send a .zip under field name 'file'." });
    }
    const lowerName = r.file.originalname.toLowerCase();
    if (!lowerName.endsWith(".zip")) {
      return res.status(400).json({ error: "File must be a .zip archive." });
    }

    const zip = await JSZip.loadAsync(r.file.buffer);
    const imageBuffers = new Map<string, { buffer: Buffer; mime: string }>();
    let csvText: string | null = null;
    let csvSourceName = "";

    const entries = Object.values(zip.files);
    for (const entry of entries) {
      if (entry.dir) continue;
      const base = basename(entry.name);
      if (!base || base.startsWith(".") || base.startsWith("__MACOSX")) continue;
      const ext = extOf(base);
      if (ext === ".csv") {
        if (!csvText) {
          csvText = await entry.async("string");
          csvSourceName = base;
        }
      } else if (IMAGE_EXTENSIONS.has(ext)) {
        const buf = await entry.async("nodebuffer");
        imageBuffers.set(base, { buffer: buf, mime: MIME_BY_EXT[ext] || "application/octet-stream" });
      }
    }

    if (!csvText) {
      return res.status(400).json({ error: "ZIP must contain a mapping CSV file." });
    }

    const parsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
    });
    const required = ["filename", "true_label", "predicted_label", "skin_tone"];
    const headers = parsed.meta.fields || [];
    const missing = required.filter((c) => !headers.includes(c));
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Mapping CSV missing required columns: ${missing.join(", ")}`,
        expected_columns: required,
        found_columns: headers,
      });
    }
    const rows: MappingRow[] = [];
    for (const row of parsed.data) {
      const filename = (row["filename"] || "").toString().trim();
      const true_label = (row["true_label"] || "").toString().trim();
      const predicted_label = (row["predicted_label"] || "").toString().trim();
      const skin_tone = (row["skin_tone"] || "").toString().trim();
      if (!filename) continue;
      rows.push({ filename: basename(filename), true_label, predicted_label, skin_tone });
    }
    if (rows.length === 0) {
      return res.status(400).json({ error: "Mapping CSV had no usable rows." });
    }

    const datasetName = r.file.originalname.replace(/\.zip$/i, "") || "dataset";
    const analysis = analyzeMapping(rows, imageBuffers.size, datasetName);

    clinicalStore.lastAnalysis = analysis;
    clinicalStore.imageBuffers = imageBuffers;
    clinicalStore.lastSummary = null;

    const userId = (req.headers["x-user-id"] as string | undefined) ?? "anonymous";
    clinicalStore.auditLogs.unshift({
      id: randomUUID(),
      user_id: userId,
      dataset_name: datasetName,
      severity: analysis.severity,
      fnr_parity_score: analysis.fnr_parity_gap,
      timestamp: Date.now(),
    });
    if (clinicalStore.auditLogs.length > 200) clinicalStore.auditLogs.length = 200;

    return res.json({
      success: true,
      mapping_csv: csvSourceName,
      images_extracted: imageBuffers.size,
      analysis,
    });
  } catch (err) {
    r.log?.error({ err }, "clinical upload failed");
    return res.status(500).json({ error: err instanceof Error ? err.message : "Upload failed" });
  }
});

router.get("/clinical/analysis", (_req, res) => {
  if (!clinicalStore.lastAnalysis) {
    return res.status(404).json({ error: "No analysis available. Upload a batch first." });
  }
  res.json(clinicalStore.lastAnalysis);
});

router.get("/clinical/audit-logs", (_req, res) => {
  res.json({ count: clinicalStore.auditLogs.length, entries: clinicalStore.auditLogs });
});

router.get("/clinical/image/:filename", (req, res) => {
  const name = basename(req.params.filename);
  const found = clinicalStore.imageBuffers.get(name);
  if (!found) return res.status(404).send("Not found");
  res.setHeader("Content-Type", found.mime);
  res.setHeader("Cache-Control", "no-store");
  res.send(found.buffer);
});

router.post("/clinical/generate-summary", async (req, res) => {
  const analysis = clinicalStore.lastAnalysis;
  if (!analysis) {
    return res.status(404).json({ error: "No analysis available. Upload a batch first." });
  }
  const apiKey = process.env["VITE_GOOGLE_API_KEY"] || process.env["GOOGLE_API_KEY"] || "";

  const fallback = buildFallbackSummary(analysis);

  if (!apiKey) {
    clinicalStore.lastSummary = { ...fallback, generated_at: Date.now() };
    return res.json({ source: "fallback", ...fallback });
  }

  const prompt = `You are a clinical AI fairness auditor. Given the following bias metrics for a dermoscopy melanoma classifier, write:
1) A 3-sentence plain-English clinical summary aimed at a hospital quality committee.
2) Exactly 3 ranked remediation actions (most important first), each one sentence.

Return STRICT JSON with this shape:
{"summary": "...", "remediations": ["...", "...", "..."]}

Metrics:
- Severity: ${analysis.severity}
- FNR parity gap (max - min false-negative rate): ${(analysis.fnr_parity_gap * 100).toFixed(2)}%
- Equal Opportunity Difference: ${(analysis.equal_opportunity_diff * 100).toFixed(2)}%
- Worst skin tone group: ${analysis.worst_group} (FNR ${(analysis.worst_group_fnr * 100).toFixed(2)}%)
- Best skin tone group: ${analysis.best_group} (FNR ${(analysis.best_group_fnr * 100).toFixed(2)}%)
- Per-tone breakdown: ${JSON.stringify(
    analysis.per_tone.map((t) => ({
      skin_tone: t.skin_tone,
      n: t.count,
      fnr: Number(t.fnr.toFixed(3)),
      tpr: Number(t.tpr.toFixed(3)),
    })),
  )}
- Flagged missed-diagnosis cases in worst group: ${analysis.flagged_filenames.length}`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
        }),
      },
    );
    if (!resp.ok) {
      const text = await resp.text();
      req.log?.warn({ status: resp.status, text: text.slice(0, 200) }, "Gemini call failed, using fallback");
      clinicalStore.lastSummary = { ...fallback, generated_at: Date.now() };
      return res.json({ source: "fallback", ...fallback });
    }
    const data = (await resp.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    let parsedOut: { summary?: string; remediations?: string[] } = {};
    try {
      parsedOut = JSON.parse(text);
    } catch {
      parsedOut = {};
    }
    const out = {
      summary: parsedOut.summary || fallback.summary,
      remediations:
        Array.isArray(parsedOut.remediations) && parsedOut.remediations.length > 0
          ? parsedOut.remediations.slice(0, 3)
          : fallback.remediations,
    };
    clinicalStore.lastSummary = { ...out, generated_at: Date.now() };
    return res.json({ source: "gemini", ...out });
  } catch (err) {
    req.log?.warn({ err }, "Gemini request errored, using fallback");
    clinicalStore.lastSummary = { ...fallback, generated_at: Date.now() };
    return res.json({ source: "fallback", ...fallback });
  }
});

export default router;
