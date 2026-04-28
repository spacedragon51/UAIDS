import { Link } from "react-router-dom";
import {
  LayoutDashboard, FileSearch, BarChart3, Shield, ArrowRight,
  Clock, Sparkles, FileText, TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getAuditLogs } from "@/hooks/useAuditLog";
import ScrollReveal from "./ScrollReveal";

const QUICK_ACTIONS = [
  { icon: LayoutDashboard, label: "Open Dashboard", href: "/dashboard", color: "text-primary", bg: "bg-primary/10" },
  { icon: FileSearch, label: "Resume Screener", href: "/dashboard", color: "text-accent", bg: "bg-accent/10" },
  { icon: BarChart3, label: "Fairness Metrics", href: "/dashboard", color: "text-chart-4", bg: "bg-chart-4/10" },
  { icon: Shield, label: "Audit Trail", href: "/dashboard", color: "text-warning", bg: "bg-warning/10" },
];

export default function WelcomeBackSection() {
  const { user } = useAuth();
  const logs = getAuditLogs();

  if (!user) return null;

  const displayName =
    (user.user_metadata?.display_name as string) ||
    (user.user_metadata?.full_name as string) ||
    user.email?.split("@")[0] ||
    "there";

  const stats = {
    total: logs.filter(l => l.entity_type === "bias_report" || l.entity_type === "domain").length,
    mitigated: logs.filter(l => l.action === "mitigation_applied").length,
    datasets: logs.filter(l => l.entity_type === "dataset").length,
  };

  return (
    <section className="pt-28 pb-16 px-4 sm:px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="container max-w-7xl mx-auto relative">
        <ScrollReveal>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-5">
            <Sparkles size={14} /> Welcome back
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3">
            Hello, <span className="gradient-text-primary capitalize">{displayName}</span> 👋
          </h1>
          <p className="text-muted-foreground text-base max-w-xl mb-8">
            Pick up where you left off — your fairness audits, datasets, and reports are ready.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: "Reports Generated", value: stats.total, icon: FileText, color: "text-primary" },
            { label: "Bias Mitigated", value: stats.mitigated, icon: TrendingUp, color: "text-accent" },
            { label: "Datasets Uploaded", value: stats.datasets, icon: BarChart3, color: "text-chart-4" },
          ].map((s, i) => (
            <ScrollReveal key={s.label} delay={80 * i}>
              <div className="glass-card p-5 hover-lift">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</span>
                  <s.icon size={16} className={s.color} />
                </div>
                <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
          <ScrollReveal direction="left">
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                <LayoutDashboard size={14} /> Your Services
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {QUICK_ACTIONS.map((a, i) => (
                  <Link key={a.label} to={a.href}
                    className="group flex items-center gap-3 p-4 rounded-lg border border-border/50 bg-secondary/20 hover:border-primary/40 hover:bg-secondary/40 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className={`w-10 h-10 rounded-lg ${a.bg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
                      <a.icon size={18} className={a.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{a.label}</div>
                      <div className="text-[11px] text-muted-foreground">Open now</div>
                    </div>
                    <ArrowRight size={14} className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="right">
            <div className="glass-card p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                  <Clock size={14} /> Recent Activity
                </h3>
                <Link to="/dashboard" className="text-xs text-primary hover:underline">View all</Link>
              </div>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <FileText className="mx-auto mb-2 opacity-40" size={28} />
                  No activity yet — start by uploading a dataset.
                  <div className="mt-4">
                    <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                      Get started <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.slice(0, 5).map((l) => (
                    <Link key={l.id} to="/dashboard"
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border border-border/40 hover:border-primary/30 hover:bg-secondary/40 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText size={14} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium capitalize truncate">{l.action.replace(/_/g, " ")}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={200}>
          <div className="mt-8 flex justify-center">
            <Link to="/dashboard"
              className="inline-flex px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30 active:scale-95 items-center gap-2"
            >
              Go to Dashboard <ArrowRight size={18} />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
