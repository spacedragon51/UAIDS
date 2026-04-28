import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { useTranslation } from "react-i18next";
import { DomainConfig, getFairnessData } from "@/data/biasData";

interface Props {
  domain: DomainConfig;
  analysisReady?: boolean;
}

export default function FairnessPanel({ domain, analysisReady = true }: Props) {
  const { t } = useTranslation();
  const data = analysisReady ? getFairnessData(domain) : domain.groups.map((g) => ({ name: g.name, fnr: 0, mitigatedFnr: 0 }));
  const maxFNR = Math.max(...data.map((d) => d.fnr));
  const minFNR = Math.min(...data.map((d) => d.fnr));
  const disparity = (maxFNR - minFNR).toFixed(1);

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-bold text-foreground mb-1">{domain.metricLabel}</h2>
      <p className="text-xs text-muted-foreground mb-4">
        {t("fairness.disparity")}: <span className="text-warning font-semibold">{disparity}%</span> {t("fairness.betweenGroups")}
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} axisLine={{ stroke: "hsl(220, 14%, 18%)" }} tickLine={false} />
          <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(222, 24%, 8%)", border: "1px solid hsl(220, 14%, 22%)", borderRadius: "8px", color: "hsl(210, 20%, 95%)", fontSize: "13px" }} formatter={(value: number) => [`${value}%`, "FNR"]} />
          <ReferenceLine y={20} stroke="hsl(160, 84%, 39%)" strokeDasharray="6 3" label={{ value: `${t("fairness.target")}: 20%`, fill: "hsl(160, 84%, 39%)", fontSize: 10, position: "right" }} />
          <Bar dataKey="fnr" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="FNR" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
