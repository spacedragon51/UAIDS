import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, type UploadResponse } from "@/lib/jobScreeningApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle2, AlertCircle, Download, ArrowRight, Sparkles } from "lucide-react";

export function UploadPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const status = useQuery({ queryKey: ["status"], queryFn: api.status, refetchInterval: 5000 });

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadDataset(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["status"] });
      qc.invalidateQueries({ queryKey: ["bias-report"] });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Upload failed"),
  });

  const seed = useMutation({
    mutationFn: () => api.seedSample(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["status"] });
      qc.invalidateQueries({ queryKey: ["bias-report"] });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Failed to load sample data"),
  });

  const handleFile = (f: File | null | undefined) => {
    if (!f) return;
    setError(null);
    upload.mutate(f);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload resume dataset</h1>
        <p className="text-muted-foreground mt-2">
          Drop in a CSV with <code className="text-xs bg-muted px-1.5 py-0.5 rounded">resume_text, label, name, graduation_year</code>.
          We will detect protected attributes, surface representation gaps, and prepare the data for adversarial debiasing.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadIcon className="w-5 h-5" /> CSV upload
          </CardTitle>
          <CardDescription>
            Up to 25 MB. Label is 1 = hire, 0 = reject.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-10 text-center hover-elevate cursor-pointer"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <FileSpreadsheet className="mx-auto w-10 h-10 text-muted-foreground" />
            <p className="mt-3 text-sm">
              Click to browse or drop your CSV file here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Required columns: resume_text, label, name, graduation_year
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={() => {
                setError(null);
                seed.mutate();
              }}
              disabled={seed.isPending}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {seed.isPending ? "Loading sample…" : "Load sample resumes"}
            </Button>
            <Button variant="outline" asChild>
              <a href={api.sampleCsvUrl} download>
                <Download className="w-4 h-4 mr-2" /> Download sample CSV
              </a>
            </Button>
            <span className="text-xs text-muted-foreground">
              31 example resumes spanning multiple ethnicities, genders, and graduation years.
            </span>
          </div>

          {upload.isPending && (
            <div className="text-sm text-muted-foreground">Uploading and analyzing…</div>
          )}
          {seed.data && <UploadSummary data={seed.data} />}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              {error}
            </div>
          )}
          {upload.data && <UploadSummary data={upload.data} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline status</CardTitle>
          <CardDescription>End-to-end progress through the unbiased screening flow.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Step done={!!status.data?.uploaded} label="Dataset uploaded" hint={status.data?.uploaded ? `${status.data.rows} rows` : "Awaiting CSV"} />
            <Step done={!!status.data?.preprocessed} label="Preprocessed" hint="Stratified split + reweighting" link="/preprocess" />
            <Step done={!!status.data?.trained} label="Model trained" hint="Adversarial debiasing" link="/train" />
            <Step done={!!status.data?.trained} label="Audited" hint="Per-group fairness metrics" link="/fairness" />
          </ol>
          <div className="mt-6 flex justify-end">
            <Link to="/job-screening/bias">
              <Button>
                Continue to bias audit <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Step({ done, label, hint, link }: { done: boolean; label: string; hint?: string; link?: string }) {
  const inner = (
    <div className={`p-4 rounded-lg border bg-card ${done ? "border-accent" : "border-border"} hover-elevate`}>
      <div className="flex items-center gap-2">
        {done
          ? <CheckCircle2 className="w-4 h-4 text-accent" />
          : <span className="w-4 h-4 rounded-full border border-muted-foreground/40 inline-block" />}
        <span className="font-medium text-sm">{label}</span>
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
  if (link) return <Link href={link}>{inner}</Link>;
  return inner;
}

function UploadSummary({ data }: { data: UploadResponse }) {
  const { bias_report } = data;
  return (
    <div className="rounded-md bg-accent/10 border border-accent/30 p-4 text-sm space-y-2">
      <div className="flex items-center gap-2 text-accent font-medium">
        <CheckCircle2 className="w-4 h-4" />
        Loaded {data.rows_loaded} rows from {data.filename}
      </div>
      <div className="text-muted-foreground">
        Detected {bias_report.ethnicity.length} ethnic groups, {bias_report.gender.length} gender groups,
        and {bias_report.age.length} age brackets.
        {bias_report.underrepresented_groups.length > 0 && (
          <> {bias_report.underrepresented_groups.length} group(s) flagged as underrepresented.</>
        )}
      </div>
      <Link to="/job-screening/bias" className="text-primary inline-flex items-center text-sm font-medium">
        View bias audit <ArrowRight className="w-3.5 h-3.5 ml-1" />
      </Link>
    </div>
  );
}
