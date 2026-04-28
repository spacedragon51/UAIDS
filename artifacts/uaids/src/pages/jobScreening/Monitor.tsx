import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/jobScreeningApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Activity } from "lucide-react";

export function MonitorPage() {
  const q = useQuery({ queryKey: ["monitor"], queryFn: api.monitor, refetchInterval: 5000 });

  const m = q.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live fairness monitor</h1>
        <p className="text-muted-foreground mt-2">
          Tracks prediction volume and per-group rates in real time. Drift in TPR or FPR beyond ±10
          percentage points raises an alert and is logged to the audit trail.
        </p>
      </div>

      {!m && <div>Loading…</div>}

      {m && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Stat label="Predictions tracked" value={m.current.total.toString()} icon={<Activity className="w-4 h-4" />} />
            <Stat label="ΔTPR (max)" value={`${Math.round(m.current.delta_tpr * 100)}pp`} />
            <Stat label="ΔFPR (max)" value={`${Math.round(m.current.delta_fpr * 100)}pp`} />
          </div>

          {m.current.alert && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="flex items-start gap-3 pt-6">
                <AlertTriangle className="text-destructive w-5 h-5 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Drift alert</div>
                  <div className="text-sm text-muted-foreground mt-1">{m.current.alert}</div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Per-group prediction rates</CardTitle>
              <CardDescription>Live across recent predictions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={m.current.per_group.map((g) => ({
                    group: g.group,
                    rate: Math.round(g.positive_rate * 100),
                    tpr: Math.round(g.tpr * 100),
                    fpr: Math.round(g.fpr * 100),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="group" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="rate" fill="hsl(var(--chart-1))" name="Positive rate %" />
                    <Bar dataKey="tpr" fill="hsl(var(--chart-2))" name="TPR %" />
                    <Bar dataKey="fpr" fill="hsl(var(--chart-5))" name="FPR %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {m.recent_alerts.length === 0 && (
                <div className="text-sm text-muted-foreground">No alerts in the last 7 days.</div>
              )}
              {m.recent_alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <Badge variant="destructive">drift</Badge>
                  <span className="text-muted-foreground">{new Date(a.at).toLocaleString()}</span>
                  <span>{a.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2">{icon} {label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
