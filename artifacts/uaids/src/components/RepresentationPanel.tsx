import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslation } from "react-i18next";
import { DomainConfig, getRepresentationData, getTotalSamples, getMinorityRatio } from "@/data/biasData";
import { AlertTriangle, CheckCircle } from "lucide-react";

const COLORS = [
  "hsl(199, 89%, 48%)", "hsl(160, 84%, 39%)", "hsl(38, 92%, 50%)",
  "hsl(280, 67%, 60%)", "hsl(0, 72%, 51%)", "hsl(220, 70%, 55%)",
];

interface Props {
  domain: DomainConfig;
  analysisReady?: boolean;
}

export default function RepresentationPanel({ domain, analysisReady = true }: Props) {
  const { t } = useTranslation();
  const data = analysisReady ? getRepresentationData(domain) : domain.groups.map((g) => ({ name: g.name, value: 0 }));
  const total = analysisReady ? getTotalSamples(domain) : 0;
  const ratio = analysisReady ? getMinorityRatio(domain) : 0;
  const hasBias = ratio < 0.25;

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-bold text-foreground mb-4">{t("representation.title")}</h2>
      <div className="grid grid-cols-2 gap-6">
        <div className="flex items-center justify-center">
          {analysisReady ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(222, 24%, 8%)", border: "1px solid hsl(220, 14%, 22%)", borderRadius: "8px", color: "hsl(210, 20%, 95%)", fontSize: "13px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] w-full rounded-xl border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
              Upload a CSV to populate data
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center gap-3">
          <div className="glass-card p-3">
            <span className="text-xs text-muted-foreground">{t("representation.totalSamples")}</span>
            <p className="text-2xl font-bold text-foreground">{total.toLocaleString()}</p>
          </div>
          <div className="glass-card p-3">
            <span className="text-xs text-muted-foreground">{t("representation.minorityRatio")}</span>
            <p className="text-2xl font-bold text-foreground">{(ratio * 100).toFixed(1)}%</p>
          </div>
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${analysisReady && hasBias ? "bg-warning/10 border-warning/30 text-warning" : "bg-success/10 border-success/30 text-success"}`}>
            {analysisReady && hasBias ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
            <span className="text-sm font-medium">
              {!analysisReady ? "Awaiting CSV upload" : hasBias ? t("representation.biasDetected") : t("representation.balanced")}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-4">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span>{d.name}: {d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
