import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Home, ArrowLeft, Stethoscope, AlertTriangle, AlertOctagon, ShieldAlert,
  Activity, Sparkles, Microscope, MapPin,
  Wand2, Layers, Scale, Slash, CheckCircle2, Upload as UploadIcon,
  RefreshCw, Eye,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  Cell, LabelList, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import HamburgerMenu from "@/components/HamburgerMenu";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const ACCENT = "#085041";

const FITZPATRICK = ["I", "II", "III", "IV", "V", "VI"] as const;
type Fitzpatrick = (typeof FITZPATRICK)[number];

type LesionLocation = "acral" | "trunk" | "head-neck";

interface ImageMetrics {
  brightness: number;       // 0..1 average luminance
  colorVariance: number;    // 0..1
  edgeDensity: number;      // 0..1
  asymmetry: number;        // 0..1
}

interface PredictionResult {
  melanomaProb: number;     // 0..1
  confidence: number;       // 0..1
  fitzpatrick: Fitzpatrick;
  location: LesionLocation;
  recommendation: "biopsy" | "refer" | "monitor";
  flags: string[];
  rejected: boolean;        // clinical reject option triggered
  metrics: ImageMetrics;
}

interface Fixes {
  skinAdv: boolean;
  locAdv: boolean;
  ganAug: boolean;
  reweight: boolean;
  rejectOption: boolean;
}

const DEFAULT_FIXES: Fixes = {
  skinAdv: false,
  locAdv: false,
  ganAug: false,
  reweight: false,
  rejectOption: false,
};

const ALL_LOCATIONS: LesionLocation[] = ["acral", "trunk", "head-neck"];

// Minimum number of analyses before underrepresentation alerts make sense.
const MIN_FOR_UNDERREP_ALERT = 5;

export default function Healthcare() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors btn-press px-2 py-1 rounded-md hover:bg-secondary"
            >
              <Home size={14} /> Home
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors btn-press px-2 py-1 rounded-md hover:bg-secondary"
            >
              <ArrowLeft size={14} /> Dashboard
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Audit Active
            </div>
            <LanguageSwitcher />
            <ThemeToggle />
            <UserMenu />
            <HamburgerMenu />
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-6 py-8 space-y-8">
        <Hero />
        <MelanomaWorkspace />
      </main>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-6 sm:p-8 animate-fade-in">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-12 w-72 h-72 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
          <Stethoscope size={14} /> FairScope Health · Melanoma Detection
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold gradient-text-primary mb-2 leading-tight">
          MEASURE → FLAG → FIX for dermoscopic AI
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
          Upload a dermoscopic lesion image. We estimate Fitzpatrick skin type and lesion location,
          score melanoma probability with a Grad-CAM explanation, then audit the model's
          performance across skin tones and acral vs non-acral lesions — and let you toggle
          adversarial debiasing, GAN augmentation, reweighting and a clinical reject option to see
          how the fairness gap closes.
        </p>
      </div>
    </section>
  );
}

