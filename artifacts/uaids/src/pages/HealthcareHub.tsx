import { Link } from "react-router-dom";
import {
  Home, ArrowLeft, Stethoscope, Microscope, ArrowRight,
  ShieldCheck, Activity, Sparkles,
} from "lucide-react";
import Logo from "@/components/Logo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import HamburgerMenu from "@/components/HamburgerMenu";
import ScrollReveal from "@/components/ScrollReveal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SystemEntry {
  id: string;
  to: string;
  title: string;
  tagline: string;
  description: string;
  bullets: string[];
  icon: typeof Stethoscope;
  status: "live" | "coming-soon";
}

const SYSTEMS: SystemEntry[] = [
  {
    id: "melanoma",
    to: "/healthcare/melanoma",
    title: "Dermoscopic Melanoma Detection",
    tagline: "MEASURE → FLAG → FIX for skin lesion AI",
    description:
      "Upload a dermoscopic lesion image. The model estimates Fitzpatrick skin type and lesion location, scores melanoma probability with a Grad-CAM explanation, and audits performance across skin tones and acral vs non-acral lesions.",
    bullets: [
      "Per-image: Fitzpatrick + location + melanoma probability + Grad-CAM",
      "Cohort: per-skin-type AUC, sensitivity, fairness gap tracker",
      "Mitigations: adversarial debiasing, GAN augmentation, reweighting, reject option",
    ],
    icon: Microscope,
    status: "live",
  },
];

export default function HealthcareHub() {
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
            <LanguageSwitcher />
            <ThemeToggle />
            <UserMenu />
            <HamburgerMenu />
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-6 py-10 space-y-10">
        <ScrollReveal>
        <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/40 to-card/10 p-8 md:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Stethoscope size={14} /> FairScope Health
          </div>
          <h1 className="mt-5 text-3xl md:text-5xl font-extrabold tracking-tight text-primary">
            Healthcare AI Fairness Systems
          </h1>
          <p className="mt-4 max-w-3xl text-base md:text-lg text-muted-foreground leading-relaxed">
            Pick a clinical AI system to audit. Each system runs the same MEASURE → FLAG → FIX pipeline
            tailored to its modality, surfacing demographic performance gaps and letting you toggle
            mitigations to see how the fairness gap closes.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Pill icon={ShieldCheck}>Per-group AUC &amp; sensitivity</Pill>
            <Pill icon={Activity}>Live fairness gap tracker</Pill>
            <Pill icon={Sparkles}>Toggleable bias mitigations</Pill>
          </div>
        </section>
        </ScrollReveal>

        <ScrollReveal delay={80}>
        <section>
          <h2 className="text-xl md:text-2xl font-bold mb-4">Available systems</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SYSTEMS.map((s, i) => (
              <ScrollReveal key={s.id} delay={120 + i * 80}>
                <SystemCard entry={s} />
              </ScrollReveal>
            ))}
          </div>
        </section>
        </ScrollReveal>
      </main>
    </div>
  );
}

function Pill({ icon: Icon, children }: { icon: typeof Stethoscope; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-card/60 border border-border/60 px-3 py-1 text-xs text-foreground/80">
      <Icon size={12} /> {children}
    </span>
  );
}

function SystemCard({ entry }: { entry: SystemEntry }) {
  const Icon = entry.icon;
  return (
    <Link to={entry.to} className="group block focus:outline-none">
      <Card className="h-full transition-all border-border/60 group-hover:border-primary/60 group-hover:-translate-y-0.5 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-primary/50">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Icon size={22} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg">{entry.title}</CardTitle>
              <CardDescription className="text-xs mt-1">{entry.tagline}</CardDescription>
            </div>
            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
              Live
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{entry.description}</p>
          <ul className="space-y-1.5">
            {entry.bullets.map((b) => (
              <li key={b} className="text-xs text-foreground/80 flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            Open system
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

