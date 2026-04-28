import { useTranslation } from "react-i18next";
import { DomainConfig, getTotalSamples, getMinorityRatio, getFNR, getMitigatedFNR } from "@/data/biasData";
import { Database, Users, AlertTriangle, Shield } from "lucide-react";

interface Props {
  domain: DomainConfig;
  mitigated: boolean;
  analysisReady?: boolean;
}

export default function StatsBar({ domain, mitigated, analysisReady = true }: Props) {
  const { t } = useTranslation();
  const total = analysisReady ? getTotalSamples(domain) : 0;
  const ratio = analysisReady ? getMinorityRatio(domain) : 0;
  const fnrValues = analysisReady ? domain.groups.map((g) => (mitigated ? getMitigatedFNR(g) : getFNR(g))) : [0];
  const worstFNR = Math.max(...fnrValues);
  const bestFNR = Math.min(...fnrValues);
  const disparityPct = ((worstFNR - bestFNR) * 100).toFixed(1);

  const stats = [
    { label: t("stats.totalSamples"), value: total.toLocaleString(), icon: Database, color: "text-primary" },
    { label: t("stats.minorityRatio"), value: `${(ratio * 100).toFixed(1)}%`, icon: AlertTriangle, color: ratio < 0.25 ? "text-warning" : "text-success" },
    { label: `${t("stats.maxFnr")}${mitigated ? " (mitigated)" : ""}`, value: `${(worstFNR * 100).toFixed(0)}%`, icon: Shield, color: mitigated ? "text-success" : worstFNR > 0.4 ? "text-destructive" : "text-warning" },
    { label: "Disparity", value: `${disparityPct}%`, icon: Users, color: parseFloat(disparityPct) > 30 ? "text-destructive" : "text-success" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="glass-card p-4 flex items-center gap-3">
          <s.icon className={`${s.color} shrink-0`} size={20} />
          <div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold text-foreground">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
