import { useQuery } from "@tanstack/react-query";
import { api, type BiasReport } from "@/lib/jobScreeningApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle } from "lucide-react";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(217 91% 75%)"];

export function BiasAuditPage() {
  const q = useQuery({ queryKey: ["bias-report"], queryFn: api.biasReport, retry: false });

  if (q.isLoading) return <div>Loading…</div>;
  if (q.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No dataset uploaded</CardTitle>
          <CardDescription>Upload a CSV first to generate the bias audit.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const r = q.data!;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bias audit</h1>
        <p className="text-muted-foreground mt-2">
          Composition of {r.total} resumes across protected attributes. Groups under 10% are flagged
          as underrepresented and will receive higher sample weights and text augmentation during preprocessing.
        </p>
      </div>

      {r.underrepresented_groups.length > 0 && (
        <Card className="border-yellow-500/40 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="text-yellow-600 w-5 h-5 mt-0.5" />
            <div>
              <div className="font-medium text-sm">Underrepresented groups detected</div>
              <div className="text-sm text-muted-foreground mt-1">
                {r.underrepresented_groups.join(", ")} represent less than 10% of the dataset.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompositionCard title="Ethnicity" data={r.ethnicity} />
        <CompositionCard title="Gender" data={r.gender} />
      </div>

      <CompositionCard title="Age bracket" data={r.age} />

      <Card>
        <CardHeader>
          <CardTitle>Hire rate by group</CardTitle>
          <CardDescription>Historical positive label rate. Large gaps suggest historical hiring bias in the labels themselves.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.per_group_hire_rate.map((d) => ({ name: `${d.axis}: ${d.group}`, rate: Math.round(d.hire_rate * 100), count: d.count }))}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={100} fontSize={11} />
                <YAxis label={{ value: "% hired", angle: -90, position: "insideLeft" }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {r.per_group_hire_rate.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Label distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm">
            <div><span className="font-semibold">{r.label_distribution.hire}</span> hires</div>
            <div><span className="font-semibold">{r.label_distribution.reject}</span> rejects</div>
            <div className="text-muted-foreground">Overall hire rate: {Math.round((r.label_distribution.hire / Math.max(1, r.total)) * 100)}%</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CompositionCard({ title, data }: { title: string; data: BiasReport["ethnicity"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{data.length} groups</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.map((d) => ({ name: d.group, value: Math.round(d.percentage * 10) / 10 }))}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis label={{ value: "%", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
              <Bar dataKey="value" name={`% of dataset`} radius={[4, 4, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.underrepresented ? "hsl(var(--chart-5))" : COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.map((d) => (
            <Badge key={d.group} variant={d.underrepresented ? "destructive" : "secondary"}>
              {d.group}: {d.count} ({d.percentage.toFixed(1)}%)
              {d.underrepresented && " ⚠"}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
