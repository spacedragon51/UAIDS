import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Domain, domains, GroupData } from "@/data/biasData";
import { buildDomainConfigFromCsv } from "@/lib/csvAnalysis";
import DomainSelector from "@/components/DomainSelector";
import StatsBar from "@/components/StatsBar";
import RepresentationPanel from "@/components/RepresentationPanel";
import FairnessPanel from "@/components/FairnessPanel";
import MitigationPanel from "@/components/MitigationPanel";
import CsvUploader from "@/components/CsvUploader";
import AuditTrailPanel from "@/components/AuditTrailPanel";
import AlertsPanel from "@/components/AlertsPanel";
import ModelVersionPanel from "@/components/ModelVersionPanel";
import JobHiringPipeline from "@/components/JobHiringPipeline";
import DomainAnalysisActions from "@/components/DomainAnalysisActions";
import UserMenu from "@/components/UserMenu";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import HamburgerMenu from "@/components/HamburgerMenu";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { Home, FileSearch, Banknote, Activity, Shield, Sparkles, ArrowDown, BarChart3, Layers, Stethoscope } from "lucide-react";
import { getAuditLogs } from "@/hooks/useAuditLog";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedDomain, setSelectedDomain] = useState<Domain>("healthcare");
  const [mitigatedMap, setMitigatedMap] = useState<Record<Domain, boolean>>({
    healthcare: false,
    banking: false,
    job: false,
  });
  const [resetKey, setResetKey] = useState<Record<Domain, number>>({
    healthcare: 0,
    banking: 0,
    job: 0,
  });
  const [analysisReadyMap, setAnalysisReadyMap] = useState<Record<Domain, boolean>>({
    healthcare: false,
    banking: false,
    job: false,
  });
  const [csvGroupsMap, setCsvGroupsMap] = useState<Record<Domain, GroupData[] | null>>({
    healthcare: null,
    banking: null,
    job: null,
  });

  useEffect(() => {
    setMitigatedMap({ healthcare: false, banking: false, job: false });
    setAnalysisReadyMap({ healthcare: false, banking: false, job: false });
    setCsvGroupsMap({ healthcare: null, banking: null, job: null });
    setResetKey((prev) => ({ healthcare: prev.healthcare + 1, banking: prev.banking + 1, job: prev.job + 1 }));
    setSelectedDomain("healthcare");
  }, [user?.id]);

  const baseDomain = domains[selectedDomain];
  const csvGroups = csvGroupsMap[selectedDomain];
  const domain = csvGroups && csvGroups.length > 0 ? buildDomainConfigFromCsv(baseDomain, csvGroups) : baseDomain;
  const mitigated = mitigatedMap[selectedDomain];
  const analysisReady = analysisReadyMap[selectedDomain];

  const handleMitigate = async () => {
    setMitigatedMap((prev) => ({ ...prev, [selectedDomain]: true }));
    await logAuditEvent("mitigation_applied", "domain", undefined, { domain: selectedDomain, method: "threshold_calibration" });
  };

  const handleResetDomain = () => {
    setMitigatedMap((prev) => ({ ...prev, [selectedDomain]: false }));
    setAnalysisReadyMap((prev) => ({ ...prev, [selectedDomain]: false }));
    setCsvGroupsMap((prev) => ({ ...prev, [selectedDomain]: null }));
    setResetKey((prev) => ({ ...prev, [selectedDomain]: prev[selectedDomain] + 1 }));
  };

  const CorePipeline = (
    <div key={`${selectedDomain}-${resetKey[selectedDomain]}`} className="space-y-6">
      <CsvUploader
        domain={selectedDomain}
        onUploadStart={() => {
          setMitigatedMap((prev) => ({ ...prev, [selectedDomain]: false }));
          setAnalysisReadyMap((prev) => ({ ...prev, [selectedDomain]: false }));
          setCsvGroupsMap((prev) => ({ ...prev, [selectedDomain]: null }));
        }}
        onUploadComplete={() => setAnalysisReadyMap((prev) => ({ ...prev, [selectedDomain]: true }))}
        onAnalysis={(groups) => setCsvGroupsMap((prev) => ({ ...prev, [selectedDomain]: groups }))}
      />
      <StatsBar domain={domain} mitigated={mitigated} analysisReady={analysisReady} />
      <div className="grid md:grid-cols-2 gap-6">
        <RepresentationPanel domain={domain} analysisReady={analysisReady} />
        <FairnessPanel domain={domain} analysisReady={analysisReady} />
      </div>
      <MitigationPanel domain={domain} mitigated={mitigated} onMitigate={handleMitigate} analysisReady={analysisReady} />
      <DomainAnalysisActions domain={selectedDomain} domainConfig={domain} mitigated={mitigated} onReset={handleResetDomain} />
      <div className="grid md:grid-cols-2 gap-6">
        <ModelVersionPanel domain={selectedDomain} />
        <AlertsPanel />
      </div>
      <AuditTrailPanel />
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{t("footer.sensitiveAttr")}: <span className="text-foreground font-medium">{domain.sensitiveAttribute}</span></span>
        <span>{t("footer.pipeline")}</span>
        <span>{t("footer.framework")}</span>
      </div>
    </div>
  );

  // Healthcare now reuses the full CorePipeline so the dashboard panels (stats,
  // representation, fairness, mitigation) populate after either a CSV upload or
  // an image-based melanoma prediction.

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors btn-press px-2 py-1 rounded-md hover:bg-secondary">
              <Home size={14} /> Home
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              {t("header.auditActive")}
            </div>
            <LanguageSwitcher />
            <ThemeToggle />
            <UserMenu />
            <HamburgerMenu />
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-6 py-8 space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/40 to-accent/10 p-6 sm:p-8 animate-fade-in">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-12 w-72 h-72 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-6 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
                <Sparkles size={14} /> Bias Audit Workspace
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold gradient-text-primary mb-3 leading-tight">
                {t("hero.title")}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mb-5 leading-relaxed">
                {t("hero.description")}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => document.getElementById("domain-picker")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  Choose a domain <ArrowDown size={14} />
                </button>
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground rounded-lg border border-border/60 hover:bg-secondary transition-colors"
                >
                  <Home size={13} /> Back to home
                </Link>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground rounded-lg border border-border/40">
                  <Shield size={13} className="text-accent" /> Audit trail enabled
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(() => {
                const logs = getAuditLogs();
                const stats = [
                  { icon: Layers, label: "Domains", value: Object.keys(domains).length, color: "text-primary" },
                  { icon: Activity, label: "Audits", value: logs.length, color: "text-accent" },
                  { icon: BarChart3, label: "Mitigations", value: logs.filter((l) => l.action === "mitigation_applied").length, color: "text-chart-4" },
                ];
                return stats.map((s) => (
                  <div key={s.label} className="rounded-xl border border-border/50 bg-card/60 backdrop-blur p-3 text-center">
                    <s.icon size={16} className={`${s.color} mx-auto mb-1.5`} />
                    <div className={`text-xl font-extrabold ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </section>

        <div id="domain-picker" className="scroll-mt-24">
          <DomainSelector selected={selectedDomain} onSelect={setSelectedDomain} />
        </div>

        <div className="glass-card px-5 py-3 text-sm text-muted-foreground border-l-2 border-primary/50">
          {domain.description}
        </div>

        {selectedDomain === "job" && <JobHiringPipeline />}

        {selectedDomain === "job" ? (
          <div className="space-y-6">
            <div className="glass-card p-6 border-l-2 border-primary/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <FileSearch size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">AI Resume Screener — Full Workspace</h3>
                  <p className="text-sm text-muted-foreground">
                    Open the dedicated job-screening workspace to upload resumes, audit bias, train an
                    adversarially debiased model, and monitor predictions for fairness drift.
                  </p>
                </div>
              </div>
              <Link
                to="/job-screening"
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                Open Job Screening <ArrowDown size={14} className="-rotate-90" />
              </Link>
            </div>
          </div>
        ) : selectedDomain === "banking" ? (
          <div className="space-y-6">
            <div className="glass-card p-6 border-l-2 border-primary/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Banknote size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">Unbiased Banking AI System — Full Workspace</h3>
                  <p className="text-sm text-muted-foreground">
                    Open the dedicated banking workspace covering three products in one — Credit Card Limit,
                    Personal Loan Approval and Overdraft Eligibility — with the full MEASURE / FLAG / FIX
                    framework: per-group selection rates, ΔTPR / ΔFPR, Disparate Impact, MAE & limit ratio,
                    historical-bias gates, reweighting and a human-loan-officer reject option.
                  </p>
                </div>
              </div>
              <Link
                to="/loan-approval"
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                Open Banking Workspace <ArrowDown size={14} className="-rotate-90" />
              </Link>
            </div>
          </div>
        ) : selectedDomain === "healthcare" ? (
          <div className="space-y-6">
            <div className="glass-card p-6 border-l-2 border-primary/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1">FairScope Health — Clinical Workspace</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a ZIP of dermoscopy images plus a mapping CSV to detect FNR parity bias across
                    skin tones, surface the exact missed-malignancy cases, and generate a clinical audit report.
                  </p>
                </div>
              </div>
              <Link
                to="/healthcare"
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-all hover:-translate-y-0.5 active:scale-95"
              >
                Open Clinical Workspace <ArrowDown size={14} className="-rotate-90" />
              </Link>
            </div>
          </div>
        ) : (
          CorePipeline
        )}
      </main>
    </div>
  );
}
