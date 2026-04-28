import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Home, ArrowLeft, Banknote, ShieldCheck, Activity, Sparkles,
  AlertTriangle, FileCheck, Scale, Brain,
} from "lucide-react";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import HamburgerMenu from "@/components/HamburgerMenu";
import BankingAISystem from "@/components/BankingAISystem";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoanApproval() {
  const { t } = useTranslation();
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
              <Banknote size={14} /> Banking Workspace
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold gradient-text-primary mb-2 leading-tight">
              Unbiased Banking AI System
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
              MEASURE, FLAG, and FIX bias across three banking products in one workspace —
              <strong> Credit Card Limit Assignment</strong> (regression),
              <strong> Personal Loan Approval</strong> (classification), and
              <strong> Overdraft Privilege Eligibility</strong> (classification) — using a single CSV with
              applicant demographics, financial features, and the three product labels.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Pill icon={ShieldCheck}>Disparate Impact &lt; 0.8 detection</Pill>
              <Pill icon={Activity}>Per-group AUC, ΔTPR / ΔFPR, MAE</Pill>
              <Pill icon={Sparkles}>Reweighting + reject-option FIX</Pill>
              <Pill icon={FileCheck}>Fair Lending Compliance Report</Pill>
            </div>
          </div>
        </section>

        <div className="grid md:grid-cols-3 gap-4">
          <FrameworkCard
            phase="MEASURE"
            icon={Brain}
            description="Detect race / gender / age / marital composition. Train baseline models per product and compute per-group selection rates, TPR, FPR, AUC, MAE and limit ratio."
          />
          <FrameworkCard
            phase="FLAG"
            icon={AlertTriangle}
            description="Critical alerts on Disparate Impact < 0.8 (4/5ths rule), ΔTPR > 5%, ΔFPR > 5%, limit ratio < 0.8, MAE gap > $500, and historical bias gap > 20%."
          />
          <FrameworkCard
            phase="FIX"
            icon={Scale}
            description="Apply per-group reweighting, retrain all three product models, and add a confidence-based reject option that routes borderline applicants to a human loan officer."
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Banknote size={20} className="text-primary" />
              <div>
                <CardTitle className="text-lg">Banking AI — interactive workspace</CardTitle>
                <CardDescription className="text-xs">
                  Load the synthetic dataset (or upload your own banking CSV), inspect bias across all
                  three products side-by-side, and watch the metrics improve after the FIX pass.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <BankingAISystem />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function Pill({ icon: Icon, children }: { icon: typeof Banknote; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-card/60 border border-border/60 px-3 py-1 text-xs text-foreground/80">
      <Icon size={12} /> {children}
    </span>
  );
}

function FrameworkCard({
  phase,
  icon: Icon,
  description,
}: {
  phase: string;
  icon: typeof Banknote;
  description: string;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Icon size={18} />
          </div>
          <CardTitle className="text-base font-bold tracking-wide">{phase}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
