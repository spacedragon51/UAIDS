import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/jobScreeningApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import {
  FileCheck, Download, Award, AlertTriangle, CheckCircle2, ShieldCheck,
  ScrollText, Calendar, Hash, Printer, FileSignature,
} from "lucide-react";

interface PerGroupItem {
  group: string;
  positive_rate?: number;
  selection_rate?: number;
  count?: number;
  tpr?: number;
  fpr?: number;
  auc?: number;
}
interface AxisGap {
  demographic_parity_diff: number;
  equal_opportunity_diff: number;
  disparate_impact_ratio: number;
}
interface EeocReport {
  report_type: string;
  generated_at: string;
  model_version: string;
  digital_signature: string;
  dataset_composition: unknown;
  per_group_performance: {
    ethnicity: PerGroupItem[];
    gender: PerGroupItem[];
    age?: PerGroupItem[];
  };
  fairness_gaps: { ethnicity: AxisGap; gender: AxisGap };
  meets_four_fifths_rule: boolean;
  verdict: string;
}
interface CertificateData {
  id: string;
  model_name: string;
  model_version: string;
  issued_at: string;
  expires_at: string;
  recommend_recertification_in_months: number;
  fairness_summary: AxisGap & { verdict: string; all_gaps_under_5_percent: boolean };
  signature_placeholder: string;
}
interface AuditEntry {
  timestamp: string;
  sensitive_group_predicted?: string;
  confidence?: number;
  predicted_label?: number;
  human_override?: boolean;
  override_decision?: string | null;
  rejected_for_review?: boolean;
  reject_reason?: string | null;
}

