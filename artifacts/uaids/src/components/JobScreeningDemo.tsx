import { useState, useRef, useMemo } from "react";
import {
  Upload, Search, BarChart3, SlidersHorizontal, User,
  GraduationCap, Briefcase, AlertTriangle, CheckCircle, XCircle,
  RotateCcw, FileText, X, Trophy, Target,
  Download, FileJson, Sparkles, ChevronRight,
  Code2, Database, Palette, Megaphone, TrendingUp, Settings2
} from "lucide-react";
import { toast } from "sonner";
import ScrollReveal from "./ScrollReveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Domain = "software" | "data" | "design" | "marketing" | "finance";
type EducationTier = "Ivy/Tier-1" | "Tier-2 State" | "Tier-3 Regional" | "Non-Degree";

const DOMAINS: { id: Domain; label: string; icon: typeof Code2; desc: string; skills: string[] }[] = [
  { id: "software", label: "Software Engineering", icon: Code2,      desc: "Backend, frontend & full-stack roles",     skills: ["JavaScript", "Python", "System Design", "Git", "Testing"] },
  { id: "data",     label: "Data Science",         icon: Database,   desc: "ML, analytics & data engineering roles",  skills: ["Python", "SQL", "ML", "Statistics", "TensorFlow"] },
  { id: "design",   label: "Product Design",       icon: Palette,    desc: "UX, UI & product design roles",           skills: ["Figma", "UX Research", "Prototyping", "Design Systems"] },
  { id: "marketing",label: "Marketing",            icon: Megaphone,  desc: "Growth, content & brand roles",           skills: ["SEO", "Analytics", "Content", "Campaigns"] },
  { id: "finance",  label: "Finance",              icon: TrendingUp, desc: "Investment, FP&A & risk roles",           skills: ["Excel", "Modeling", "Valuation", "Risk Analysis"] },
];

const EDUCATION_TIERS: EducationTier[] = ["Ivy/Tier-1", "Tier-2 State", "Tier-3 Regional", "Non-Degree"];
const THRESHOLDS: Record<EducationTier, { original: number; calibrated: number }> = {
  "Ivy/Tier-1":     { original: 0.50, calibrated: 0.50 },
  "Tier-2 State":   { original: 0.50, calibrated: 0.45 },
  "Tier-3 Regional":{ original: 0.50, calibrated: 0.35 },
  "Non-Degree":     { original: 0.50, calibrated: 0.25 },
};
const MITIGATION_BONUS: Record<EducationTier, number> = {
  "Ivy/Tier-1": 0, "Tier-2 State": 5, "Tier-3 Regional": 15, "Non-Degree": 25,
};
const TIER_COLORS: Record<EducationTier, string> = {
  "Ivy/Tier-1": "bg-primary",
  "Tier-2 State": "bg-accent",
  "Tier-3 Regional": "bg-warning",
  "Non-Degree": "bg-destructive",
};

interface ResumeFile {
  id: string;
  name: string;
  size: number;
  educationTier: EducationTier;
  isSample?: boolean;
}

interface Candidate {
  id: string;
  name: string;
  education: EducationTier;
  experience: string;
  skills: string[];
  originalScore: number;
  fairScore: number;
  bias: "high" | "medium" | "low";
  finalDecision?: "hired" | "rejected";
}

const EXP_POOL = ["3 yrs at Fortune 500", "5 yrs startup", "4 yrs freelance", "2 yrs agency", "6 yrs enterprise", "1 yr internship", "7 yrs mid-size co.", "3 yrs govt sector"];
const FIRST_NAMES = ["Alex", "Priya", "Raj", "Maria", "John", "Zara", "Noah", "Ravi", "Leah", "Kai", "Isha", "Diego", "Sam", "Wei", "Nina"];

