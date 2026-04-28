import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogs } from "@/hooks/useAuditLog";
import { ClipboardList, Download } from "lucide-react";

export default function AuditTrailPanel() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const logs = useAuditLogs(100);
  if (!user) return null;

  const exportCsv = () => {
    const headers = "Timestamp,Action,Entity Type,Entity ID,Details\n";
    const rows = logs.map((l) =>
      `"${new Date(l.created_at).toISOString()}","${l.action}","${l.entity_type}","${l.entity_id || ""}","${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const actionColors: Record<string, string> = {
    dataset_uploaded: "text-primary", bias_detected: "text-warning",
    mitigation_applied: "text-accent", report_generated: "text-chart-4",
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-primary" size={18} />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("audit.title")}</h3>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-secondary border border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
          <Download size={12} /> {t("audit.exportCsv")}
        </button>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t("audit.noEvents")}</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg border border-border/30">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium ${actionColors[log.action] || "text-foreground"}`}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {log.entity_type}{log.entity_id ? ` • ${log.entity_id.slice(0, 8)}...` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
