import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, type PreprocessSummary } from "@/lib/jobScreeningApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PreprocessPage() {
  const qc = useQueryClient();
  const [axis, setAxis] = useState<"ethnicity" | "gender">("ethnicity");

  const summary = useQuery({ queryKey: ["preprocess"], queryFn: api.preprocessSummary, retry: false });
  const run = useMutation({
    mutationFn: () => api.preprocess(axis),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preprocess"] });
      qc.invalidateQueries({ queryKey: ["status"] });
    },
  });

  const data: PreprocessSummary | undefined = run.data ?? summary.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Preprocessing</h1>
        <p className="text-muted-foreground mt-2">
          Stratified train/validation/test split, inverse-frequency reweighting, and synonym
          augmentation for underrepresented groups. The sensitive axis you choose here is the one the
          adversary will try to predict during debiasing training.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configure</CardTitle>
          <CardDescription>Pick the protected axis for debiasing.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <div className="flex gap-2">
            {(["ethnicity", "gender"] as const).map((a) => (
              <Button
                key={a}
                variant={axis === a ? "default" : "outline"}
                onClick={() => setAxis(a)}
                size="sm"
              >
                {a}
              </Button>
            ))}
          </div>
          <Button onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending ? "Running…" : "Run preprocessing"}
          </Button>
          {run.isError && (
            <span className="text-sm text-destructive">{(run.error as Error).message}</span>
          )}
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat label="Total samples" value={data.total_samples.toString()} />
            <Stat label="Augmented samples added" value={data.augmented_samples.toString()} />
            <Stat label="Sensitive axis" value={data.sensitive_axis} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SplitCard title="Train/Val/Test by ethnicity" splits={data.split_stats.byEthnicity} />
            <SplitCard title="Train/Val/Test by gender" splits={data.split_stats.byGender} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sample weights</CardTitle>
              <CardDescription>
                Inverse-frequency weights — underrepresented groups carry more loss weight to counter dataset imbalance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weight_distribution.map((w) => ({
                    name: w.group, weight: Math.round(w.weight * 100) / 100, count: w.count,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="weight" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function SplitCard({ title, splits }: { title: string; splits: PreprocessSummary["split_stats"]["byEthnicity"] }) {
  const groups = Array.from(new Set([
    ...Object.keys(splits.train),
    ...Object.keys(splits.validation),
    ...Object.keys(splits.test),
  ]));
  const data = groups.map((g) => ({
    group: g,
    train: splits.train[g] ?? 0,
    val: splits.validation[g] ?? 0,
    test: splits.test[g] ?? 0,
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="group" fontSize={11} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="train" stackId="a" fill="hsl(var(--chart-1))" />
              <Bar dataKey="val" stackId="a" fill="hsl(var(--chart-3))" />
              <Bar dataKey="test" stackId="a" fill="hsl(var(--chart-2))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
