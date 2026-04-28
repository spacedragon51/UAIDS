import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/jobScreeningApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function RejectQueuePage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["reject-queue"], queryFn: api.rejectQueue, refetchInterval: 5000 });

  const review = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 0 | 1 }) =>
      api.review(id, decision, "human-reviewer-1"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reject-queue"] }),
  });

  const items = q.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Human review queue</h1>
        <p className="text-muted-foreground mt-2">
          Predictions where the model abstained — low confidence, an underrepresented group with
          fewer than 100 training samples, or a resume length outside the supported range.
          A human makes the final call.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{items.length} pending</CardTitle>
          <CardDescription>Sorted newest first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground">Nothing in the queue. Score a few resumes from the Predict page to populate it.</div>
          )}
          {items.map((it) => (
            <div key={it.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{it.ethnicity}</Badge>
                    <Badge variant="outline">{it.gender}</Badge>
                    <Badge variant="outline">age {it.age_bracket}</Badge>
                    <Badge variant="secondary">
                      hire prob {Math.round(it.predicted_probability * 100)}%
                    </Badge>
                    <Badge variant="secondary">conf {Math.round(it.confidence * 100)}%</Badge>
                  </div>
                  {it.reject_reason && (
                    <div className="text-xs text-muted-foreground">Reason: {it.reject_reason}</div>
                  )}
                  <div className="text-sm">{it.resume_excerpt}</div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button size="sm" onClick={() => review.mutate({ id: it.id, decision: 1 })}>Hire</Button>
                  <Button size="sm" variant="outline" onClick={() => review.mutate({ id: it.id, decision: 0 })}>Reject</Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(it.timestamp).toLocaleString()} · id {it.id}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
