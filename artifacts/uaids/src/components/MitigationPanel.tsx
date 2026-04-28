import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useTranslation } from "react-i18next";
import { DomainConfig, getFairnessData, getFNR, getMitigatedFNR } from "@/data/biasData";
import { CheckCircle, ArrowRight } from "lucide-react";

interface Props {
  domain: DomainConfig;
  mitigated: boolean;
  onMitigate: () => void;
  analysisReady?: boolean;
}

export default function MitigationPanel({ domain, mitigated, onMitigate, analysisReady = true }: Props) {
  const { t } = useTranslation();
  const data = analysisReady ? getFairnessData(domain) : domain.groups.map((g) => ({ name: g.name, fnr: 0, mitigatedFnr: 0 }));
  const worstGroup = domain.groups.reduce((a, b) => (getFNR(a) > getFNR(b) ? a : b));
  const beforeFNR = (getFNR(worstGroup) * 100).toFixed(0);
  const afterFNR = (getMitigatedFNR(worstGroup) * 100).toFixed(0);

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-bold text-foreground mb-4">{t("mitigation.title")}</h2>

      {!analysisReady ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="glass-card p-4 max-w-md">
            <p className="text-sm text-muted-foreground">Upload a CSV file to calculate bias metrics and enable threshold calibration.</p>
          </div>
          <button disabled className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm opacity-50 cursor-not-allowed">
            {t("mitigation.applyBtn")}
          </button>
        </div>
      ) : !mitigated ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="glass-card p-4 text-center max-w-md">
            <p className="text-sm text-muted-foreground mb-1">{t("mitigation.worstGroup")}</p>
            <p className="text-lg font-bold text-foreground">{worstGroup.name}</p>
            <p className="text-3xl font-extrabold text-destructive mt-1">{beforeFNR}% FNR</p>
          </div>
          <button onClick={onMitigate} className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all">
            {t("mitigation.applyBtn")}
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-muted-foreground">{t("mitigation.before")}</p>
              <p className="text-2xl font-bold text-destructive">{beforeFNR}%</p>
              <p className="text-xs text-muted-foreground">{worstGroup.name} FNR</p>
            </div>
            <ArrowRight className="text-accent" size={24} />
            <div className="glass-card p-4 text-center border border-accent/30">
              <p className="text-xs text-muted-foreground">{t("mitigation.after")}</p>
              <p className="text-2xl font-bold text-accent">{afterFNR}%</p>
              <p className="text-xs text-muted-foreground">{worstGroup.name} FNR</p>
            </div>
            <div className="flex items-center gap-1 text-accent text-sm font-medium">
              <CheckCircle size={16} /> {t("mitigation.biasMitigated")}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} axisLine={{ stroke: "hsl(220, 14%, 18%)" }} tickLine={false} />
              <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(222, 24%, 8%)", border: "1px solid hsl(220, 14%, 22%)", borderRadius: "8px", color: "hsl(210, 20%, 95%)", fontSize: "13px" }}
                formatter={(value: number, name: string) => [`${value}%`, name === "fnr" ? t("mitigation.original") + " FNR" : t("mitigation.mitigated") + " FNR"]} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "hsl(215, 15%, 55%)" }} formatter={(value) => (value === "fnr" ? t("mitigation.original") : t("mitigation.mitigated"))} />
              <Bar dataKey="fnr" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} opacity={0.4} />
              <Bar dataKey="mitigatedFnr" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
