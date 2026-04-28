import { useTranslation } from "react-i18next";
import { Domain, domains } from "@/data/biasData";
import { CheckCircle2, ArrowRight } from "lucide-react";

interface Props {
  selected: Domain;
  onSelect: (d: Domain) => void;
}

const domainList = Object.values(domains);

const DOMAIN_META: Record<Domain, { tagline: string; metric: string; accent: string }> = {
  healthcare: {
    tagline: "Audit clinical triage models for race-based disparities.",
    metric: "False negative rate",
    accent: "from-primary/20 to-primary/0",
  },
  banking: {
    tagline: "Detect gender bias in loan approval decisions.",
    metric: "Equalized odds",
    accent: "from-accent/20 to-accent/0",
  },
  job: {
    tagline: "Score resume screening pipelines for ethnicity bias.",
    metric: "Demographic parity",
    accent: "from-warning/20 to-warning/0",
  },
};

export default function DomainSelector({ selected, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Step 1 — Choose a domain
          </h3>
          <p className="text-xs text-muted-foreground/80 mt-0.5">
            Each domain ships with sample groups, a sensitive attribute, and tuned mitigation thresholds.
          </p>
        </div>
        <span className="hidden sm:inline-flex text-[10px] uppercase tracking-wider text-muted-foreground/60 px-2 py-1 rounded-full border border-border/50">
          {domainList.length} available
        </span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {domainList.map((d) => {
          const isSelected = selected === d.id;
          const meta = DOMAIN_META[d.id];
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={`relative group text-left rounded-xl border p-5 transition-all duration-200 overflow-hidden ${
                isSelected
                  ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10 -translate-y-0.5"
                  : "border-border bg-card/40 hover:border-primary/30 hover:bg-secondary/40 hover:-translate-y-0.5"
              }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${meta.accent} opacity-60 pointer-events-none`}
              />

              <div className="relative flex items-start justify-between gap-3 mb-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl transition-transform duration-300 ${
                    isSelected
                      ? "bg-primary/15 border border-primary/30 scale-105"
                      : "bg-secondary border border-border/60 group-hover:scale-105"
                  }`}
                >
                  <span>{d.icon}</span>
                </div>
                {isSelected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    <CheckCircle2 size={12} /> Selected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open <ArrowRight size={11} />
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="text-base font-semibold mb-1">{t(`domains.${d.id}`)}</div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
                  {meta.tagline}
                </p>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/70 text-secondary-foreground border border-border/50">
                    {d.sensitiveAttribute}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/70 text-secondary-foreground border border-border/50">
                    {meta.metric}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/70 text-secondary-foreground border border-border/50">
                    {d.groups.length} groups
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