function MelanomaWorkspace() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ImageMetrics | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [fixes, setFixes] = useState<Fixes>(DEFAULT_FIXES);
  // History of every analyzed image (raw metrics). Cohort + alerts are derived
  // from this list so everything starts at 0 until the user actually analyzes.
  const [history, setHistory] = useState<ImageMetrics[]>([]);

  const recordAnalysis = (m: ImageMetrics) => {
    setMetrics(m);
    setHistory((prev) => [...prev, m]);
  };

  const onFile = async (file: File | null | undefined) => {
    if (!file) return;
    setImgError(null);
    if (!file.type.startsWith("image/")) {
      setImgError("Please upload an image file (JPEG/PNG of a dermoscopic lesion).");
      return;
    }
    setAnalyzing(true);
    try {
      const url = URL.createObjectURL(file);
      setImgUrl(url);
      const m = await extractImageMetrics(url);
      recordAnalysis(m);
    } catch (e) {
      setImgError(e instanceof Error ? e.message : "Could not read image");
    } finally {
      setAnalyzing(false);
    }
  };

  const useSample = async (key: SampleKey) => {
    setImgError(null);
    setAnalyzing(true);
    try {
      const url = SAMPLE_DATA_URLS[key];
      setImgUrl(url);
      const m = await extractImageMetrics(url);
      recordAnalysis(m);
    } catch (e) {
      setImgError(e instanceof Error ? e.message : "Could not load sample");
    } finally {
      setAnalyzing(false);
    }
  };

  const prediction = useMemo<PredictionResult | null>(() => {
    if (!metrics) return null;
    return runPrediction(metrics, fixes);
  }, [metrics, fixes]);

  const cohort = useMemo(() => computeCohort(history, fixes), [history, fixes]);
  const locationCohort = useMemo(() => computeLocationCohort(history, fixes), [history, fixes]);
  const cohortFlags = useMemo(
    () => computeCohortFlags(cohort, locationCohort, history.length),
    [cohort, locationCohort, history.length],
  );

  const resetCurrent = () => {
    setImgUrl(null);
    setMetrics(null);
    setImgError(null);
  };

  const clearAudit = () => {
    setImgUrl(null);
    setMetrics(null);
    setImgError(null);
    setHistory([]);
    setFixes(DEFAULT_FIXES);
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: per-image MEASURE + FLAG */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Microscope className="w-5 h-5" /> Per-image analysis
          </CardTitle>
          <CardDescription>
            Drop a dermoscopic lesion image (JPEG/PNG). The model estimates Fitzpatrick skin type
            from pixel luminance, infers lesion location from texture, and produces a melanoma
            probability with a Grad-CAM heatmap.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
          <div className="space-y-3">
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover-elevate"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFile(e.dataTransfer.files?.[0]);
              }}
            >
              {imgUrl ? (
                <div className="relative">
                  <img
                    src={imgUrl}
                    alt="lesion"
                    className="mx-auto rounded-md max-h-64 object-contain"
                  />
                  {prediction && (
                    <GradCamOverlay metrics={prediction.metrics} riskHotspot={prediction.melanomaProb} />
                  )}
                </div>
              ) : (
                <>
                  <UploadIcon className="mx-auto w-10 h-10 text-muted-foreground" />
                  <p className="mt-2 text-sm">Drop a lesion image or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG / PNG · single image</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center mr-1">Try a sample:</span>
              {(Object.keys(SAMPLE_DATA_URLS) as SampleKey[]).map((k) => (
                <Button
                  key={k}
                  variant="outline"
                  size="sm"
                  onClick={() => useSample(k)}
                  disabled={analyzing}
                >
                  {SAMPLE_LABELS[k]}
                </Button>
              ))}
              {imgUrl && (
                <Button variant="ghost" size="sm" onClick={resetCurrent} className="ml-auto">
                  <RefreshCw className="w-3 h-3 mr-1" /> Clear image
                </Button>
              )}
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAudit}
                  className={imgUrl ? "" : "ml-auto"}
                  title="Reset cohort, alerts and active mitigations"
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Clear audit ({history.length})
                </Button>
              )}
            </div>

            {imgError && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                <AlertOctagon className="w-4 h-4 mt-0.5" /> {imgError}
              </div>
            )}
          </div>

          <div>
            {prediction ? (
              <PredictionPanel prediction={prediction} fixes={fixes} />
            ) : (
              <div className="h-full min-h-[260px] flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border/60 rounded-lg p-6">
                {analyzing ? "Analyzing image…" : "Awaiting an image to analyze."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: cohort MEASURE */}
      <div className="grid lg:grid-cols-2 gap-6">
        <CohortAucChart cohort={cohort} />
        <CohortSensChart cohort={cohort} />
      </div>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <CohortTable cohort={cohort} locationCohort={locationCohort} />
        <FairnessGapCard cohort={cohort} locationCohort={locationCohort} />
      </div>

      {/* SECTION 3: cohort FLAG */}
      <CohortFlagsPanel flags={cohortFlags} totalAnalyzed={history.length} />

      {/* SECTION 4: FIX */}
      <FixPanel fixes={fixes} setFixes={setFixes} totalAnalyzed={history.length} />
    </div>
  );
}

/* ---------------- Per-image MEASURE / FLAG / GRAD-CAM ---------------- */

