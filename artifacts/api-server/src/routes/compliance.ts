import { Router, type IRouter } from "express";
import { store } from "../lib/store.js";
import { evaluate } from "../lib/fairness.js";
import { buildBiasReport } from "../lib/biasReport.js";

const router: IRouter = Router();

router.post("/compliance/eeoc-report", (_req, res) => {
  if (!store.model?.trained) return res.status(400).json({ error: "Model not trained yet." });
  const composition = store.biasReport ?? buildBiasReport(store.rawRows);
  const testRows = store.processed.filter((r) => r.split === "test");
  const eth = evaluate(store.model, testRows.length ? testRows : store.processed, "ethnicity");
  const gen = evaluate(store.model, testRows.length ? testRows : store.processed, "gender");
  const age = evaluate(store.model, testRows.length ? testRows : store.processed, "ageBracket");
  const fourFifths = eth.disparate_impact_ratio >= 0.8 && gen.disparate_impact_ratio >= 0.8;
  res.json({
    report_type: "EEOC Disparate Impact Report",
    generated_at: new Date().toISOString(),
    model_version: store.model.version,
    digital_signature: `SHA-FAIRHIRE-${store.model.version}-${Date.now().toString(36)}`,
    dataset_composition: composition,
    per_group_performance: {
      ethnicity: eth.per_group,
      gender: gen.per_group,
      age: age.per_group,
    },
    fairness_gaps: {
      ethnicity: {
        demographic_parity_diff: eth.demographic_parity_diff,
        equal_opportunity_diff: eth.equal_opportunity_diff,
        disparate_impact_ratio: eth.disparate_impact_ratio,
      },
      gender: {
        demographic_parity_diff: gen.demographic_parity_diff,
        equal_opportunity_diff: gen.equal_opportunity_diff,
        disparate_impact_ratio: gen.disparate_impact_ratio,
      },
    },
    meets_four_fifths_rule: fourFifths,
    verdict: fourFifths && eth.verdict === "FAIR" && gen.verdict === "FAIR"
      ? "COMPLIANT"
      : "REVIEW REQUIRED",
  });
});

router.get("/compliance/audit-log", (_req, res) => {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const entries = store.predictionBuffer
    .filter((p) => p.timestamp >= cutoff)
    .map((p) => ({
      timestamp: new Date(p.timestamp).toISOString(),
      sensitive_group_predicted: p.sensitive_group, // model's adversary prediction (not raw protected attribute)
      confidence: p.confidence,
      predicted_label: p.predicted_label,
      human_override: !!p.human_override,
      override_decision: p.human_override?.decision ?? null,
      rejected_for_review: p.rejected,
      reject_reason: p.reject_reason ?? null,
    }));
  res.json({ window_days: 30, total: entries.length, entries });
});

router.post("/compliance/certificate", (_req, res) => {
  if (!store.model?.trained) return res.status(400).json({ error: "Model not trained yet." });
  const composition = store.biasReport ?? buildBiasReport(store.rawRows);
  const testRows = store.processed.filter((r) => r.split === "test");
  const report = evaluate(store.model, testRows.length ? testRows : store.processed, "ethnicity");
  const gapsUnderFive =
    report.demographic_parity_diff < 0.05 && report.equal_opportunity_diff < 0.05;
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 6 * 30 * 24 * 60 * 60 * 1000;
  const id = `cert_${store.model.version}_${issuedAt.toString(36)}`;
  const cert = {
    id,
    model_name: "FairHire",
    model_version: store.model.version,
    issued_at: new Date(issuedAt).toISOString(),
    expires_at: new Date(expiresAt).toISOString(),
    recommend_recertification_in_months: 6,
    training_data_summary: composition,
    fairness_summary: {
      verdict: report.verdict,
      demographic_parity_diff: report.demographic_parity_diff,
      equal_opportunity_diff: report.equal_opportunity_diff,
      disparate_impact_ratio: report.disparate_impact_ratio,
      all_gaps_under_5_percent: gapsUnderFive,
    },
    signature_placeholder: `FAIRHIRE-CERT-${id}`,
  };
  store.certificates.push({ id, issuedAt, expiresAt, payload: cert });
  if (store.certificates.length > 50) store.certificates.shift();
  res.json(cert);
});

export default router;
