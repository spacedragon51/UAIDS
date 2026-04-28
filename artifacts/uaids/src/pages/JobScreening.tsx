import { Link, NavLink, Outlet, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Upload, BarChart3, FlaskConical, Sparkles, Shield, Activity, AlertTriangle, FileCheck, ArrowLeft, Briefcase } from "lucide-react";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import HamburgerMenu from "@/components/HamburgerMenu";

import { UploadPage } from "./jobScreening/Upload";
import { BiasAuditPage } from "./jobScreening/BiasAudit";
import { PreprocessPage } from "./jobScreening/Preprocess";
import { TrainPage } from "./jobScreening/Train";
import { FairnessPage } from "./jobScreening/Fairness";
import { PredictPage } from "./jobScreening/Predict";
import { RejectQueuePage } from "./jobScreening/RejectQueue";
import { MonitorPage } from "./jobScreening/Monitor";
import { CompliancePage } from "./jobScreening/Compliance";

const NAV = [
  { to: "", label: "Upload", icon: Upload, end: true },
  { to: "bias", label: "Bias Audit", icon: BarChart3 },
  { to: "preprocess", label: "Preprocessing", icon: FlaskConical },
  { to: "train", label: "Train Model", icon: Sparkles },
  { to: "fairness", label: "Fairness", icon: Shield },
  { to: "predict", label: "Predict & Explain", icon: Activity },
  { to: "reject-queue", label: "Reject Queue", icon: AlertTriangle },
  { to: "monitor", label: "Live Monitor", icon: Activity },
  { to: "compliance", label: "Compliance", icon: FileCheck },
];

function JobScreeningLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors btn-press px-2 py-1 rounded-md hover:bg-secondary">
              <Home size={14} /> Home
            </Link>
            <Link to="/dashboard" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors btn-press px-2 py-1 rounded-md hover:bg-secondary">
              <ArrowLeft size={14} /> Dashboard
            </Link>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              {t ? t("header.auditActive", { defaultValue: "Audit Active" }) : "Audit Active"}
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
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-4">
              <Briefcase size={14} /> Job Screening Workspace
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold gradient-text-primary mb-2 leading-tight">
              Unbiased AI Job Screening
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
              Upload resumes, audit bias, preprocess fairly, train an adversarially debiased model,
              evaluate fairness, generate predictions, and monitor for drift — all in one workspace.
            </p>
          </div>
        </section>

        <nav className="glass-card p-2 flex flex-wrap gap-1 sticky top-[72px] z-40">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to || "upload"}
                to={n.to}
                end={n.end as boolean | undefined}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-xs sm:text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {n.label}
              </NavLink>
            );
          })}
        </nav>

        <div key={location.pathname} className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default function JobScreening() {
  return (
    <Routes>
      <Route element={<JobScreeningLayout />}>
        <Route index element={<UploadPage />} />
        <Route path="bias" element={<BiasAuditPage />} />
        <Route path="preprocess" element={<PreprocessPage />} />
        <Route path="train" element={<TrainPage />} />
        <Route path="fairness" element={<FairnessPage />} />
        <Route path="predict" element={<PredictPage />} />
        <Route path="reject-queue" element={<RejectQueuePage />} />
        <Route path="monitor" element={<MonitorPage />} />
        <Route path="compliance" element={<CompliancePage />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  );
}