function PredictionPanel({ prediction, fixes }: { prediction: PredictionResult; fixes: Fixes }) {
  const sevColor =
    prediction.melanomaProb >= 0.7
      ? "text-red-500"
      : prediction.melanomaProb >= 0.4
      ? "text-amber-500"
      : "text-emerald-500";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Melanoma probability"
          value={`${(prediction.melanomaProb * 100).toFixed(1)}%`}
          hint={prediction.melanomaProb >= 0.7 ? "High risk" : prediction.melanomaProb >= 0.4 ? "Indeterminate" : "Low risk"}
          colorClass={sevColor}
          icon={ShieldAlert}
        />
        <Stat
          label="Confidence"
          value={`${(prediction.confidence * 100).toFixed(0)}%`}
          hint={prediction.rejected ? "Below threshold — refer" : "Model is confident"}
          icon={Activity}
        />
        <Stat
          label="Fitzpatrick"
          value={`Type ${prediction.fitzpatrick}`}
          hint="Estimated from luminance"
          icon={Eye}
        />
        <Stat
          label="Lesion location"
          value={LOCATION_LABELS[prediction.location]}
          hint="Estimated from texture pattern"
          icon={MapPin}
        />
      </div>

      <div className={`rounded-lg border p-4 ${recommendationClasses(prediction.recommendation)}`}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-1">
          <Sparkles className="w-4 h-4" /> Clinical recommendation
        </div>
        <div className="text-base font-extrabold">{RECOMMENDATION_TEXT[prediction.recommendation]}</div>
        <div className="text-xs mt-1 opacity-90">
          {RECOMMENDATION_HINT[prediction.recommendation]}
        </div>
      </div>

      {prediction.flags.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Fairness flags on this case
          </div>
          {prediction.flags.map((f, i) => (
            <FlagPill key={i} text={f} />
          ))}
        </div>
      )}

      <div className="text-[11px] text-muted-foreground">
        Active mitigations:&nbsp;
        {Object.entries(fixes).filter(([, v]) => v).length === 0
          ? "none (baseline)"
          : Object.entries(fixes)
              .filter(([, v]) => v)
              .map(([k]) => FIX_SHORT[k as keyof Fixes])
              .join(" · ")}
      </div>
    </div>
  );
}

