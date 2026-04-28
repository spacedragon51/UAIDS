import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, type UploadResponse } from "@/lib/jobScreeningApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Scale,
  Activity,
  FileCheck,
  Briefcase,
  Cloud,
  Trash2,
  RotateCw,
} from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { recordAudit } from "@/lib/auditStats";
import { useAuth } from "@/hooks/useAuth";
import {
  uploadDataset as storageUpload,
  listDatasets,
  deleteDataset,
  fetchDatasetAsFile,
  type SavedDataset,
} from "@/lib/firebaseStorage";
import { firebaseConfigured } from "@/lib/firebase";

export function UploadPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const qc = useQueryClient();
  const { user } = useAuth();
  const canPersist = firebaseConfigured && !!user;

  const status = useQuery({
    queryKey: ["status"],
    queryFn: api.status,
    refetchInterval: 5000,
    retry: false,
  });

  const savedDatasets = useQuery({
    queryKey: ["saved-datasets", user?.uid ?? "guest"],
    queryFn: () => (user ? listDatasets(user.uid) : Promise.resolve([])),
    enabled: canPersist,
    staleTime: 30_000,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const result = await api.uploadDataset(file);
      if (canPersist && user) {
        try {
          await storageUpload(user.uid, file);
          setSavedNotice(`Saved ${file.name} to your account.`);
        } catch (err) {
          console.warn("[upload] Firebase Storage save failed:", err);
        }
      }
      return result;
    },
    onSuccess: () => {
      recordAudit("jobs");
      qc.invalidateQueries({ queryKey: ["status"] });
      qc.invalidateQueries({ queryKey: ["bias-report"] });
      qc.invalidateQueries({ queryKey: ["saved-datasets"] });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Upload failed"),
  });

  const reuploadSaved = useMutation({
    mutationFn: async (dataset: SavedDataset) => {
      const file = await fetchDatasetAsFile(dataset.downloadURL, dataset.name);
      return api.uploadDataset(file);
    },
    onSuccess: () => {
      recordAudit("jobs");
      qc.invalidateQueries({ queryKey: ["status"] });
      qc.invalidateQueries({ queryKey: ["bias-report"] });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Re-upload failed"),
  });

  const removeSaved = useMutation({
    mutationFn: (dataset: SavedDataset) => deleteDataset(dataset.fullPath),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved-datasets"] });
    },
  });

  const seed = useMutation({
    mutationFn: () => api.seedSample(),
    onSuccess: () => {
      recordAudit("jobs");
      qc.invalidateQueries({ queryKey: ["status"] });
      qc.invalidateQueries({ queryKey: ["bias-report"] });
    },
    onError: (e: unknown) =>
      setError(e instanceof Error ? e.message : "Failed to load sample data"),
  });

  const handleFile = (f: File | null | undefined) => {
    if (!f) return;
    setError(null);
    upload.mutate(f);
  };

  return (
    <div className="space-y-8">
      <ScrollReveal>
        <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
            <Briefcase size={14} /> UAIDS · Resume Screener
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight gradient-text-primary mb-3">
            Bias-aware resume screening
          </h1>
          <p className="text-muted-foreground max-w-3xl leading-relaxed">
            Upload a resume CSV (or load the sample dataset) and we will detect protected
            attributes, surface representation gaps across ethnicity / gender / age, train an
            adversarially debiased classifier, and produce a fair-hiring compliance report —
            following the same MEASURE → FLAG → FIX pipeline used in the Healthcare and Loan
            domains.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Pill icon={ShieldCheck}>Disparate Impact &lt; 0.8 detection</Pill>
            <Pill icon={Scale}>Per-group selection rate, TPR, FPR</Pill>
            <Pill icon={Sparkles}>Adversarial debiasing + reweighting</Pill>
            <Pill icon={FileCheck}>Fair-hiring compliance report</Pill>
          </div>
        </section>
      </ScrollReveal>

      <ScrollReveal delay={80}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UploadIcon className="w-5 h-5" /> Step 1 · Upload resume dataset
            </CardTitle>
            <CardDescription>
              CSV with columns <code className="text-xs bg-muted px-1.5 py-0.5 rounded">resume_text, label, name, graduation_year</code>.
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
              <p className="mt-3 text-sm">Click to browse or drop your CSV file here</p>
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
            {savedNotice && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-primary/10 text-primary text-sm">
                <Cloud className="w-4 h-4 mt-0.5" />
                {savedNotice}
              </div>
            )}
            {seed.data && <UploadSummary data={seed.data} />}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                {error}
              </div>
            )}
            {upload.data && <UploadSummary data={upload.data} />}
            {status.isError && !upload.data && !seed.data && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 text-warning text-sm border border-warning/30">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                The screening API server is offline. Use the sample loader above to explore the
                workflow with bundled data.
              </div>
            )}
          </CardContent>
        </Card>
      </ScrollReveal>

      {canPersist && (
        <ScrollReveal delay={120}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="w-5 h-5" /> Your saved datasets
              </CardTitle>
              <CardDescription>
                Resume CSVs you upload while signed in are stored privately in your account so
                you can re-run audits without re-uploading.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savedDatasets.isLoading ? (
                <div className="text-sm text-muted-foreground">Loading saved datasets…</div>
              ) : savedDatasets.data && savedDatasets.data.length > 0 ? (
                <ul className="space-y-2">
                  {savedDatasets.data.map((d) => (
                    <li
                      key={d.fullPath}
                      className="flex items-center justify-between gap-3 p-3 rounded-md border bg-card hover-elevate"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{d.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {(d.size / 1024).toFixed(1)} KB ·{" "}
                          {new Date(d.uploadedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reuploadSaved.mutate(d)}
                          disabled={reuploadSaved.isPending}
                        >
                          <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                          Re-run
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a href={d.downloadURL} download={d.name}>
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeSaved.mutate(d)}
                          disabled={removeSaved.isPending}
                          aria-label="Delete dataset"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No saved datasets yet. Upload a CSV above and it will appear here.
                </div>
              )}
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      <ScrollReveal delay={160}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" /> Step 2 · Pipeline status
            </CardTitle>
            <CardDescription>
              End-to-end progress through the unbiased screening flow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Step
                done={!!status.data?.uploaded}
                label="Dataset uploaded"
                hint={status.data?.uploaded ? `${status.data.rows} rows` : "Awaiting CSV"}
              />
              <Step
                done={!!status.data?.preprocessed}
                label="Preprocessed"
                hint="Stratified split + reweighting"
                link="/job-screening/preprocess"
              />
              <Step
                done={!!status.data?.trained}
                label="Model trained"
                hint="Adversarial debiasing"
                link="/job-screening/train"
              />
              <Step
                done={!!status.data?.trained}
                label="Audited"
                hint="Per-group fairness metrics"
                link="/job-screening/fairness"
              />
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
      </ScrollReveal>
    </div>
  );
}

function Pill({
  icon: Icon,
  children,
}: {
  icon: typeof ShieldCheck;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-card/60 border border-border/60 px-3 py-1 text-xs text-foreground/80">
      <Icon size={12} className="text-primary" />
      {children}
    </span>
  );
}

function Step({
  done,
  label,
  hint,
  link,
}: {
  done: boolean;
  label: string;
  hint?: string;
  link?: string;
}) {
  const inner = (
    <div
      className={`p-4 rounded-lg border bg-card ${done ? "border-accent" : "border-border"} hover-elevate h-full`}
    >
      <div className="flex items-center gap-2">
        {done ? (
          <CheckCircle2 className="w-4 h-4 text-accent" />
        ) : (
          <span className="w-4 h-4 rounded-full border border-muted-foreground/40 inline-block" />
        )}
        <span className="font-medium text-sm">{label}</span>
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
  if (link) return <Link to={link}>{inner}</Link>;
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
        Detected {bias_report.ethnicity.length} ethnic groups, {bias_report.gender.length} gender
        groups, and {bias_report.age.length} age brackets.
        {bias_report.underrepresented_groups.length > 0 && (
          <> {bias_report.underrepresented_groups.length} group(s) flagged as underrepresented.</>
        )}
      </div>
      <Link
        to="/job-screening/bias"
        className="text-primary inline-flex items-center text-sm font-medium"
      >
        View bias audit <ArrowRight className="w-3.5 h-3.5 ml-1" />
      </Link>
    </div>
  );
}
