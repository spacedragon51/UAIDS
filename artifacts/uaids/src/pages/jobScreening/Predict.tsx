import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api, type ExplainResponse, type PredictResponse } from "@/lib/jobScreeningApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Upload, Sparkles, FileText } from "lucide-react";

interface SampleResume {
  id: string;
  label: string;
  name: string;
  graduationYear: number;
  text: string;
}

const SAMPLE_RESUMES: SampleResume[] = [
  {
    id: "senior-engineer",
    label: "Senior software engineer (strong)",
    name: "Alex Doe",
    graduationYear: 2015,
    text: `Senior software engineer with 8 years of experience leading distributed systems work. She built a recommendation pipeline that improved click-through rate by 22%, mentored four junior engineers, and partnered with product to ship two cross-functional launches. Strong in Python, Go, and Kubernetes.`,
  },
  {
    id: "junior-data",
    label: "Junior data analyst (borderline)",
    name: "Jordan Lee",
    graduationYear: 2023,
    text: `Recent statistics graduate with one internship as a data analyst. Built a customer churn dashboard in Tableau, wrote ad-hoc SQL queries against the warehouse, and learned the basics of A/B testing. Comfortable in Python and pandas, eager to grow into a full data science role.`,
  },
  {
    id: "career-switcher",
    label: "Career switcher (underrepresented slice)",
    name: "Maria Hernandez",
    graduationYear: 2009,
    text: `Former civil engineer transitioning into product management after completing a 6-month bootcamp. Led a 4-person team on a capstone project for a fintech startup, ran weekly user interviews, and shipped a beta with 200 active users. Bilingual (English / Spanish), strong written communication, comfortable with Jira and Figma.`,
  },
  {
    id: "senior-pm",
    label: "Senior PM (mixed signal)",
    name: "Sam Patel",
    graduationYear: 2010,
    text: `Senior product manager, 12 years. Took two B2B SaaS products from $1M to $20M ARR. Sometimes drives launches without a written PRD; teams have flagged shifting requirements late in the sprint. Strong relationships with sales and exec stakeholders.`,
  },
];

export function PredictPage() {
  const [name, setName] = useState(SAMPLE_RESUMES[0].name);
  const [year, setYear] = useState<number>(SAMPLE_RESUMES[0].graduationYear);
  const [text, setText] = useState(SAMPLE_RESUMES[0].text);
  const [sampleId, setSampleId] = useState<string>(SAMPLE_RESUMES[0].id);
  const [uploadedName, setUploadedName] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const predict = useMutation({ mutationFn: () => api.predict(text, name, year) });
  const explain = useMutation({ mutationFn: () => api.explain(text) });

  const runBoth = () => {
    predict.mutate();
    explain.mutate();
  };

  const loadSample = (id: string) => {
    const s = SAMPLE_RESUMES.find((r) => r.id === id);
    if (!s) return;
    setSampleId(id);
    setName(s.name);
    setYear(s.graduationYear);
    setText(s.text);
    setUploadedName("");
  };

  const handleUpload = async (file: File) => {
    setUploadedName(file.name);
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    if (ext === "txt" || ext === "md" || ext === "csv" || ext === "rtf") {
      const t = await file.text();
      setText(t.trim());
      const stem = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      if (stem) setName(stem.slice(0, 60));
    } else {
      // Best-effort fallback for binary formats — read as text and let the
      // user know this works best for plain-text resumes.
      const t = await file.text();
      setText(t.replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, " ").trim());
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Predict & explain</h1>
        <p className="text-muted-foreground mt-2">
          Score a single resume. Predictions with low confidence, or for resumes that fall in
          underrepresented training groups, are sent to the human review queue (reject option).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resume input</CardTitle>
          <CardDescription>
            Upload a plain-text resume (.txt / .md), pick a built-in sample, or paste / edit the
            text directly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => fileRef.current?.click()} type="button">
              <Upload className="w-4 h-4 mr-2" /> Upload resume
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.rtf,.csv,text/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
            />
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <Label className="text-xs whitespace-nowrap">Load sample</Label>
              <Select value={sampleId} onValueChange={loadSample}>
                <SelectTrigger className="h-9 min-w-[260px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLE_RESUMES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {uploadedName && (
              <Badge variant="outline" className="text-xs">
                <FileText className="w-3 h-3 mr-1" /> {uploadedName}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Graduation year</Label>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Resume text</Label>
              <span className="text-xs text-muted-foreground">{text.length} characters</span>
            </div>
            <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={runBoth} disabled={predict.isPending || explain.isPending || text.trim().length === 0}>
              {predict.isPending || explain.isPending ? "Scoring…" : "Score this resume"}
            </Button>
            {(predict.isError || explain.isError) && (
              <span className="text-sm text-destructive">
                {(predict.error as Error)?.message ?? (explain.error as Error)?.message}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {predict.data && <PredictResult r={predict.data} />}
      {explain.data && <ExplainResult r={explain.data} />}
    </div>
  );
}

function PredictResult({ r }: { r: PredictResponse }) {
  const hire = r.prediction === 1;
  return (
    <Card className={r.reject ? "border-yellow-500/40" : hire ? "border-accent" : "border-destructive/40"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {r.reject ? "Sent to human review" : hire ? "Recommend HIRE" : "Recommend REJECT"}
          <Badge variant={r.reject ? "outline" : hire ? "default" : "destructive"}>
            {Math.round(r.hire_probability * 100)}% hire prob
          </Badge>
        </CardTitle>
        <CardDescription>{r.recommendation}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Field label="Confidence" value={`${Math.round(r.confidence * 100)}%`} />
          <Field label="Detected ethnicity" value={r.detected_attributes.ethnicity} />
          <Field label="Detected gender" value={r.detected_attributes.gender} />
          <Field label="Age bracket" value={r.detected_attributes.ageBracket} />
        </div>
        {r.reject_reason && (
          <div className="text-sm bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-500/40 rounded-md p-3">
            <strong>Routed for human review:</strong> {r.reject_reason}
          </div>
        )}
        <div className="text-xs text-muted-foreground">Prediction id: {r.prediction_id}</div>
      </CardContent>
    </Card>
  );
}

function ExplainResult({ r }: { r: ExplainResponse }) {
  const max = Math.max(...r.top_tokens.map((t) => Math.abs(t.importance)), 1e-6);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Explainability</CardTitle>
        <CardDescription>
          Token importance via leave-one-out drop. Green = pushes toward hire, red = pushes toward reject.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {r.top_tokens.map((t) => {
          const pct = Math.round((Math.abs(t.importance) / max) * 100);
          const positive = t.importance > 0;
          return (
            <div key={t.index} className="flex items-center gap-3">
              <div className="w-32 truncate text-sm font-mono">{t.token}</div>
              <div className="flex-1 h-3 bg-muted rounded">
                <div
                  className="h-3 rounded"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: positive ? "hsl(var(--chart-2))" : "hsl(var(--chart-5))",
                  }}
                />
              </div>
              <div className="w-16 text-right text-xs text-muted-foreground">
                {(t.importance > 0 ? "+" : "") + (Math.round(t.importance * 1000) / 1000).toFixed(3)}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