function seededRandom(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function detectEducationTier(resumeText: string): EducationTier {
  const lower = resumeText.toLowerCase();
  const ivyKeywords = ["harvard", "mit", "stanford", "iit", "oxford", "cambridge", "tier-1", "ivy"];
  const stateKeywords = ["university of", "state university", "anna university", "tier-2", "state college"];
  const regionalKeywords = ["regional college", "local college", "community college", "tier-3", "regional university"];
  if (ivyKeywords.some((k) => lower.includes(k))) return "Ivy/Tier-1";
  if (stateKeywords.some((k) => lower.includes(k))) return "Tier-2 State";
  if (regionalKeywords.some((k) => lower.includes(k))) return "Tier-3 Regional";
  return "Non-Degree";
}

function fallbackEducationTier(index: number): EducationTier {
  const pattern: EducationTier[] = [
    "Ivy/Tier-1", "Tier-2 State", "Tier-3 Regional", "Non-Degree",
    "Tier-2 State", "Tier-3 Regional", "Non-Degree", "Ivy/Tier-1",
  ];
  return pattern[index % pattern.length];
}

function scoreBaseForTier(tier: EducationTier) {
  if (tier === "Ivy/Tier-1") return 76;
  if (tier === "Tier-2 State") return 66;
  if (tier === "Tier-3 Regional") return 55;
  return 45;
}

function generateCandidates(files: ResumeFile[], domain: Domain): Candidate[] {
  const skills = DOMAINS.find((d) => d.id === domain)!.skills;
  return files.map((file, index) => {
    const seed = file.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) + index * 17;
    const rand = seededRandom(seed);
    const base = scoreBaseForTier(file.educationTier);
    const original = Math.max(30, Math.min(95, Math.round(base + rand() * 20 - 10)));
    const fair = Math.max(35, Math.min(98, original + MITIGATION_BONUS[file.educationTier]));
    const diff = fair - original;
    return {
      id: file.id,
      name: `${FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]} ${String.fromCharCode(65 + (index % 26))}.`,
      education: file.educationTier,
      experience: EXP_POOL[Math.floor(rand() * EXP_POOL.length)],
      skills: skills.slice(0, 3 + Math.floor(rand() * (skills.length - 2))),
      originalScore: original,
      fairScore: fair,
      bias: diff > 18 ? "high" : diff > 8 ? "medium" : "low",
    };
  });
}

const SAMPLE_TIER_DISTRIBUTION: EducationTier[] = [
  "Ivy/Tier-1", "Ivy/Tier-1", "Ivy/Tier-1",
  "Tier-2 State", "Tier-2 State", "Tier-2 State", "Tier-2 State", "Tier-2 State",
  "Tier-3 Regional", "Tier-3 Regional", "Tier-3 Regional", "Tier-3 Regional",
  "Non-Degree", "Non-Degree", "Non-Degree",
];

