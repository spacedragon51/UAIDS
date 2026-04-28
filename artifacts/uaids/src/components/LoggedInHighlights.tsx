import { Link } from "react-router-dom";
import {
  ArrowRight, Sparkles, Activity, Bell, Database, Stethoscope,
  Banknote, Briefcase, ShieldCheck, FileDown, Zap, ChevronRight
} from "lucide-react";
import ScrollReveal from "./ScrollReveal";
import { useAuth } from "@/hooks/useAuth";
import { getAuditLogs } from "@/hooks/useAuditLog";

const DOMAIN_SHORTCUTS = [
  {
    icon: Stethoscope,
    title: "Healthcare",
    desc: "Triage models, sensitive attribute: race",
    color: "text-primary",
    bg: "bg-primary/10",
    badge: "FNR audit",
  },
  {
    icon: Banknote,
    title: "Banking",
    desc: "Loan approval, sensitive attribute: gender",
    color: "text-accent",
    bg: "bg-accent/10",
    badge: "Equalized odds",
  },
  {
    icon: Briefcase,
    title: "Job Screening",
    desc: "Resume parsing, sensitive attribute: ethnicity",
    color: "text-warning",
    bg: "bg-warning/10",
    badge: "Demographic parity",
  },
];

const TOOLBOX = [
  { icon: ShieldCheck, label: "Compliance Snapshot", desc: "HIPAA · ECOA · GDPR" },
  { icon: FileDown, label: "Export Reports", desc: "CSV / JSON / PDF" },
  { icon: Bell, label: "Drift Alerts", desc: "Real-time threshold notifications" },
  { icon: Activity, label: "Live Monitoring", desc: "Continuous fairness scoring" },
];

export default function LoggedInHighlights() {
  const { user } = useAuth();
  const logs = getAuditLogs();

  const totalRuns = logs.length;
  const lastRun = logs[0]?.created_at ? new Date(logs[0].created_at).toLocaleDateString() : "—";
  const accountAge = user ? "Active" : "—";

  return (
    <section className="py-16 px-4 sm:px-6 bg-card/30">
      <div className="container max-w-7xl mx-auto">
        <ScrollReveal>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-4">
                <Sparkles size={14} /> Pick up where you left off
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">Your Workspace</h2>
              <p className="text-muted-foreground max-w-xl">
                Jump straight into a domain, review what you've audited, or open a tool from your fairness toolbox.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[340px]">
              <div className="glass-card px-3 py-2 text-center">
                <div className="text-lg font-bold text-primary">{totalRuns}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Audit events</div>
              </div>
              <div className="glass-card px-3 py-2 text-center">
                <div className="text-sm font-bold text-accent truncate">{lastRun}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Last activity</div>
              </div>
              <div className="glass-card px-3 py-2 text-center">
                <div className="text-sm font-bold text-chart-4">{accountAge}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Account</div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
          <ScrollReveal direction="left">
            <div className="glass-card p-6 h-full">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Database size={14} /> Jump into a domain
                </h3>
                <Link to="/dashboard" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                  Open dashboard <ChevronRight size={12} />
                </Link>
              </div>

              <div className="space-y-3">
                {DOMAIN_SHORTCUTS.map((d) => (
                  <Link
                    key={d.title}
                    to="/dashboard"
                    className="group flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-secondary/20 hover:border-primary/40 hover:bg-secondary/40 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <div className={`w-12 h-12 rounded-xl ${d.bg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
                      <d.icon size={22} className={d.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{d.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${d.bg} ${d.color} font-medium`}>
                          {d.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{d.desc}</p>
                    </div>
                    <ArrowRight
                      size={16}
                      className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary shrink-0"
                    />
                  </Link>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right">
            <div className="glass-card p-6 h-full flex flex-col">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-2 mb-5">
                <Zap size={14} /> Fairness toolbox
              </h3>

              <div className="grid grid-cols-2 gap-3 flex-1">
                {TOOLBOX.map((t) => (
                  <Link
                    key={t.label}
                    to="/dashboard"
                    className="group flex flex-col gap-2 p-3 rounded-lg border border-border/40 bg-secondary/20 hover:border-primary/30 hover:bg-secondary/40 transition-all"
                  >
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <t.icon size={15} className="text-primary" />
                    </div>
                    <div className="text-xs font-semibold leading-tight">{t.label}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{t.desc}</div>
                  </Link>
                ))}
              </div>

              <Link
                to="/dashboard"
                className="mt-4 inline-flex justify-center items-center gap-2 w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
              >
                Open full dashboard <ArrowRight size={14} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