export function CompliancePage() {
  const audit = useQuery({ queryKey: ["audit"], queryFn: api.auditLog });
  const eeoc = useMutation({ mutationFn: api.eeocReport });
  const cert = useMutation({ mutationFn: api.certificate });

  const [tab, setTab] = useState<"eeoc" | "cert" | "audit">("eeoc");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compliance</h1>
        <p className="text-muted-foreground mt-2">
          Generate the four-fifths-rule EEOC adverse impact analysis, an audit certificate, and inspect the
          immutable audit log — all rendered as human-readable reports with a JSON download for archival.
        </p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={tab === "eeoc" ? "default" : "outline"} onClick={() => setTab("eeoc")}>EEOC report</Button>
        <Button size="sm" variant={tab === "cert" ? "default" : "outline"} onClick={() => setTab("cert")}>Certificate</Button>
        <Button size="sm" variant={tab === "audit" ? "default" : "outline"} onClick={() => setTab("audit")}>Audit log</Button>
      </div>

      {tab === "eeoc" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileCheck className="w-5 h-5" /> EEOC adverse impact report</CardTitle>
            <CardDescription>
              Compares each protected group's selection rate against the most-selected group; flags any ratio below 0.80.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => eeoc.mutate()} disabled={eeoc.isPending}>
                {eeoc.isPending ? "Generating…" : "Generate report"}
              </Button>
              {eeoc.data ? (
                <>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" /> Print / Save as PDF
                  </Button>
                  <Button variant="outline" onClick={() => download("eeoc-report.json", JSON.stringify(eeoc.data, null, 2))}>
                    <Download className="w-4 h-4 mr-2" /> Download JSON
                  </Button>
                </>
              ) : null}
            </div>
            {eeoc.isError && <div className="text-sm text-destructive">{(eeoc.error as Error).message}</div>}
            {eeoc.data ? <EeocReportView data={eeoc.data as unknown as EeocReport} /> : null}
          </CardContent>
        </Card>
      )}

      {tab === "cert" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5" /> Audit certificate</CardTitle>
            <CardDescription>Cryptographic-style summary attesting the model passed the configured fairness thresholds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => cert.mutate()} disabled={cert.isPending}>
                {cert.isPending ? "Generating…" : "Generate certificate"}
              </Button>
              {cert.data ? (
                <>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" /> Print / Save as PDF
                  </Button>
                  <Button variant="outline" onClick={() => download("fairhire-certificate.json", JSON.stringify(cert.data, null, 2))}>
                    <Download className="w-4 h-4 mr-2" /> Download JSON
                  </Button>
                </>
              ) : null}
            </div>
            {cert.isError && <div className="text-sm text-destructive">{(cert.error as Error).message}</div>}
            {cert.data ? <CertificateView data={cert.data as unknown as CertificateData} /> : null}
          </CardContent>
        </Card>
      )}

      {tab === "audit" && (
        <Card>
          <CardHeader>
            <CardTitle>Audit log (last {audit.data?.window_days ?? 90} days)</CardTitle>
            <CardDescription>{audit.data?.total ?? 0} entries · prediction history with reject-option routing and human overrides.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => audit.data && download("audit-log.json", JSON.stringify(audit.data, null, 2))}>
                <Download className="w-4 h-4 mr-2" /> Download JSON
              </Button>
              <Button variant="outline" onClick={() => audit.data && download("audit-log.csv", entriesToCsv((audit.data?.entries ?? []) as unknown as AuditEntry[]))}>
                <Download className="w-4 h-4 mr-2" /> Download CSV
              </Button>
            </div>
            <AuditLogTable entries={(audit.data?.entries ?? []) as unknown as AuditEntry[]} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ----- EEOC report human-readable view -----
function EeocReportView({ data }: { data: EeocReport }) {
  const fourFifthsPass = data.meets_four_fifths_rule;
  return (
    <div className="space-y-4 print:text-black">
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Report type</div>
            <div className="text-lg font-bold">{data.report_type}</div>
          </div>
          <Badge
            variant={data.verdict === "COMPLIANT" ? "default" : "destructive"}
            className="text-sm px-3 py-1"
          >
            {data.verdict === "COMPLIANT" ? <CheckCircle2 className="w-4 h-4 mr-1.5" /> : <AlertTriangle className="w-4 h-4 mr-1.5" />}
            {data.verdict}
          </Badge>
        </div>
        <Separator className="my-3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <KV label="Generated at" value={new Date(data.generated_at).toLocaleString()} icon={Calendar} />
          <KV label="Model version" value={data.model_version} icon={Hash} />
          <KV label="Digital signature" value={data.digital_signature} mono icon={FileSignature} />
        </div>
      </div>

      <div className="rounded-lg border p-5">
        <div className="font-semibold mb-1 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" /> Four-fifths rule (80%) verdict
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          The four-fifths rule is the primary EEOC test for adverse impact: every protected group's
          selection rate must be at least 80% of the most-selected group's rate.
        </p>
        <div
          className={
            "rounded-md border p-4 text-sm flex items-start gap-3 " +
            (fourFifthsPass
              ? "border-green-500/40 bg-green-500/5"
              : "border-destructive/40 bg-destructive/5")
          }
        >
          {fourFifthsPass ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
          )}
          <div>
            <div className="font-semibold">
              {fourFifthsPass
                ? "PASS — every protected group's selection rate is ≥ 80% of the highest-selected group on every measured axis."
                : "FAIL — at least one protected group's selection rate is below 80% of the most-selected group; further mitigation is required."}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-5 space-y-4">
        <div className="font-semibold">Per-group performance</div>
        <PerGroupTable axisLabel="Ethnicity" rows={data.per_group_performance.ethnicity} />
        <PerGroupTable axisLabel="Gender" rows={data.per_group_performance.gender} />
        {data.per_group_performance.age && (
          <PerGroupTable axisLabel="Age bracket" rows={data.per_group_performance.age} />
        )}
      </div>

      <div className="rounded-lg border p-5">
        <div className="font-semibold mb-2">Fairness gaps</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <GapBlock title="Ethnicity" gap={data.fairness_gaps.ethnicity} />
          <GapBlock title="Gender" gap={data.fairness_gaps.gender} />
        </div>
      </div>
    </div>
  );
}