function generateSampleFiles(): ResumeFile[] {
  return SAMPLE_TIER_DISTRIBUTION.map((tier, i) => ({
    id: `sample-${tier}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    name: `resume_${FIRST_NAMES[i % FIRST_NAMES.length].toLowerCase()}_${i + 1}.pdf`,
    size: Math.round(80000 + Math.random() * 120000),
    educationTier: tier,
    isSample: true,
  }));
}

const pipelineSteps = [
  { icon: Upload,          label: "Upload Resumes",   key: "upload",    step: 0 },
  { icon: Search,          label: "Detect Bias",      key: "detect",    step: 1 },
  { icon: BarChart3,       label: "Measure Fairness", key: "measure",   step: 2 },
  { icon: SlidersHorizontal, label: "Mitigate",       key: "mitigate",  step: 3 },
  { icon: Trophy,          label: "Shortlist",        key: "shortlist", step: 4 },
];

export default function JobScreeningDemo() {
  const [domain, setDomain] = useState<Domain>("software");
  const [openings, setOpenings] = useState(5);
  const [files, setFiles] = useState<ResumeFile[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [mitigationApplied, setMitigationApplied] = useState(false);
  const [shortlistRun, setShortlistRun] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const candidates = useMemo(() => generateCandidates(files, domain), [files, domain]);

  const distribution = useMemo(() =>
    EDUCATION_TIERS.map((tier) => {
      const count = candidates.filter((c) => c.education === tier).length;
      return { tier, count, percent: candidates.length ? Math.round((count / candidates.length) * 100) : 0 };
    }),
  [candidates]);

  const fairnessRows = useMemo(() =>
    EDUCATION_TIERS.map((tier) => {
      const group = candidates.filter((c) => c.education === tier);
      const qualified = group.filter((c) => c.fairScore >= 70);
      const rejected = qualified.filter((c) => c.originalScore < 70);
      const frr = qualified.length ? Math.round((rejected.length / qualified.length) * 100) : 0;
      return { tier, count: group.length, qualified: qualified.length, rejected: rejected.length, frr };
    }),
  [candidates]);

  const rankedCandidates = useMemo(() => {
    const key = mitigationApplied ? "fairScore" : "originalScore";
    const ranked = [...candidates].sort((a, b) => b[key] - a[key]);
    if (!shortlistRun) return ranked;
    return ranked.map((c, i) => ({ ...c, finalDecision: i < openings ? ("hired" as const) : ("rejected" as const) }));
  }, [candidates, mitigationApplied, shortlistRun, openings]);

  const shortlisted = useMemo(() => rankedCandidates.filter((c) => c.finalDecision === "hired"), [rankedCandidates]);
  const disadvantagedIncluded = shortlisted.filter((c) => c.education === "Tier-3 Regional" || c.education === "Non-Degree").length;
  const minorityCount = distribution.filter((r) => r.tier === "Tier-3 Regional" || r.tier === "Non-Degree").reduce((s, r) => s + r.count, 0);
  const minorityRatio = candidates.length ? Math.round((minorityCount / candidates.length) * 100) : 0;
  const maxFrr = Math.max(0, ...fairnessRows.map((r) => r.frr));
  const minFrr = Math.min(100, ...fairnessRows.map((r) => r.frr));
  const disparity = maxFrr - minFrr;
  const TARGET_SCORE = 70;

  const handleFiles = async (list: FileList | null) => {
    if (!list) return;
    const startIndex = files.length;
    const next = await Promise.all(Array.from(list).map(async (file, index) => {
      let text = file.name;
      if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
        try { text = `${file.name} ${await file.text()}`; } catch { text = file.name; }
      }
      const detected = detectEducationTier(text);
      const tier = detected === "Non-Degree" && !text.toLowerCase().includes("bootcamp") && !text.toLowerCase().includes("self-taught")
        ? fallbackEducationTier(startIndex + index)
        : detected;
      return { id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`, name: file.name, size: file.size, educationTier: tier };
    }));
    setFiles((prev) => [...prev, ...next]);
    setMitigationApplied(false);
    setShortlistRun(false);
    setActiveStep(1);
    toast.success(`${next.length} resume${next.length !== 1 ? "s" : ""} uploaded — education tiers extracted`);
  };

  const handleLoadSample = () => {
    const sample = generateSampleFiles();
    setFiles(sample);
    setMitigationApplied(false);
    setShortlistRun(false);
    setActiveStep(1);
    toast.success("15 sample resumes loaded — ready to analyse");
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setMitigationApplied(false);
    setShortlistRun(false);
  };

  const handleReset = () => {
    setFiles([]);
    setActiveStep(0);
    setMitigationApplied(false);
    setShortlistRun(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const goToStep = (index: number) => {
    if (index > 0 && candidates.length === 0) { toast.error("Upload resumes first"); return; }
    setActiveStep(index);
    if (index < 3) setMitigationApplied(false);
    if (index < 4) setShortlistRun(false);
    if (index === 4) { setMitigationApplied(true); setShortlistRun(true); }
  };

  const handleApplyMitigation = () => {
    setMitigationApplied(true);
    setActiveStep(4);
    setShortlistRun(true);
    toast.success("Threshold calibration applied — shortlist generated");
  };

  const handleExportCSV = () => {
    if (candidates.length === 0) { toast.error("Nothing to export"); return; }
    const rows = [
      ["Rank", "Name", "Education", "Experience", "Original Score", "Fair Score", "Bias", "Decision"],
      ...rankedCandidates.map((c, i) => [i + 1, c.name, c.education, c.experience, c.originalScore, c.fairScore, c.bias, c.finalDecision ?? ""]),
    ];
    const csv = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `screening-${domain}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const handleExportJSON = () => {
    if (candidates.length === 0) { toast.error("Nothing to export"); return; }
    const data = { domain, openings, target_score: TARGET_SCORE, distribution, fairnessRows, candidates: rankedCandidates };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `screening-${domain}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON exported");
  };

  const biasColor = (b: string) => b === "high" ? "text-destructive" : b === "medium" ? "text-warning" : "text-accent";
  const biasIcon = (b: string) => b === "high" ? <XCircle size={13} /> : b === "medium" ? <AlertTriangle size={13} /> : <CheckCircle size={13} />;
  const frrStatus = (frr: number) => frr >= 50 ? { text: "High Risk", cls: "text-destructive" } : frr >= 20 ? { text: "Review", cls: "text-warning" } : { text: "Acceptable", cls: "text-accent" };

  return (
    <div className="space-y-5">

      {/* ── Step 0: Setup — Job Role + Shortlist Size ── */}
      <ScrollReveal>
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary">0</div>
              <div>
                <p className="text-sm font-bold text-foreground">Setup — Choose Job Role</p>
                <p className="text-[11px] text-muted-foreground">The role determines which skills are evaluated for each candidate.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="space-y-1">
                <Label htmlFor="openings" className="text-[10px] uppercase tracking-wider text-muted-foreground">Shortlist Size</Label>
                <Input id="openings" type="number" min={1} value={openings} onChange={(e) => setOpenings(Math.max(1, parseInt(e.target.value) || 1))} className="w-24 h-8 text-sm" />
              </div>
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 h-8 mt-4">
                <RotateCcw size={13} /> Reset
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {DOMAINS.map((d) => {
              const Icon = d.icon;
              const selected = domain === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setDomain(d.id)}
                  className={`relative text-left rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] ${
                    selected
                      ? "bg-primary/12 border-primary/40 shadow-sm shadow-primary/15"
                      : "bg-secondary/30 border-border/50 hover:border-primary/25 hover:bg-secondary/50"
                  }`}
                >
                  {selected && (
                    <span className="absolute top-2 right-2">
                      <CheckCircle size={12} className="text-primary" />
                    </span>
                  )}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${selected ? "bg-primary/20" : "bg-secondary"}`}>
                    <Icon size={15} className={selected ? "text-primary" : "text-muted-foreground"} />
                  </div>
                  <p className={`text-xs font-semibold leading-tight mb-0.5 ${selected ? "text-primary" : "text-foreground"}`}>{d.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{d.desc}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {d.skills.slice(0, 3).map((s) => (
                      <span key={s} className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${selected ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>{s}</span>
                    ))}
                    {d.skills.length > 3 && <span className="text-[9px] text-muted-foreground">+{d.skills.length - 3}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Flow hint */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
            <Settings2 size={12} className="text-primary shrink-0" />
            <span>Pipeline flow:</span>
            {["Setup", "Upload Resumes", "Detect Bias", "Measure Fairness", "Mitigate", "Shortlist"].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-1">
                <span className={i === 0 ? "text-primary font-semibold" : ""}>{step}</span>
                {i < arr.length - 1 && <ChevronRight size={10} className="text-muted-foreground/50" />}
              </span>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* ── Pipeline progress bar ── */}
      <ScrollReveal delay={80}>
        <div className="glass-card p-4">
          <div className="flex items-center gap-1 flex-wrap">
            {pipelineSteps.map((step, idx) => {
              const done = activeStep > idx;
              const current = activeStep === idx;
              const locked = idx > 0 && candidates.length === 0;
              return (
                <div key={step.key} className="flex items-center gap-1">
                  <button
                    onClick={() => goToStep(idx)}
                    disabled={locked}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border whitespace-nowrap ${
                      done
                        ? "bg-primary/10 text-primary border-primary/20"
                        : current
                        ? "bg-primary/20 text-primary border-primary/40 shadow-sm shadow-primary/20"
                        : locked
                        ? "bg-secondary/30 text-muted-foreground/40 border-border/30 cursor-not-allowed"
                        : "bg-secondary/50 text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {done ? <CheckCircle size={13} className="text-primary" /> : <step.icon size={13} />}
                    {step.label}
                  </button>
                  {idx < pipelineSteps.length - 1 && (
                    <ChevronRight size={14} className={activeStep > idx ? "text-primary" : "text-muted-foreground/40"} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </ScrollReveal>

      {/* ── STEP 0: Upload ── */}
      <ScrollReveal delay={120}>
        <div className="glass-card p-6">
          <h4 className="text-base font-bold flex items-center gap-2 mb-4">
            <FileText size={18} className="text-primary" />
            Upload Resumes
            {files.length > 0 && (
              <span className="ml-auto text-xs bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full font-normal">
                {files.length} loaded
              </span>
            )}
          </h4>

          <div className="flex gap-3 mb-4">
            <label htmlFor="resume-upload" className="flex-1 block border-2 border-dashed border-border/60 hover:border-primary/40 rounded-lg p-5 text-center cursor-pointer transition-all bg-secondary/20">
              <Upload className="mx-auto mb-2 text-muted-foreground" size={24} />
              <p className="text-sm font-medium">Drop resumes here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, TXT — education tier extracted from filename/text</p>
              <input id="resume-upload" ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            </label>
            <button
              onClick={handleLoadSample}
              className="flex flex-col items-center justify-center gap-2 px-5 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition-all text-xs font-semibold whitespace-nowrap btn-press"
            >
              <Sparkles size={20} />
              Load Sample<br />15 Resumes
            </button>
          </div>

          {/* ── Upload feedback ── */}
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-accent/30 bg-accent/10 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-accent mb-3">
                  <CheckCircle size={16} />
                  {files.length} resume{files.length !== 1 ? "s" : ""} uploaded successfully
                  {files.some((f) => f.isSample) && <span className="text-xs font-normal text-accent/70">(sample data)</span>}
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Education Tier Distribution</p>
                <div className="grid sm:grid-cols-4 gap-2 mb-3">
                  {distribution.map((row) => (
                    <div key={row.tier} className="rounded-md bg-background/50 border border-border/50 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{row.tier}</p>
                      <p className="text-2xl font-bold text-foreground leading-none">{row.count}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{row.percent}% of pool</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  {distribution.map((row) => (
                    <div key={row.tier} className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground w-32 shrink-0">{row.tier}</span>
                      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full rounded-full ${TIER_COLORS[row.tier as EducationTier]}`} style={{ width: `${row.percent}%`, opacity: 0.75 }} />
                      </div>
                      <span className="text-[11px] font-semibold text-foreground w-8 text-right">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-1.5 max-h-40 overflow-y-auto">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between bg-secondary/30 rounded-md px-3 py-2 text-xs">
                    <span className="flex items-center gap-2 truncate">
                      <FileText size={11} className="text-primary shrink-0" />
                      <span className="truncate text-muted-foreground">{file.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                        file.educationTier === "Ivy/Tier-1" ? "bg-primary/15 text-primary" :
                        file.educationTier === "Tier-2 State" ? "bg-accent/15 text-accent" :
                        file.educationTier === "Tier-3 Regional" ? "bg-warning/15 text-warning" :
                        "bg-destructive/15 text-destructive"
                      }`}>{file.educationTier}</span>
                    </span>
                    <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive ml-2 shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {files.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Upload real resume files <em>or</em> click <strong className="text-primary">Load Sample 15 Resumes</strong> to try the full pipeline instantly.
            </p>
          )}
        </div>
      </ScrollReveal>

      {/* ── STEP 1: Detect Bias ── */}
      {activeStep >= 1 && candidates.length > 0 && (
        <ScrollReveal delay={80}>
          <div className="glass-card p-6 border-l-2 border-primary/40">
            <h4 className="text-base font-bold flex items-center gap-2 mb-4">
              <Search size={18} className="text-primary" />
              Detect Bias Results
            </h4>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-lg border border-border/50 bg-secondary/20 p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total Candidates</p>
                  <p className="text-3xl font-extrabold text-foreground">{candidates.length}</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Minority Ratio (Regional + Non-Degree):</span>
                  <span className="font-semibold text-foreground">{minorityCount}/{candidates.length} = {minorityRatio}%</span>
                </div>
                <div className={`flex items-center gap-1.5 text-sm font-semibold ${minorityRatio >= 25 ? "text-accent" : "text-warning"}`}>
                  {minorityRatio >= 25 ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  {minorityRatio >= 25 ? "Balanced distribution" : "Under-representation detected"}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Distribution</p>
                {distribution.map((row) => (
                  <div key={row.tier}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{row.tier}</span>
                      <span className="font-semibold text-foreground">{row.count} ({row.percent}%)</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full ${TIER_COLORS[row.tier as EducationTier]}`} style={{ width: `${Math.max(row.percent, 2)}%`, opacity: 0.75 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* ── STEP 2: Measure Fairness ── */}
      {activeStep >= 2 && candidates.length > 0 && (
        <ScrollReveal delay={80}>
          <div className="glass-card p-6 border-l-2 border-warning/40">
            <h4 className="text-base font-bold flex items-center gap-2 mb-1">
              <BarChart3 size={18} className="text-warning" />
              Measure Fairness — False Rejection Rate (FRR)
            </h4>
            <p className="text-xs text-muted-foreground mb-5">FRR = qualified candidates who were rejected ÷ total qualified. Lower is fairer.</p>

            <div className="grid md:grid-cols-[1fr_1fr] gap-6">
              {/* Bar chart */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">FRR by Education Tier</p>
                <div className="relative h-52 flex items-end gap-3 border-l border-b border-border/60 pl-3 pb-0 pr-3">
                  {/* 20% guideline */}
                  <div className="absolute left-3 right-3 border-t border-dashed border-accent/50 pointer-events-none z-10" style={{ bottom: "20%" }}>
                    <span className="absolute -top-4 right-0 text-[9px] text-accent">20% target</span>
                  </div>
                  {fairnessRows.map((row) => {
                    const st = frrStatus(row.frr);
                    return (
                      <div key={row.tier} className="flex-1 flex flex-col items-center justify-end h-full gap-1.5">
                        <span className="text-xs font-bold text-foreground">{row.frr}%</span>
                        <div
                          className={`w-full rounded-t-md transition-all duration-700 ${
                            row.frr >= 50 ? "bg-destructive" : row.frr >= 20 ? "bg-warning" : "bg-accent"
                          }`}
                          style={{ height: `${Math.max(row.frr, 4)}%` }}
                        />
                        <span className={`text-[10px] text-center leading-tight font-medium ${st.cls}`}>
                          {row.tier.split("/").join("/\n")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Results table */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Results</p>
                {fairnessRows.map((row) => {
                  const st = frrStatus(row.frr);
                  return (
                    <div key={row.tier} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-secondary/20 p-3 text-sm">
                      <div>
                        <p className="font-semibold text-foreground text-xs">{row.tier}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {row.rejected}/{Math.max(row.qualified, row.count)} rejected — {row.frr}% FRR
                        </p>
                      </div>
                      <span className={`text-xs font-bold shrink-0 ${st.cls}`}>{st.text}</span>
                    </div>
                  );
                })}
                <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-sm">
                  <span className="text-warning font-semibold">Disparity: {disparity}% gap</span>
                  <span className="text-muted-foreground text-xs ml-1">between best and worst group</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* ── STEP 3: Mitigate ── */}
      {activeStep >= 3 && candidates.length > 0 && (
        <ScrollReveal delay={80}>
          <div className="glass-card p-6 border-l-2 border-accent/40">
            <h4 className="text-base font-bold flex items-center gap-2 mb-1">
              <SlidersHorizontal size={18} className="text-accent" />
              Mitigate Bias — Threshold Calibration
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Current default threshold: <span className="text-foreground font-semibold">0.50</span>. Calibrated thresholds lower the bar for historically under-served groups.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border/50 mb-5">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-[11px] text-muted-foreground uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Group</th>
                    <th className="text-left px-4 py-3">Original</th>
                    <th className="text-left px-4 py-3">New Threshold</th>
                    <th className="text-left px-4 py-3">Change</th>
                    <th className="text-left px-4 py-3">Candidates</th>
                  </tr>
                </thead>
                <tbody>
                  {EDUCATION_TIERS.map((tier) => {
                    const t = THRESHOLDS[tier];
                    const change = t.calibrated - t.original;
                    const count = candidates.filter((c) => c.education === tier).length;
                    return (
                      <tr key={tier} className="border-t border-border/40 hover:bg-secondary/20">
                        <td className="px-4 py-3 font-medium text-foreground">{tier}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">{t.original.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-accent">{t.calibrated.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {change === 0 ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                            <span className="text-accent text-xs font-semibold">↓ {Math.abs(change).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button onClick={handleApplyMitigation} className="gap-2 w-full sm:w-auto">
              <Trophy size={14} /> Apply Mitigation &amp; Generate Shortlist
            </Button>
          </div>
        </ScrollReveal>
      )}

      {/* ── STEP 4: Shortlist ── */}
      {shortlistRun && shortlisted.length > 0 && (
        <ScrollReveal delay={80}>
          <div className="glass-card p-6 border-l-2 border-accent/60">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h4 className="text-base font-bold flex items-center gap-2">
                <Trophy size={18} className="text-accent" />
                Shortlist Results — Top {Math.min(openings, rankedCandidates.length)} Candidates
              </h4>
              <div className="flex items-center gap-2">
                <Target size={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{shortlisted.length} selected</span>
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
                  <Download size={12} /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportJSON} className="gap-1.5 text-xs">
                  <FileJson size={12} /> JSON
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/50 mb-4">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-[11px] text-muted-foreground uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Rank</th>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Education</th>
                    <th className="text-left px-4 py-3">Score</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shortlisted.map((c, i) => {
                    const fairnessLift = c.fairScore >= TARGET_SCORE && c.originalScore < TARGET_SCORE;
                    return (
                      <tr key={c.id} className="border-t border-border/40 hover:bg-secondary/10">
                        <td className="px-4 py-3 font-bold text-accent">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{c.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            c.education === "Ivy/Tier-1" ? "bg-primary/15 text-primary" :
                            c.education === "Tier-2 State" ? "bg-accent/15 text-accent" :
                            c.education === "Tier-3 Regional" ? "bg-warning/15 text-warning" :
                            "bg-destructive/15 text-destructive"
                          }`}>{c.education}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">{(c.fairScore / 100).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className="text-accent font-semibold text-xs flex items-center gap-1">
                            <CheckCircle size={12} />
                            Shortlisted{fairnessLift ? " (Fairness)" : ""}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-accent/5 border border-accent/25 rounded-lg text-sm flex items-start gap-3">
              <CheckCircle size={16} className="text-accent mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-accent mb-0.5">Fairness Note</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {disadvantagedIncluded > 0
                    ? `${disadvantagedIncluded} candidate${disadvantagedIncluded !== 1 ? "s" : ""} from disadvantaged groups (Tier-3 Regional / Non-Degree) were included after threshold calibration. Without mitigation they would have been rejected.`
                    : "All shortlisted candidates passed standard thresholds. Bias mitigation had no impact on this shortlist — distribution was already fair."}
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* ── All candidates table (always visible once uploaded) ── */}
      {candidates.length > 0 && (
        <ScrollReveal delay={100}>
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h4 className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                <User size={14} /> All Candidates ({candidates.length})
              </h4>
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
                mitigationApplied ? "bg-accent/10 text-accent border-accent/30" : "bg-secondary text-muted-foreground border-border/50"
              }`}>
                {mitigationApplied ? "Fair scores active" : "Original scores"}
              </span>
            </div>

            <div className="grid gap-2 max-h-80 overflow-y-auto">
              {rankedCandidates.map((c, i) => {
                const score = mitigationApplied ? c.fairScore : c.originalScore;
                const passes = score >= TARGET_SCORE;
                const isHired = c.finalDecision === "hired";
                return (
                  <div key={c.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-xs transition-all ${
                    shortlistRun && isHired
                      ? "border-accent/30 bg-accent/5"
                      : shortlistRun && !isHired
                      ? "border-border/30 bg-secondary/20 opacity-60"
                      : "border-border/40 bg-secondary/20"
                  }`}>
                    <span className="w-5 text-muted-foreground font-mono text-[11px] shrink-0">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User size={13} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-foreground">{c.name}</span>
                      <span className="text-muted-foreground ml-2">{c.education}</span>
                    </div>
                    <div className={`flex items-center gap-1 shrink-0 ${biasColor(c.bias)}`}>
                      {biasIcon(c.bias)}
                      <span className="hidden sm:inline">{c.bias} bias</span>
                    </div>
                    <div className={`w-10 text-right font-bold shrink-0 ${passes ? (mitigationApplied ? "text-accent" : "text-foreground") : "text-destructive/60"}`}>
                      {score}
                    </div>
                    {shortlistRun && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        isHired ? "bg-accent/15 text-accent" : "bg-secondary text-muted-foreground"
                      }`}>
                        {isHired ? "✓ Hired" : "Rejected"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
