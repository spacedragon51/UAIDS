import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type FairnessReport } from "@/lib/jobScreeningApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export function FairnessPage() {
  const [axis, setAxis] = useState<"ethnicity" | "gender" | "ageBracket">("ethnicity");
  const q = useQuery({
    queryKey: ["fairness", axis],
    queryFn: () => api.fairness(axis),
    retry: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fairness metrics</h1>
        <p className="text-muted-foreground mt-2">
          Evaluated on the held-out test split. We compute per-group accuracy, true / false positive rates,
          AUC, demographic parity gap, equal opportunity gap, and the disparate impact ratio (4/5 rule).
        </p>
      </div>

      <div className="flex gap-2">
        {(["ethnicity", "gender", "ageBracket"] as const).map((a) => (
          <Button key={a} size="sm" variant={axis === a ? "default" : "outline"} onClick={() => setAxis(a)}>
            {a}
          </Button>
        ))}
      </div>

      {q.isLoading && <div>Loading…</div>}
      {q.isError && (
        <Card><CardHeader><CardTitle>Train the model first</CardTitle><CardDescription>{(q.error as Error).message}</CardDescription></CardHeader></Card>
      )}

      {q.data && <Report r={q.data} />}
    </div>
  );
}

function Report({ r }: { r: FairnessReport }) {
  const fair = r.verdict === "FAIR";
  return (
    <>
      <Card className={fair ? "border-accent" : "border-destructive"}>
        <CardContent className="pt-6 flex items-start gap-3">
          {fair ? <CheckCircle2 className="text-accent w-5 h-5 mt-0.5" /> : <AlertTriangle className="text-destructive w-5 h-5 mt-0.5" />}
          <div>
            <div className="font-semibold">{r.verdict}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {r.reasons.length > 0 ? r.reasons.join("; ") : "Model meets all fairness thresholds."}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Demographic parity gap" value={fmtPct(r.demographic_parity_diff)} good={r.demographic_parity_diff < 0.1} />
        <Stat label="Equal opportunity gap" value={fmtPct(r.equal_opportunity_diff)} good={r.equal_opportunity_diff < 0.1} />
        <Stat label="Disparate impact ratio" value={r.disparate_impact_ratio.toFixed(2)} good={r.disparate_impact_ratio >= 0.8} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-group hire rate</CardTitle>
          <CardDescription>Should be similar across groups for demographic parity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.per_group.map((g) => ({ group: g.group, rate: Math.round(g.positive_rate * 100), tpr: Math.round(g.tpr * 100), fpr: Math.round(g.fpr * 100) }))}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="group" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="rate" fill="hsl(var(--chart-1))" name="Positive rate %">
                  {r.per_group.map((_, i) => <Cell key={i} fill="hsl(var(--chart-1))" />)}
                </Bar>
                <Bar dataKey="tpr" fill="hsl(var(--chart-2))" name="True positive rate %" />
                <Bar dataKey="fpr" fill="hsl(var(--chart-5))" name="False positive rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-group breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-2 pr-3">Group</th>
                  <th className="py-2 pr-3">N</th>
                  <th className="py-2 pr-3">Acc</th>
                  <th className="py-2 pr-3">TPR</th>
                  <th className="py-2 pr-3">FPR</th>
                  <th className="py-2 pr-3">Precision</th>
                  <th className="py-2 pr-3">AUC</th>
                  <th className="py-2 pr-3">Hire rate</th>
                </tr>
              </thead>
              <tbody>
                {r.per_group.map((g) => (
                  <tr key={g.group} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium"><Badge variant="secondary">{g.group}</Badge></td>
                    <td className="py-2 pr-3">{g.count}</td>
                    <td className="py-2 pr-3">{fmtPct(g.accuracy)}</td>
                    <td className="py-2 pr-3">{fmtPct(g.tpr)}</td>
                    <td className="py-2 pr-3">{fmtPct(g.fpr)}</td>
                    <td className="py-2 pr-3">{fmtPct(g.precision)}</td>
                    <td className="py-2 pr-3">{g.auc.toFixed(2)}</td>
                    <td className="py-2 pr-3">{fmtPct(g.positive_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <Card className={good ? "border-accent/40" : "border-destructive/40"}>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className={`text-2xl font-semibold mt-1 ${good ? "text-accent" : "text-destructive"}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function fmtPct(v: number) { return `${Math.round(v * 1000) / 10}%`; }
