import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GitBranch, Plus, Star } from "lucide-react";
import { logAuditEvent } from "@/hooks/useAuditLog";
import type { Domain } from "@/data/biasData";

interface ModelVersion {
  id: string; name: string; version: string; domain: string;
  description: string | null; is_active: boolean; created_at: string;
}

interface Props { domain: Domain; }

export default function ModelVersionPanel({ domain }: Props) {
  const { t } = useTranslation();
  const [models, setModels] = useState<ModelVersion[]>([
    { id: "1", name: "BiasMitigator", version: "v2.1.0", domain, description: "Threshold calibration model", is_active: true, created_at: new Date().toISOString() },
    { id: "2", name: "FairnessNet", version: "v1.4.2", domain, description: "Re-weighting approach", is_active: false, created_at: new Date(Date.now() - 86400000).toISOString() },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");

  const createVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    const newModel: ModelVersion = {
      id: crypto.randomUUID(), name, version, domain, description: description || null, is_active: false, created_at: new Date().toISOString(),
    };
    setModels((prev) => [newModel, ...prev]);
    await logAuditEvent("model_version_created", "model_version", newModel.id, { name, version, domain });
    setShowForm(false); setName(""); setVersion(""); setDescription("");
  };

  const setActive = async (id: string) => {
    setModels((prev) => prev.map((m) => ({ ...m, is_active: m.id === id })));
    await logAuditEvent("model_activated", "model_version", id, { domain });
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitBranch className="text-primary" size={18} />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("models.title")}</h3>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary/15 text-primary rounded-lg hover:bg-primary/25 transition-colors">
          <Plus size={12} /> {t("models.newVersion")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createVersion} className="space-y-3 mb-4 p-4 bg-secondary/50 rounded-lg border border-border/30">
          <input type="text" placeholder={t("models.modelName")} value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          <input type="text" placeholder={t("models.version")} value={version} onChange={(e) => setVersion(e.target.value)} required className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          <textarea placeholder={t("models.description")} value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            {t("models.create")}
          </button>
        </form>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {models.map((m) => (
          <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border ${m.is_active ? "bg-accent/10 border-accent/30" : "bg-secondary/30 border-border/20"}`}>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{m.name}</p>
                <span className="text-xs px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">{m.version}</span>
                {m.is_active && <Star className="text-accent" size={12} />}
              </div>
              {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
            </div>
            {!m.is_active && (
              <button onClick={() => setActive(m.id)} className="text-xs text-muted-foreground hover:text-accent transition-colors">
                {t("models.setActive")}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
