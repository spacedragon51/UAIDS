import { BarChart3, FileSearch, Scale, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";

const HIRING_STEPS = [
  { label: "Resume Screening", outcome: "Top 100 candidates", icon: FileSearch },
  { label: "Technical Round 1", outcome: "Top 50 candidates", icon: BarChart3 },
  { label: "Technical Round 2", outcome: "Top 20 candidates", icon: Scale },
  { label: "Final Selection", outcome: "Offer-ready shortlist", icon: ShieldCheck },
];

const AUDIT_STEPS = [
  { title: "Step 1: Representation", desc: "Measure whether each education and background group is sufficiently represented at every hiring stage.", icon: Users },
  { title: "Step 2: False Rejection Rate", desc: "Compare qualified-but-rejected rates across groups to detect unfair screening loss.", icon: Scale },
  { title: "Step 3: Threshold Calibration", desc: "Adjust stage-specific thresholds so qualified candidates are not filtered out by proxy bias.", icon: SlidersHorizontal },
];

export default function JobHiringPipeline() {
  return (
    <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <FileSearch className="text-primary" size={18} />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Hiring Pipeline</h3>
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          {HIRING_STEPS.map((step, index) => (
            <div key={step.label} className="relative rounded-xl border border-border/60 bg-secondary/25 p-4 hover:border-primary/30 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <step.icon className="text-primary" size={17} />
              </div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Stage {index + 1}</div>
              <div className="text-sm font-semibold text-foreground">{step.label}</div>
              <div className="text-xs text-muted-foreground mt-2">{step.outcome}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck className="text-accent" size={18} />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Bias Detection & Mitigation</h3>
        </div>
        <div className="space-y-3">
          {AUDIT_STEPS.map((step) => (
            <div key={step.title} className="flex gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <step.icon className="text-accent" size={15} />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{step.title}</div>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
