import { useState } from "react";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { DomainConfig, Domain, getFNR, getMitigatedFNR, getTotalSamples, getMinorityRatio } from "@/data/biasData";
import { RotateCcw, Download, History, Save } from "lucide-react";

interface Props {
  domain: Domain;
  domainConfig: DomainConfig;
  mitigated: boolean;
  onReset: () => void;
}

interface ReportRow {
  id: string; created_at: string; domain: string; mitigation_applied: boolean;
  fairness_metrics: { max_fnr: number; disparity: number };
}

export default function DomainAnalysisActions({ domain, domainConfig, mitigated, onReset }: Props) {
  const [history, setHistory] = useState<ReportRow[]>([]);
  const [saving, setSaving] = useState(false);

  const buildReport = () => {
    const fnrValues = domainConfig.groups.map((g) => (mitigated ? getMitigatedFNR(g) : getFNR(g)));
    const maxFNR = Math.max(...fnrValues);
    const minFNR = Math.min(...fnrValues);
    return {
      domain, generated_at: new Date().toISOString(),
      total_samples: getTotalSamples(domainConfig),
      minority_ratio: getMinorityRatio(domainConfig),
      max_fnr: maxFNR, disparity: maxFNR - minFNR,
      mitigation_applied: mitigated,
      groups: domainConfig.groups.map((g) => ({ name: g.name, count: g.count, original_fnr: getFNR(g), mitigated_fnr: getMitigatedFNR(g) })),
    };
  };

  const handleDownload = () => {
    const report = buildReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `bias-report-${domain}-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    setSaving(true);
    const report = buildReport();
    await logAuditEvent("report_saved", "bias_report", undefined, { domain });
    const row: ReportRow = {
      id: crypto.randomUUID(), created_at: new Date().toISOString(), domain,
      mitigation_applied: mitigated,
      fairness_metrics: { max_fnr: report.max_fnr, disparity: report.disparity },
    };
    setHistory((prev) => [row, ...prev].slice(0, 5));
    setSaving(false);
  };

  const handleReset = async () => {
    onReset();
    await logAuditEvent("analysis_reset", "domain", undefined, { domain });
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History size={16} className="text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{domain} — Actions & History</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary transition-all">
            <RotateCcw size={13} /> Reset
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-secondary hover:bg-secondary/80 transition-all disabled:opacity-50">
            <Save size={13} /> {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
            <Download size={13} /> Download
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Previous analyses ({domain})</p>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No saved analyses yet. Click "Save" to record one.</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-auto">
            {history.map((h) => {
              const maxFnr = `${(h.fairness_metrics.max_fnr * 100).toFixed(0)}%`;
              const disp = `${(h.fairness_metrics.disparity * 100).toFixed(1)}%`;
              return (
                <div key={h.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-secondary/40 border border-border/50 text-xs">
                  <span className="text-foreground font-medium">{new Date(h.created_at).toLocaleString()}</span>
                  <span className="flex gap-3 text-muted-foreground">
                    <span>Max FNR: <span className="text-foreground font-medium">{maxFnr}</span></span>
                    <span>Disparity: <span className="text-foreground font-medium">{disp}</span></span>
                    <span className={h.mitigation_applied ? "text-success" : "text-warning"}>
                      {h.mitigation_applied ? "Mitigated" : "Raw"}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
