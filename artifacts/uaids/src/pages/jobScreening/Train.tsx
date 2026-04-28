import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/jobScreeningApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TrainPage() {
  const qc = useQueryClient();
  const status = useQuery({ queryKey: ["model-status"], queryFn: api.modelStatus });
  const train = useMutation({
    mutationFn: () => api.train(20),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["model-status"] });
      qc.invalidateQueries({ queryKey: ["status"] });
    },
  });

  const result = train.data;
  const history = result?.history ?? status.data?.history ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Train adversarial debiasing model</h1>
        <p className="text-muted-foreground mt-2">
          384-dim hashed embedding → 128-unit hidden layer → main hire/reject classifier <em>plus</em> an
          adversary that tries to predict the protected attribute. A gradient reversal layer (λ = 0.5) flips the
          adversary's gradients before they reach the encoder, forcing the encoder to learn a representation
          that the adversary <em>cannot</em> use to recover the protected attribute.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run training</CardTitle>
          <CardDescription>
            20 epochs with early stopping on the validation fairness gap.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Button onClick={() => train.mutate()} disabled={train.isPending}>
            {train.isPending ? "Training… (a few seconds)" : "Train model"}
          </Button>
          {status.data?.trained && (
            <span className="text-sm text-muted-foreground">
              Last trained: {status.data.trainedAt ? new Date(status.data.trainedAt).toLocaleString() : "—"}{" "}
              · version {status.data.version}
            </span>
          )}
          {train.isError && <span className="text-sm text-destructive">{(train.error as Error).message}</span>}
        </CardContent>
      </Card>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Stat label="Epochs run" value={result.epochs_run.toString()} />
          <Stat label="Final main loss" value={result.final?.loss_main.toFixed(3) ?? "—"} />
          <Stat label="Final adversary loss" value={result.final?.loss_adversary.toFixed(3) ?? "—"} />
          <Stat label="Validation accuracy" value={result.final ? `${Math.round(result.final.val_accuracy * 100)}%` : "—"} />
        </div>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Training history</CardTitle>
            <CardDescription>
              Adversary loss should rise (or plateau) as the encoder hides the protected attribute.
              Fairness gap is the demographic-parity gap between protected groups on the validation set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="epoch" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="loss_main" stroke="hsl(var(--chart-1))" name="Main loss" />
                  <Line type="monotone" dataKey="loss_adversary" stroke="hsl(var(--chart-5))" name="Adversary loss" />
                  <Line type="monotone" dataKey="fairness_gap" stroke="hsl(var(--chart-3))" name="Fairness gap" />
                  <Line type="monotone" dataKey="val_accuracy" stroke="hsl(var(--chart-2))" name="Val accuracy" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
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