function PerGroupTable({ axisLabel, rows }: { axisLabel: string; rows: PerGroupItem[] }) {
  if (!rows || rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.positive_rate ?? r.selection_rate ?? 0), 1e-6);
  return (
    <div>
      <div className="text-sm font-medium mb-2">{axisLabel}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b">
              <th className="py-2 pr-4">Group</th>
              <th className="py-2 pr-4">Count</th>
              <th className="py-2 pr-4">Selection rate</th>
              <th className="py-2 pr-4">Ratio vs top</th>
              <th className="py-2 pr-4">TPR</th>
              <th className="py-2 pr-4">FPR</th>
              <th className="py-2 pr-4">AUC</th>
              <th className="py-2 pr-4">4/5ths</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const sel = r.positive_rate ?? r.selection_rate ?? 0;
              const ratio = max > 0 ? sel / max : 0;
              const pass = ratio >= 0.8;
              return (
                <tr key={r.group} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{r.group}</td>
                  <td className="py-2 pr-4">{r.count ?? "—"}</td>
                  <td className="py-2 pr-4">{(sel * 100).toFixed(1)}%</td>
                  <td className="py-2 pr-4">{ratio.toFixed(2)}</td>
                  <td className="py-2 pr-4">{r.tpr !== undefined ? `${(r.tpr * 100).toFixed(1)}%` : "—"}</td>
                  <td className="py-2 pr-4">{r.fpr !== undefined ? `${(r.fpr * 100).toFixed(1)}%` : "—"}</td>
                  <td className="py-2 pr-4">{r.auc !== undefined ? r.auc.toFixed(2) : "—"}</td>
                  <td className="py-2 pr-4">
                    <Badge
                      variant="outline"
                      className={pass ? "border-green-500/50 text-green-700 dark:text-green-400" : "border-destructive/60 text-destructive"}
                    >
                      {pass ? "PASS" : "FAIL"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GapBlock({ title, gap }: { title: string; gap: AxisGap }) {
  const diOk = gap.disparate_impact_ratio >= 0.8;
  return (
    <div className="border rounded-md p-3 space-y-1.5">
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs grid grid-cols-2 gap-1.5">
        <span className="text-muted-foreground">Demographic parity diff</span>
        <span className="font-mono text-right">{(gap.demographic_parity_diff * 100).toFixed(1)}%</span>
        <span className="text-muted-foreground">Equal opportunity diff</span>
        <span className="font-mono text-right">{(gap.equal_opportunity_diff * 100).toFixed(1)}%</span>
        <span className="text-muted-foreground">Disparate impact ratio</span>
        <span className="font-mono text-right flex items-center justify-end gap-1.5">
          {gap.disparate_impact_ratio.toFixed(2)}
          <Badge
            variant="outline"
            className={diOk ? "border-green-500/50 text-green-700 dark:text-green-400" : "border-destructive/60 text-destructive"}
          >
            {diOk ? "≥ 0.80" : "< 0.80"}
          </Badge>
        </span>
      </div>
    </div>
  );
}

function KV({ label, value, mono, icon: Icon }: { label: string; value: string; mono?: boolean; icon?: typeof Calendar }) {
  return (
    <div className="flex items-start gap-2">
      {Icon ? <Icon className="w-4 h-4 mt-0.5 text-muted-foreground" /> : null}
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={"text-sm " + (mono ? "font-mono break-all" : "font-medium")}>{value}</div>
      </div>
    </div>
  );
}

// ----- Certificate human-readable view -----
function CertificateView({ data }: { data: CertificateData }) {
  const fair = data.fairness_summary.verdict === "FAIR";
  return (
    <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-8 print:bg-white print:text-black space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold tracking-wider uppercase">
          <Award className="w-4 h-4" /> Certificate of Fair Hiring Audit
        </div>
        <h2 className="text-3xl font-extrabold mt-3">{data.model_name}</h2>
        <div className="text-sm text-muted-foreground">Model version <span className="font-mono">{data.model_version}</span></div>
      </div>

      <div className="text-center text-sm leading-relaxed max-w-2xl mx-auto">
        This certifies that the above model has been audited under the UAIDS bias-detection framework
        and {fair ? (
          <span className="font-semibold text-green-700 dark:text-green-400">
            satisfies the configured fairness thresholds
          </span>
        ) : (
          <span className="font-semibold text-destructive">
            requires remediation before re-certification
          </span>
        )}.
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4 text-sm max-w-2xl mx-auto">
        <KV label="Certificate ID" value={data.id} mono icon={Hash} />
        <KV label="Issued" value={new Date(data.issued_at).toLocaleDateString()} icon={Calendar} />
        <KV label="Expires" value={new Date(data.expires_at).toLocaleDateString()} icon={Calendar} />
        <KV label="Re-certify in" value={`${data.recommend_recertification_in_months} months`} icon={Calendar} />
      </div>

      <div className="bg-card border rounded-md p-4 max-w-2xl mx-auto">
        <div className="font-semibold mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" /> Fairness summary
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <span className="text-muted-foreground">Verdict</span>
          <span className="text-right font-semibold">
            <Badge variant={fair ? "default" : "destructive"}>{data.fairness_summary.verdict}</Badge>
          </span>
          <span className="text-muted-foreground">Demographic parity diff</span>
          <span className="text-right font-mono">{(data.fairness_summary.demographic_parity_diff * 100).toFixed(2)}%</span>
          <span className="text-muted-foreground">Equal opportunity diff</span>
          <span className="text-right font-mono">{(data.fairness_summary.equal_opportunity_diff * 100).toFixed(2)}%</span>
          <span className="text-muted-foreground">Disparate impact ratio</span>
          <span className="text-right font-mono">{data.fairness_summary.disparate_impact_ratio.toFixed(2)}</span>
          <span className="text-muted-foreground">All gaps under 5%</span>
          <span className="text-right">{data.fairness_summary.all_gaps_under_5_percent ? "Yes" : "No"}</span>
        </div>
      </div>

      <div className="text-center pt-4">
        <FileSignature className="w-6 h-6 mx-auto text-primary" />
        <div className="text-xs font-mono break-all mt-1 text-muted-foreground max-w-lg mx-auto">{data.signature_placeholder}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">UAIDS — Unbiased AI Decision System</div>
      </div>
    </div>
  );
}

// ----- Audit log table -----
function AuditLogTable({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return <div className="text-sm text-muted-foreground border rounded-md p-6 text-center">No entries yet — score a few resumes from the Predict tab to populate the audit log.</div>;
  }
  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr className="text-left text-xs text-muted-foreground">
            <th className="py-2 px-3"><ScrollText className="w-3.5 h-3.5 inline mr-1" /> When</th>
            <th className="py-2 px-3">Decision</th>
            <th className="py-2 px-3">Confidence</th>
            <th className="py-2 px-3">Group (model-inferred)</th>
            <th className="py-2 px-3">Routing / override</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const routed = !!e.rejected_for_review;
            const overridden = !!e.human_override;
            const decision = e.predicted_label === 1 ? "HIRE" : "REJECT";
            return (
              <tr key={i} className="border-t">
                <td className="py-2 px-3 whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                <td className="py-2 px-3">
                  <Badge variant={decision === "HIRE" ? "default" : "destructive"}>{decision}</Badge>
                </td>
                <td className="py-2 px-3">{e.confidence !== undefined ? `${Math.round(e.confidence * 100)}%` : "—"}</td>
                <td className="py-2 px-3 font-mono text-xs">{e.sensitive_group_predicted ?? "—"}</td>
                <td className="py-2 px-3 text-xs">
                  {routed && (
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="border-yellow-500/60 text-yellow-700 dark:text-yellow-400">Routed for review</Badge>
                      {e.reject_reason && <span className="text-muted-foreground">{e.reject_reason}</span>}
                    </div>
                  )}
                  {overridden && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline">Human override → {e.override_decision ?? "?"}</Badge>
                    </div>
                  )}
                  {!routed && !overridden && <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function entriesToCsv(entries: AuditEntry[]): string {
  if (entries.length === 0) return "timestamp,decision,confidence,group,routed,override\n";
  const header = "timestamp,decision,confidence,group,routed_for_review,reject_reason,human_override,override_decision";
  const body = entries.map((e) =>
    [
      e.timestamp,
      e.predicted_label === 1 ? "HIRE" : "REJECT",
      e.confidence !== undefined ? e.confidence.toFixed(3) : "",
      e.sensitive_group_predicted ?? "",
      e.rejected_for_review ? "true" : "false",
      (e.reject_reason ?? "").replace(/,/g, ";"),
      e.human_override ? "true" : "false",
      e.override_decision ?? "",
    ].join(","),
  );
  return [header, ...body].join("\n");
}

function download(name: string, content: string) {
  const ext = name.split(".").pop() ?? "txt";
  const mime = ext === "csv" ? "text/csv" : "application/json";
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
