import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, AlertTriangle, Info, XCircle, Check } from "lucide-react";

interface Alert {
  id: string; type: string; severity: "info" | "warning" | "critical";
  title: string; message: string; is_read: boolean; created_at: string;
}

const MOCK_ALERTS: Alert[] = [
  { id: "1", type: "bias", severity: "critical", title: "High Disparity Detected", message: "FNR disparity exceeds 50% in healthcare domain.", is_read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "2", type: "model", severity: "warning", title: "Threshold Drift Detected", message: "Model threshold has drifted 12% from baseline.", is_read: false, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: "3", type: "system", severity: "info", title: "Audit Complete", message: "Weekly bias audit completed successfully.", is_read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
];

export default function AlertsPanel() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);

  const markRead = (id: string) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a));
  };

  const severityIcon = {
    info: <Info className="text-primary" size={16} />,
    warning: <AlertTriangle className="text-warning" size={16} />,
    critical: <XCircle className="text-destructive" size={16} />,
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="text-primary" size={18} />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("alerts.title")}</h3>
        {unreadCount > 0 && <span className="px-2 py-0.5 text-xs bg-destructive/20 text-destructive rounded-full font-medium">{unreadCount}</span>}
      </div>
      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{t("alerts.noAlerts")}</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
          {alerts.map((alert) => (
            <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${alert.is_read ? "bg-secondary/30 border-border/20" : "bg-secondary/60 border-border/50"}`}>
              <div className="mt-0.5">{severityIcon[alert.severity]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{alert.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(alert.created_at).toLocaleString()}</p>
              </div>
              {!alert.is_read && (
                <button onClick={() => markRead(alert.id)} className="text-muted-foreground hover:text-accent transition-colors">
                  <Check size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