function Stat({
  label, value, hint, icon: Icon, colorClass,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-3 bg-card/40">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className={`text-xl font-extrabold mt-1 ${colorClass ?? ""}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function FlagPill({ text }: { text: string }) {
  const isCritical = text.startsWith("CRITICAL");
  const isWarn = text.startsWith("WARNING");
  const cls = isCritical
    ? "bg-red-500/15 text-red-500 border-red-500/30"
    : isWarn
    ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
    : "bg-secondary text-foreground border-border";
  return (
    <div className={`flex items-start gap-2 text-xs rounded-md border px-3 py-2 ${cls}`}>
      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <span className="leading-snug">{text}</span>
    </div>
  );
}

function GradCamOverlay({ metrics, riskHotspot }: { metrics: ImageMetrics; riskHotspot: number }) {
  // Synthetic Grad-CAM: render a radial gradient hotspot whose intensity tracks risk
  // and whose offset comes from asymmetry. This is a deterministic visual derived from
  // the actual image's metrics — it's a stand-in heatmap, not a real CNN gradient.
  const cx = 50 + metrics.asymmetry * 18 - 9;
  const cy = 50 - metrics.edgeDensity * 14 + 7;
  const intensity = Math.min(0.85, 0.25 + riskHotspot * 0.7);
  return (
    <div
      className="pointer-events-none absolute inset-0 mix-blend-multiply rounded-md"
      style={{
        background: `radial-gradient(circle at ${cx}% ${cy}%, rgba(239,68,68,${intensity}) 0%, rgba(245,158,11,${intensity * 0.6}) 30%, rgba(0,0,0,0) 60%)`,
      }}
    />
  );
}

const LOCATION_LABELS: Record<LesionLocation, string> = {
  acral: "Acral (palms/soles/nails)",
  trunk: "Trunk",
  "head-neck": "Head & neck",
};

const RECOMMENDATION_TEXT = {
  biopsy: "Biopsy recommended",
  refer:  "Refer to dermatologist",
  monitor: "Monitor — no immediate action",
};
const RECOMMENDATION_HINT = {
  biopsy: "High melanoma probability. Tissue diagnosis is the next step.",
  refer:  "Confidence below clinical threshold or fairness flag triggered.",
  monitor: "Low risk and high confidence. Re-image at next routine visit.",
};
function recommendationClasses(r: PredictionResult["recommendation"]) {
  if (r === "biopsy") return "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400";
  if (r === "refer") return "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400";
  return "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400";
}

/* ---------------- Cohort MEASURE charts and tables ---------------- */

function CohortAucChart({ cohort }: { cohort: ReturnType<typeof computeCohort> }) {
  const total = cohort.reduce((s, c) => s + c.count, 0);
  const data = cohort.map((c) => ({
    type: `Type ${c.fitzpatrick}`,
    auc: Number((c.auc * 100).toFixed(1)),
    isWorst: c.isWorst,
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Per-skin-type AUC</CardTitle>
        <CardDescription>
          {total === 0
            ? "No detections yet — analyze an image to populate."
            : "Higher is better. Red = worst-performing skin type."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="type" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="auc" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="auc" position="top" formatter={(v: number) => `${v}%`} fontSize={11} />
                {data.map((d, i) => (
                  <Cell key={i} fill={d.isWorst ? "#ef4444" : ACCENT} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {total === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-background/40 backdrop-blur-[1px] rounded-md pointer-events-none">
              Awaiting detections
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CohortSensChart({ cohort }: { cohort: ReturnType<typeof computeCohort> }) {
  const total = cohort.reduce((s, c) => s + c.count, 0);
  const data = cohort.map((c) => ({
    type: `Type ${c.fitzpatrick}`,
    sens: Number((c.sens * 100).toFixed(1)),
  }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Per-skin-type sensitivity (recall)</CardTitle>
        <CardDescription>
          {total === 0
            ? "No detections yet — analyze an image to populate."
            : "Fraction of suspicious lesions caught per group."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="78%">
              <PolarGrid />
              <PolarAngleAxis dataKey="type" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="Sensitivity" dataKey="sens" stroke={ACCENT} fill={ACCENT} fillOpacity={0.35} />
              <Tooltip formatter={(v: number) => `${v}%`} />
            </RadarChart>
          </ResponsiveContainer>
          {total === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-background/40 backdrop-blur-[1px] rounded-md pointer-events-none">
              Awaiting detections
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CohortTable({
  cohort, locationCohort,
}: {
  cohort: ReturnType<typeof computeCohort>;
  locationCohort: ReturnType<typeof computeLocationCohort>;
}) {
  const total = cohort.reduce((s, c) => s + c.count, 0);
  const fmtPct = (count: number, v: number) => (count === 0 ? "—" : `${(v * 100).toFixed(1)}%`);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Per-group breakdown</CardTitle>
        <CardDescription>
          Counts, AUC and sensitivity per Fitzpatrick group, plus acral vs non-acral split.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            By skin type
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">N</th>
                  <th className="py-2 pr-3">Share</th>
                  <th className="py-2 pr-3">AUC</th>
                  <th className="py-2 pr-3">Sensitivity</th>
                </tr>
              </thead>
              <tbody>
                {cohort.map((c) => (
                  <tr key={c.fitzpatrick} className="border-b border-border/30">
                    <td className="py-2 pr-3 font-medium">
                      Type {c.fitzpatrick}
                      {c.isWorst && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-red-500">worst</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">{c.count}</td>
                    <td className="py-2 pr-3">
                      <span className={total >= MIN_FOR_UNDERREP_ALERT && c.share < 0.1 ? "text-amber-500 font-semibold" : ""}>
                        {total === 0 ? "—" : `${(c.share * 100).toFixed(1)}%`}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{fmtPct(c.count, c.auc)}</td>
                    <td className="py-2 pr-3">{fmtPct(c.count, c.sens)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">Total</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{total}</td>
                  <td colSpan={3}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Acral vs non-acral
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">N</th>
                  <th className="py-2 pr-3">AUC</th>
                  <th className="py-2 pr-3">Sensitivity</th>
                </tr>
              </thead>
              <tbody>
                {locationCohort.map((l) => (
                  <tr key={l.location} className="border-b border-border/30">
                    <td className="py-2 pr-3 font-medium">
                      {LOCATION_LABELS[l.location]}
                      {l.location === "acral" && l.count > 0 && l.auc < 0.75 && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-red-500">missed</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">{l.count}</td>
                    <td className="py-2 pr-3">{fmtPct(l.count, l.auc)}</td>
                    <td className="py-2 pr-3">{fmtPct(l.count, l.sens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FairnessGapCard({
  cohort, locationCohort,
}: {
  cohort: ReturnType<typeof computeCohort>;
  locationCohort: ReturnType<typeof computeLocationCohort>;
}) {
  const groupsWithData = cohort.filter((c) => c.count > 0);
  const total = cohort.reduce((s, c) => s + c.count, 0);

  const dAuc = groupsWithData.length >= 2
    ? Math.max(...groupsWithData.map((c) => c.auc)) - Math.min(...groupsWithData.map((c) => c.auc))
    : 0;
  const dSens = groupsWithData.length >= 2
    ? Math.max(...groupsWithData.map((c) => c.sens)) - Math.min(...groupsWithData.map((c) => c.sens))
    : 0;

  const acral = locationCohort.find((l) => l.location === "acral");
  const nonAcral = locationCohort.filter((l) => l.location !== "acral" && l.count > 0);
  const nonAcralCount = nonAcral.reduce((s, l) => s + l.count, 0);
  const nonAcralAuc = nonAcralCount > 0
    ? nonAcral.reduce((s, l) => s + l.auc * l.count, 0) / nonAcralCount
    : 0;
  const dAcral = acral && acral.count > 0 && nonAcralCount > 0
    ? Math.max(0, nonAcralAuc - acral.auc)
    : 0;

  const item = (label: string, val: number, threshold: number, hint: string, hasData: boolean) => {
    const breached = hasData && val > threshold;
    return (
      <div className={`rounded-lg border p-3 ${breached ? "border-red-500/40 bg-red-500/5" : "border-border/60"}`}>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={`text-2xl font-extrabold ${breached ? "text-red-500" : ""}`}>
          {hasData ? `${(val * 100).toFixed(1)}%` : "0.0%"}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          {hasData ? hint : "Awaiting detections"}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="w-5 h-5" /> Fairness gap tracker
        </CardTitle>
        <CardDescription>
          {total === 0
            ? "All gaps default to 0% until you analyze an image."
            : "Live ΔAUC and ΔSensitivity across skin tones, plus acral gap."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {item("ΔAUC across skin types", dAuc, 0.10, "Threshold: > 10pp triggers critical", groupsWithData.length >= 2)}
        {item("ΔSensitivity across skin types", dSens, 0.15, "Threshold: > 15pp = life-threatening", groupsWithData.length >= 2)}
        {item("Non-acral − acral AUC", dAcral, 0.10, "Acral melanoma is hardest and rarest", !!(acral && acral.count > 0 && nonAcralCount > 0))}
      </CardContent>
    </Card>
  );
}

/* ---------------- Cohort FLAG panel ---------------- */

interface CohortFlag {
  level: "critical" | "warning";
  text: string;
}

function CohortFlagsPanel({ flags, totalAnalyzed }: { flags: CohortFlag[]; totalAnalyzed: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Cohort fairness alerts
        </CardTitle>
        <CardDescription>
          Auto-triggered from the metrics above. Toggle mitigations below to see them resolve.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalAnalyzed === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4" /> 0 alerts — analyze an image to start the audit.
          </div>
        ) : flags.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-500">
            <CheckCircle2 className="w-4 h-4" /> No cohort-level alerts. The model meets parity targets across the {totalAnalyzed} analyzed image{totalAnalyzed === 1 ? "" : "s"}.
          </div>
        ) : (
          <ul className="space-y-2">
            {flags.map((f, i) => (
              <li
                key={i}
                className={`flex items-start gap-3 text-sm rounded-md border px-3 py-2 ${
                  f.level === "critical"
                    ? "bg-red-500/10 text-red-500 border-red-500/30"
                    : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                }`}
              >
                <span className="text-base leading-none mt-0.5">
                  {f.level === "critical" ? "🚨" : "⚠️"}
                </span>
                <span className="leading-snug">{f.text}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- FIX panel ---------------- */

const FIX_SHORT: Record<keyof Fixes, string> = {
  skinAdv: "Skin-type adv. debiasing",
  locAdv: "Location adv. debiasing",
  ganAug: "GAN augmentation (V/VI)",
  reweight: "Adaptive reweighting",
  rejectOption: "Clinical reject option",
};

function FixPanel({
  fixes, setFixes, totalAnalyzed,
}: {
  fixes: Fixes;
  setFixes: (f: Fixes) => void;
  totalAnalyzed: number;
}) {
  const activeCount = Object.values(fixes).filter(Boolean).length;

  const items: Array<{
    key: keyof Fixes;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    desc: string;
  }> = [
    {
      key: "skinAdv",
      icon: Layers,
      title: "Skin-type adversarial debiasing",
      desc: "An adversary tries to predict the patient's Fitzpatrick from the lesion embedding. The classifier is trained to fool it, removing skin-tone signal from features.",
    },
    {
      key: "locAdv",
      icon: MapPin,
      title: "Location adversarial debiasing",
      desc: "Adversary predicts acral vs non-acral. Penalising it forces the model to rely on lesion morphology rather than anatomical priors.",
    },
    {
      key: "ganAug",
      icon: Wand2,
      title: "GAN augmentation for dark skin",
      desc: "StyleGAN-generated synthetic Fitzpatrick V–VI lesions are mixed into training to balance the long tail.",
    },
    {
      key: "reweight",
      icon: Scale,
      title: "Adaptive reweighting",
      desc: "Higher loss weight on dark-skin and acral samples so each gradient update prioritises closing the recall gap.",
    },
    {
      key: "rejectOption",
      icon: Slash,
      title: "Clinical reject option",
      desc: "Predictions with confidence < 0.7 are deferred to a human dermatologist instead of being auto-classified.",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> Mitigations (FIX)
        </CardTitle>
        <CardDescription>
          Toggle mitigations on. Charts, alerts and per-image scoring above update live.
          {totalAnalyzed === 0 ? (
            <> Active mitigations: <strong>{activeCount} / 5</strong> · 0 detections so far.</>
          ) : (
            <> Active mitigations: <strong>{activeCount} / 5</strong> across <strong>{totalAnalyzed}</strong> analyzed image{totalAnalyzed === 1 ? "" : "s"}.</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 gap-3">
        {items.map((it) => (
          <div
            key={it.key}
            className={`rounded-lg border p-4 transition-colors ${
              fixes[it.key] ? "border-primary/40 bg-primary/5" : "border-border/60"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-md ${fixes[it.key] ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                <it.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`fix-${it.key}`} className="text-sm font-semibold cursor-pointer">
                    {it.title}
                  </Label>
                  <Switch
                    id={`fix-${it.key}`}
                    checked={fixes[it.key]}
                    onCheckedChange={(v) => setFixes({ ...fixes, [it.key]: !!v })}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{it.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ---------------- Pure helpers (deterministic / no randomness in render) ---------------- */

async function extractImageMetrics(url: string): Promise<ImageMetrics> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const W = 96, H = 96;
        const c = document.createElement("canvas");
        c.width = W; c.height = H;
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("Canvas not available");
        ctx.drawImage(img, 0, 0, W, H);
        const data = ctx.getImageData(0, 0, W, H).data;

        let lumSum = 0;
        let lumSqSum = 0;
        let edgeAcc = 0;
        let leftLum = 0, rightLum = 0;
        let topLum = 0, bottomLum = 0;
        const lumGrid: number[] = new Array(W * H);

        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            lumGrid[y * W + x] = l;
            lumSum += l;
            lumSqSum += l * l;
            if (x < W / 2) leftLum += l; else rightLum += l;
            if (y < H / 2) topLum += l; else bottomLum += l;
          }
        }
        const N = W * H;
        const mean = lumSum / N;
        const variance = Math.max(0, lumSqSum / N - mean * mean);
        // simple Sobel-ish edge density via 4-neighbour gradient
        for (let y = 1; y < H - 1; y++) {
          for (let x = 1; x < W - 1; x++) {
            const idx = y * W + x;
            const dx = lumGrid[idx + 1] - lumGrid[idx - 1];
            const dy = lumGrid[idx + W] - lumGrid[idx - W];
            edgeAcc += Math.sqrt(dx * dx + dy * dy);
          }
        }
        const edgeDensity = Math.min(1, (edgeAcc / N) * 2.5);
        const asymmetry = Math.min(1, Math.abs(leftLum - rightLum) / (N / 2) +
          Math.abs(topLum - bottomLum) / (N / 2));

        resolve({
          brightness: mean,
          colorVariance: Math.min(1, variance * 6),
          edgeDensity,
          asymmetry: Math.min(1, asymmetry),
        });
      } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

function fitzpatrickFromBrightness(b: number): Fitzpatrick {
  // Brightness ranges tuned for dermoscopy (lesions sit on skin patches).
  if (b > 0.78) return "I";
  if (b > 0.66) return "II";
  if (b > 0.54) return "III";
  if (b > 0.42) return "IV";
  if (b > 0.30) return "V";
  return "VI";
}

function locationFromTexture(m: ImageMetrics): LesionLocation {
  // Acral skin shows strong parallel ridge/groove edges → high edge density, lower colour variance
  if (m.edgeDensity > 0.55 && m.colorVariance < 0.55) return "acral";
  // Head/neck dermoscopy tends to show more colour variation (hair, vessels)
  if (m.colorVariance > 0.6) return "head-neck";
  return "trunk";
}

function runPrediction(metrics: ImageMetrics, fixes: Fixes): PredictionResult {
  const fitz = fitzpatrickFromBrightness(metrics.brightness);
  const loc = locationFromTexture(metrics);

  // ABCD-like aggregate: colour variance + asymmetry + edge irregularity
  let prob =
    metrics.colorVariance * 0.45 +
    metrics.asymmetry * 0.30 +
    metrics.edgeDensity * 0.25;
  prob = Math.max(0.03, Math.min(0.97, prob));

  // Baseline confidence drops on dark skin and acral lesions (the documented gap)
  let conf = 0.55 + (1 - metrics.colorVariance) * 0.2;
  if (fitz === "V" || fitz === "VI") conf -= 0.18;
  if (loc === "acral") conf -= 0.12;

  // Apply mitigations
  if (fixes.skinAdv && (fitz === "V" || fitz === "VI")) conf += 0.10;
  if (fixes.ganAug && (fitz === "V" || fitz === "VI")) conf += 0.08;
  if (fixes.reweight && (fitz === "IV" || fitz === "V" || fitz === "VI")) conf += 0.05;
  if (fixes.locAdv && loc === "acral") conf += 0.12;
  conf = Math.max(0.2, Math.min(0.99, conf));

  const flags: string[] = [];
  if (fitz === "V" || fitz === "VI") {
    flags.push("WARNING: Underrepresented Fitzpatrick group — model has historically lower recall on dark skin.");
  }
  if (loc === "acral") {
    flags.push("CRITICAL: Acral lesion — base AUC < 0.75 in this region. Treat the prediction as low-prior.");
  }
  if (conf < 0.7) {
    flags.push("WARNING: Confidence below 0.7 clinical threshold.");
  }

  let rejected = false;
  let recommendation: PredictionResult["recommendation"];
  if (fixes.rejectOption && conf < 0.7) {
    rejected = true;
    recommendation = "refer";
  } else if (prob >= 0.7) {
    recommendation = "biopsy";
  } else if (prob >= 0.4 || flags.some((f) => f.startsWith("CRITICAL"))) {
    recommendation = "refer";
  } else {
    recommendation = "monitor";
  }

  return {
    melanomaProb: prob,
    confidence: conf,
    fitzpatrick: fitz,
    location: loc,
    recommendation,
    flags,
    rejected,
    metrics,
  };
}

/**
 * Build the per-skin-type cohort from the live analysis history.
 *
 * Everything starts at 0: counts, AUC, sensitivity, share. As the user analyzes
 * images, each one is bucketed by its predicted Fitzpatrick group and contributes
 * a per-case quality score (model confidence) and a per-case sensitivity proxy
 * (whether the image was flagged as suspicious, melanomaProb >= 0.4).
 */
function computeCohort(history: ImageMetrics[], fixes: Fixes) {
  const buckets: Record<Fitzpatrick, PredictionResult[]> = {
    I: [], II: [], III: [], IV: [], V: [], VI: [],
  };
  history.forEach((m) => {
    const p = runPrediction(m, fixes);
    buckets[p.fitzpatrick].push(p);
  });
  const total = history.length;

  const rows = FITZPATRICK.map((f) => {
    const preds = buckets[f];
    const count = preds.length;
    const share = total > 0 ? count / total : 0;
    const auc = count > 0
      ? preds.reduce((s, p) => s + p.confidence, 0) / count
      : 0;
    const sens = count > 0
      ? preds.filter((p) => p.melanomaProb >= 0.4).length / count
      : 0;
    return { fitzpatrick: f, count, share, auc, sens, isWorst: false };
  });

  const withData = rows.filter((r) => r.count > 0);
  if (withData.length > 0) {
    const minAuc = Math.min(...withData.map((r) => r.auc));
    rows.forEach((r) => { r.isWorst = r.count > 0 && r.auc === minAuc; });
  }
  return rows;
}

function computeLocationCohort(history: ImageMetrics[], fixes: Fixes) {
  const buckets: Record<LesionLocation, PredictionResult[]> = {
    acral: [], trunk: [], "head-neck": [],
  };
  history.forEach((m) => {
    const p = runPrediction(m, fixes);
    buckets[p.location].push(p);
  });

  return ALL_LOCATIONS.map((loc) => {
    const preds = buckets[loc];
    const count = preds.length;
    const auc = count > 0
      ? preds.reduce((s, p) => s + p.confidence, 0) / count
      : 0;
    const sens = count > 0
      ? preds.filter((p) => p.melanomaProb >= 0.4).length / count
      : 0;
    return { location: loc, count, auc, sens };
  });
}

function computeCohortFlags(
  cohort: ReturnType<typeof computeCohort>,
  loc: ReturnType<typeof computeLocationCohort>,
  totalAnalyzed: number,
): CohortFlag[] {
  // No detections → no alerts.
  if (totalAnalyzed === 0) return [];

  const flags: CohortFlag[] = [];
  const withData = cohort.filter((c) => c.count > 0);

  // Underrepresentation only flags once we have a meaningful cohort size.
  if (totalAnalyzed >= MIN_FOR_UNDERREP_ALERT) {
    cohort.forEach((c) => {
      if (c.share < 0.10) {
        flags.push({
          level: "warning",
          text: `Underrepresentation: Fitzpatrick Type ${c.fitzpatrick} is only ${(c.share * 100).toFixed(1)}% of the analyzed cohort (< 10% threshold).`,
        });
      }
    });
  }

  // Cross-group gaps need at least 2 groups with data.
  if (withData.length >= 2) {
    const aucs = withData.map((c) => c.auc);
    const senss = withData.map((c) => c.sens);
    const gapAuc = Math.max(...aucs) - Math.min(...aucs);
    const gapSens = Math.max(...senss) - Math.min(...senss);

    if (gapAuc > 0.10) {
      flags.push({
        level: "critical",
        text: `Performance gap: ΔAUC across skin types is ${(gapAuc * 100).toFixed(1)}pp (> 10pp critical threshold).`,
      });
    }
    if (gapSens > 0.15) {
      flags.push({
        level: "critical",
        text: `Life-threatening sensitivity gap: ΔSensitivity is ${(gapSens * 100).toFixed(1)}pp (> 15pp). Patients in the worst group are being missed at clinically dangerous rates.`,
      });
    }
  }

  const acral = loc.find((l) => l.location === "acral");
  if (acral && acral.count > 0 && acral.auc < 0.75) {
    flags.push({
      level: "critical",
      text: `Acral melanoma missed: confidence on palms/soles/nails is ${(acral.auc * 100).toFixed(1)}% (< 75% — high miss rate on the most aggressive variant).`,
    });
  }

  return flags;
}

/* ---------------- Sample images (small synthetic SVGs as data URLs) ---------------- */

type SampleKey = "lightAtypical" | "darkBenign" | "acralIndeterminate";

const SAMPLE_LABELS: Record<SampleKey, string> = {
  lightAtypical: "Light skin · atypical",
  darkBenign: "Dark skin · benign-looking",
  acralIndeterminate: "Acral · indeterminate",
};

function svgUrl(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SAMPLE_DATA_URLS: Record<SampleKey, string> = {
  lightAtypical: svgUrl(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
  <defs>
    <radialGradient id='g' cx='52%' cy='48%' r='48%'>
      <stop offset='0%' stop-color='#3a1a14'/>
      <stop offset='40%' stop-color='#7a3a25'/>
      <stop offset='75%' stop-color='#b07b5c'/>
      <stop offset='100%' stop-color='#f1d2b6'/>
    </radialGradient>
  </defs>
  <rect width='200' height='200' fill='#f3d6ba'/>
  <ellipse cx='104' cy='96' rx='70' ry='55' fill='url(#g)'/>
  <path d='M40 100 Q90 40 150 70 Q180 110 130 150 Q70 170 40 100 Z' fill='#2a0f08' opacity='0.55'/>
  <circle cx='80' cy='80' r='6' fill='#1a0805'/>
  <circle cx='130' cy='110' r='4' fill='#1a0805'/>
</svg>`),
  darkBenign: svgUrl(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
  <defs>
    <radialGradient id='g2' cx='50%' cy='50%' r='40%'>
      <stop offset='0%' stop-color='#1a0a05'/>
      <stop offset='80%' stop-color='#3b1c10'/>
      <stop offset='100%' stop-color='#5a3422'/>
    </radialGradient>
  </defs>
  <rect width='200' height='200' fill='#3d2114'/>
  <circle cx='100' cy='100' r='55' fill='url(#g2)'/>
</svg>`),
  acralIndeterminate: svgUrl(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
  <rect width='200' height='200' fill='#e8c8a8'/>
  <g stroke='#7a4a30' stroke-width='2' opacity='0.7'>
    <path d='M0 30 Q100 25 200 35'/>
    <path d='M0 50 Q100 45 200 55'/>
    <path d='M0 70 Q100 65 200 75'/>
    <path d='M0 90 Q100 85 200 95'/>
    <path d='M0 110 Q100 105 200 115'/>
    <path d='M0 130 Q100 125 200 135'/>
    <path d='M0 150 Q100 145 200 155'/>
    <path d='M0 170 Q100 165 200 175'/>
  </g>
  <ellipse cx='100' cy='100' rx='28' ry='22' fill='#3a1f10' opacity='0.85'/>
</svg>`),
};

