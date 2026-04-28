import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Database, Download, Upload, Sparkles,
  RefreshCw, FileText, Wallet, CreditCard, ShieldCheck, Brain,
  TrendingUp, Users,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { recordAudit } from "@/lib/auditStats";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  ageBracket, buildComposition, decideLoan, evaluateClass, evaluateReg,
  flagClass, flagComposition, flagHistorical, flagReg, generateSampleDataset,
  historicalRates, parseCsv, predictLinear, predictLogistic, rowsToCsv,
  trainLinear, trainLogistic, buildReweighting, buildReweightingReg,
  type BankingRow, type ClassFairness, type CompositionItem, type FlagAlert,
  type Gender, type LinearModel, type LogisticModel, type Marital,
  type Payment, type Race, type RegFairness,
} from "@/lib/bankingAi";

type Axis = "race_inferred" | "gender" | "ageBracket";
const AXIS_LABEL: Record<Axis, string> = {
  race_inferred: "Race",
  gender: "Gender",
  ageBracket: "Age bracket",
};

const AXIS_ACCESSOR: Record<Axis, (r: BankingRow) => string> = {
  race_inferred: (r) => r.race_inferred,
  gender: (r) => r.gender,
  ageBracket: (r) => ageBracket(r.applicant_age),
};

interface ProductModels {
  baseline: { creditLimit: LinearModel; loan: LogisticModel; overdraft: LogisticModel };
  fixed: { creditLimit: LinearModel; loan: LogisticModel; overdraft: LogisticModel };
}

export default function BankingAISystem() {
  const [rows, setRows] = useState<BankingRow[]>([]);
  const [filename, setFilename] = useState<string>("");
  const [axis, setAxis] = useState<Axis>("race_inferred");
  const [trained, setTrained] = useState(false);
  const [models, setModels] = useState<ProductModels | null>(null);
  const [trainingMsg, setTrainingMsg] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const composition = useMemo(() => (rows.length ? buildComposition(rows) : null), [rows]);

  const handleSample = () => {
    const data = generateSampleDataset();
    setRows(data);
    setFilename("banking_sample_dataset.csv");
    setTrained(false);
    setModels(null);
  };

  const handleUpload = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed);
    setFilename(file.name);
    setTrained(false);
    setModels(null);
  };

  const train = () => {
    if (rows.length === 0) return;
    setTrainingMsg("Training baseline models (no fairness)…");
    setTimeout(() => {
      const baselineLimit = trainLinear(rows, (r) => r.credit_limit_assigned);
      const baselineLoan = trainLogistic(rows, (r) => r.loan_approved);
      const baselineOd = trainLogistic(rows, (r) => r.overdraft_eligible);
      setTrainingMsg("Applying reweighting & retraining fixed models…");
      setTimeout(() => {
        const wLimit = buildReweightingReg(rows, AXIS_ACCESSOR[axis], (r) => r.credit_limit_assigned);
        const wLoan = buildReweighting(rows, AXIS_ACCESSOR[axis], (r) => r.loan_approved);
        const wOd = buildReweighting(rows, AXIS_ACCESSOR[axis], (r) => r.overdraft_eligible);
        const fixedLimit = trainLinear(rows, (r) => r.credit_limit_assigned, wLimit);
        const fixedLoan = trainLogistic(rows, (r) => r.loan_approved, wLoan);
        const fixedOd = trainLogistic(rows, (r) => r.overdraft_eligible, wOd);
        setModels({
          baseline: { creditLimit: baselineLimit, loan: baselineLoan, overdraft: baselineOd },
          fixed: { creditLimit: fixedLimit, loan: fixedLoan, overdraft: fixedOd },
        });
        setTrained(true);
        setTrainingMsg("");
      }, 50);
    }, 50);
  };

  const downloadSample = () => {
    const data = rows.length ? rows : generateSampleDataset();
    const csv = rowsToCsv(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "banking_dataset.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const composeFlags = useMemo(
    () => (composition ? flagComposition(composition) : []),
    [composition],
  );

  return (
    <div className="space-y-6">
      {/* Step 1: dataset */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Step 1 — Load banking dataset
          </CardTitle>
          <CardDescription>
            Upload one CSV with sensitive attributes (age, gender, race, marital, zip), financial features
            (income, credit score, debt, payment history), and three labels: credit_limit_assigned,
            loan_approved, overdraft_eligible. Or load a built-in synthetic dataset that intentionally
            encodes gender and race biases.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => fileRef.current?.click()} variant="outline">
              <Upload className="w-4 h-4 mr-2" /> Upload CSV
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
            />
            <Button onClick={handleSample}>
              <Sparkles className="w-4 h-4 mr-2" /> Load synthetic biased dataset
            </Button>
            <Button onClick={downloadSample} variant="ghost">
              <Download className="w-4 h-4 mr-2" /> Download sample CSV template
            </Button>
            <div className="ml-auto flex items-center gap-3">
              <Label className="text-xs">Sensitive axis</Label>
              <Select value={axis} onValueChange={(v) => { setAxis(v as Axis); setTrained(false); }}>
                <SelectTrigger className="w-40 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="race_inferred">Race</SelectItem>
                  <SelectItem value="gender">Gender</SelectItem>
                  <SelectItem value="ageBracket">Age bracket</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {rows.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <strong>{rows.length}</strong> rows loaded from <code className="text-xs">{filename}</code>.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Composition */}
      {composition && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              MEASURE · Dataset composition
            </CardTitle>
            <CardDescription>
              Per-axis representation — &lt;10% triggers a warning, &lt;5% triggers a critical underrepresentation flag.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CompositionChart title="Race" items={composition.race} />
            <CompositionChart title="Gender" items={composition.gender} />
            <CompositionChart title="Age bracket" items={composition.age} />
            <CompositionChart title="Marital status" items={composition.marital} />
          </CardContent>
        </Card>
      )}

      {/* Train */}
      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Step 2 — Train baseline + fairness-fixed models
            </CardTitle>
            <CardDescription>
              Trains two passes: (1) a vanilla baseline for each product, (2) a reweighted FIX pass that
              equalises positive-rate per <strong>{AXIS_LABEL[axis]}</strong>. All three products are
              trained side-by-side so you can compare the gap before vs after debiasing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Button onClick={train} disabled={!!trainingMsg}>
                {trainingMsg || (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" /> Train baseline + fixed
                  </>
                )}
              </Button>
              {trained && (
                <Badge variant="outline" className="border-green-500/50 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Both passes complete
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* FLAG composition alerts */}
      {composeFlags.length > 0 && (
        <AlertList title="FLAG · Composition warnings" alerts={composeFlags} />
      )}

      {/* Per-product tabs */}
      {trained && models && (
        <Tabs defaultValue="loan" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="credit">
              <CreditCard className="w-4 h-4 mr-2" /> Credit Limit
            </TabsTrigger>
            <TabsTrigger value="loan">
              <Wallet className="w-4 h-4 mr-2" /> Loan Approval
            </TabsTrigger>
            <TabsTrigger value="overdraft">
              <ShieldCheck className="w-4 h-4 mr-2" /> Overdraft
            </TabsTrigger>
          </TabsList>

          <TabsContent value="credit" className="mt-6">
            <CreditLimitTab rows={rows} axis={axis} models={models} />
          </TabsContent>
          <TabsContent value="loan" className="mt-6">
            <ClassificationTab
              rows={rows}
              axis={axis}
              product="loanApproval"
              productLabel="Loan Approval"
              baseline={models.baseline.loan}
              fixed={models.fixed.loan}
              targetGetter={(r) => r.loan_approved}
            />
          </TabsContent>
          <TabsContent value="overdraft" className="mt-6">
            <ClassificationTab
              rows={rows}
              axis={axis}
              product="overdraft"
              productLabel="Overdraft Privilege"
              baseline={models.baseline.overdraft}
              fixed={models.fixed.overdraft}
              targetGetter={(r) => r.overdraft_eligible}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Single applicant predict */}
      {trained && models && (
        <ApplicantPredict rows={rows} axis={axis} models={models} />
      )}
    </div>
  );
}

// ----- Composition chart -----
function CompositionChart({ title, items }: { title: string; items: CompositionItem[] }) {
  const data = items.map((i) => ({
    group: i.group,
    pct: +(i.percentage * 100).toFixed(1),
    flag: i.underrepresented,
  }));
  return (
    <div className="border rounded-md p-3">
      <div className="text-sm font-medium mb-2">{title}</div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="group" fontSize={11} />
          <YAxis fontSize={11} unit="%" />
          <RTooltip />
          <Bar dataKey="pct" fill="hsl(var(--primary))" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-1 text-xs">
        {items.map((i) => (
          <Badge
            key={i.group}
            variant="outline"
            className={
              i.underrepresented === "critical"
                ? "border-destructive/60 text-destructive"
                : i.underrepresented === "warning"
                  ? "border-yellow-500/60 text-yellow-700 dark:text-yellow-400"
                  : ""
            }
          >
            {i.group} · {(i.percentage * 100).toFixed(1)}%
          </Badge>
        ))}
      </div>
    </div>
  );
}

// ----- Credit Limit tab -----
function CreditLimitTab({
  rows,
  axis,
  models,
}: {
  rows: BankingRow[];
  axis: Axis;
  models: ProductModels;
}) {
  const accessor = AXIS_ACCESSOR[axis];
  const target = (r: BankingRow) => r.credit_limit_assigned;

  const hist = useMemo(() => historicalRates(rows, accessor, (r) => r.credit_limit_assigned), [rows, accessor]);
  const baselineFair = useMemo(
    () => evaluateReg(rows, accessor, (r) => predictLinear(models.baseline.creditLimit, r), target),
    [rows, accessor, models],
  );
  const fixedFair = useMemo(
    () => evaluateReg(rows, accessor, (r) => predictLinear(models.fixed.creditLimit, r), target),
    [rows, accessor, models],
  );
  const flags = useMemo(
    () => [
      ...flagHistorical("Credit Limit", AXIS_LABEL[axis], hist),
      ...flagReg(baselineFair),
    ],
    [hist, baselineFair, axis],
  );

  return (
    <div className="space-y-4">
      <SummaryCardsReg before={baselineFair} after={fixedFair} />
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Per-group average credit limit</CardTitle>
          <CardDescription className="text-xs">
            Compares the model's mean assigned limit by {AXIS_LABEL[axis]}, before and after reweighting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BeforeAfterRegChart before={baselineFair} after={fixedFair} />
        </CardContent>
      </Card>
      <AlertList title={`FLAG · Credit limit · ${AXIS_LABEL[axis]}`} alerts={flags} />
    </div>
  );
}

// ----- Classification tab (loan / overdraft) -----
function ClassificationTab({
  rows,
  axis,
  product,
  productLabel,
  baseline,
  fixed,
  targetGetter,
}: {
  rows: BankingRow[];
  axis: Axis;
  product: "loanApproval" | "overdraft";
  productLabel: string;
  baseline: LogisticModel;
  fixed: LogisticModel;
  targetGetter: (r: BankingRow) => 0 | 1;
}) {
  const accessor = AXIS_ACCESSOR[axis];
  const hist = useMemo(() => historicalRates(rows, accessor, (r) => targetGetter(r)), [rows, accessor, targetGetter]);
  const baselineFair = useMemo(
    () => evaluateClass(rows, accessor, (r) => predictLogistic(baseline, r), targetGetter),
    [rows, accessor, baseline, targetGetter],
  );
  const fixedFair = useMemo(
    () => evaluateClass(rows, accessor, (r) => predictLogistic(fixed, r), targetGetter),
    [rows, accessor, fixed, targetGetter],
  );
  const flags = useMemo(
    () => [
      ...flagHistorical(productLabel, AXIS_LABEL[axis], hist),
      ...flagClass(product, baselineFair),
    ],
    [hist, baselineFair, axis, product, productLabel],
  );

  return (
    <div className="space-y-4">
      <SummaryCardsClass product={product} before={baselineFair} after={fixedFair} />
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Per-group selection rate, TPR, FPR & AUC</CardTitle>
          <CardDescription className="text-xs">
            Bars compare the {productLabel.toLowerCase()} model before (baseline) and after fairness reweighting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BeforeAfterClassChart before={baselineFair} after={fixedFair} />
        </CardContent>
      </Card>
      <AlertList title={`FLAG · ${productLabel} · ${AXIS_LABEL[axis]}`} alerts={flags} />
    </div>
  );
}

// ----- Summary cards -----
function SummaryCardsClass({
  product, before, after,
}: { product: "loanApproval" | "overdraft"; before: ClassFairness; after: ClassFairness }) {
  const cards: Array<{ label: string; before: number; after: number; fmt: (n: number) => string; goodWhenLower?: boolean; threshold?: number }> = [
    { label: "ΔTPR", before: before.deltaTPR, after: after.deltaTPR, fmt: (n) => `${(n * 100).toFixed(1)}%`, goodWhenLower: true, threshold: 0.05 },
    { label: "ΔFPR", before: before.deltaFPR, after: after.deltaFPR, fmt: (n) => `${(n * 100).toFixed(1)}%`, goodWhenLower: true, threshold: 0.05 },
    { label: "Disparate Impact", before: before.disparateImpact, after: after.disparateImpact, fmt: (n) => n.toFixed(2), threshold: 0.8 },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((c) => (
        <SummaryCard key={c.label} {...c} />
      ))}
      <div className="sm:col-span-3 text-xs text-muted-foreground">
        Verdict for {product === "loanApproval" ? "loan approval" : "overdraft"} after FIX:{" "}
        <Badge variant={passClass(after) ? "default" : "destructive"}>
          {passClass(after) ? "FAIR" : "NEEDS HUMAN REVIEW"}
        </Badge>
      </div>
    </div>
  );
}

function passClass(f: ClassFairness): boolean {
  return f.deltaTPR <= 0.05 && f.deltaFPR <= 0.05 && f.disparateImpact >= 0.8;
}

function SummaryCardsReg({ before, after }: { before: RegFairness; after: RegFairness }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <SummaryCard
        label="Limit ratio (min/max group avg)"
        before={before.limitRatio}
        after={after.limitRatio}
        fmt={(n) => n.toFixed(2)}
        threshold={0.8}
      />
      <SummaryCard
        label="MAE gap"
        before={before.maeGap}
        after={after.maeGap}
        fmt={(n) => `$${n.toFixed(0)}`}
        goodWhenLower
        threshold={500}
      />
    </div>
  );
}

function SummaryCard({
  label, before, after, fmt, goodWhenLower, threshold,
}: {
  label: string; before: number; after: number; fmt: (n: number) => string;
  goodWhenLower?: boolean; threshold?: number;
}) {
  const passed =
    threshold === undefined
      ? true
      : goodWhenLower
        ? after <= threshold
        : after >= threshold;
  return (
    <div className="border rounded-md p-3 bg-card">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="mt-1 flex items-end gap-2">
        <span className="text-2xl font-bold">{fmt(after)}</span>
        <span className="text-xs text-muted-foreground line-through">{fmt(before)}</span>
        {threshold !== undefined && (
          <Badge
            variant="outline"
            className={
              passed
                ? "border-green-500/50 text-green-700 dark:text-green-400"
                : "border-destructive/60 text-destructive"
            }
          >
            {passed ? "PASS" : "FAIL"} (≥{goodWhenLower ? "≤" : ""}
            {threshold})
          </Badge>
        )}
      </div>
    </div>
  );
}

// ----- Before/after charts -----
function BeforeAfterClassChart({ before, after }: { before: ClassFairness; after: ClassFairness }) {
  const groups = before.perGroup.map((g) => g.group);
  const data = groups.map((g) => ({
    group: g,
    "Selection (baseline)": +(before.perGroup.find((x) => x.group === g)?.selectionRate ?? 0).toFixed(3) * 100,
    "Selection (fixed)": +(after.perGroup.find((x) => x.group === g)?.selectionRate ?? 0).toFixed(3) * 100,
    "AUC (baseline)": +(before.perGroup.find((x) => x.group === g)?.auc ?? 0).toFixed(3) * 100,
    "AUC (fixed)": +(after.perGroup.find((x) => x.group === g)?.auc ?? 0).toFixed(3) * 100,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="group" fontSize={12} />
        <YAxis unit="%" fontSize={12} />
        <RTooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Selection (baseline)" fill="hsl(var(--chart-5))" />
        <Bar dataKey="Selection (fixed)" fill="hsl(var(--chart-2))" />
        <Bar dataKey="AUC (baseline)" fill="hsl(var(--chart-4))" />
        <Bar dataKey="AUC (fixed)" fill="hsl(var(--chart-1))" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function BeforeAfterRegChart({ before, after }: { before: RegFairness; after: RegFairness }) {
  const groups = before.perGroup.map((g) => g.group);
  const data = groups.map((g) => ({
    group: g,
    "Mean limit (baseline)": Math.round(before.perGroup.find((x) => x.group === g)?.meanLimit ?? 0),
    "Mean limit (fixed)": Math.round(after.perGroup.find((x) => x.group === g)?.meanLimit ?? 0),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="group" fontSize={12} />
        <YAxis fontSize={12} />
        <RTooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Mean limit (baseline)" fill="hsl(var(--chart-5))" />
        <Bar dataKey="Mean limit (fixed)" fill="hsl(var(--chart-2))" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ----- Alert list -----
function AlertList({ title, alerts }: { title: string; alerts: FlagAlert[] }) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" /> {title}
          </CardTitle>
          <CardDescription>No fairness violations triggered.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" /> {title}
        </CardTitle>
        <CardDescription>
          {alerts.length} alert{alerts.length === 1 ? "" : "s"} raised against the configured thresholds.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((a, i) => (
          <div
            key={i}
            className={
              "flex items-start gap-3 rounded-md border p-3 text-sm " +
              (a.level === "critical"
                ? "border-destructive/40 bg-destructive/5"
                : a.level === "warning"
                  ? "border-yellow-500/40 bg-yellow-500/5"
                  : "border-border bg-muted/40")
            }
          >
            <AlertTriangle
              className={
                "w-4 h-4 mt-0.5 shrink-0 " +
                (a.level === "critical" ? "text-destructive" : "text-yellow-600")
              }
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    a.level === "critical"
                      ? "border-destructive/60 text-destructive"
                      : "border-yellow-500/60 text-yellow-700 dark:text-yellow-400"
                  }
                >
                  {a.level.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">{a.category}</span>
              </div>
              <div className="font-medium">{a.title}</div>
              <div className="text-xs text-muted-foreground">{a.detail}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ----- Single-applicant predict -----
function ApplicantPredict({
  rows, axis, models,
}: { rows: BankingRow[]; axis: Axis; models: ProductModels }) {
  const accessor = AXIS_ACCESSOR[axis];
  const composition = useMemo(() => buildComposition(rows), [rows]);
  const [form, setForm] = useState<BankingRow>({
    applicant_age: 34,
    gender: "Female",
    race_inferred: "Hispanic",
    marital_status: "Married",
    zip_code: "60615",
    annual_income: 78000,
    credit_score: 705,
    existing_debt: 12000,
    payment_history: "Good",
    employment_years: 7,
    debt_to_income_ratio: 0.18,
    credit_limit_assigned: 0,
    loan_approved: 0,
    overdraft_eligible: 0,
  });
  const [result, setResult] = useState<{
    loan: ReturnType<typeof decideLoan>;
    overdraft: ReturnType<typeof decideLoan>;
    creditLimit: number;
  } | null>(null);

  const set = <K extends keyof BankingRow>(k: K, v: BankingRow[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const score = () => {
    const groupKey = accessor(form);
    const groupComp = (
      axis === "race_inferred"
        ? composition.race
        : axis === "gender"
          ? composition.gender
          : composition.age
    ).find((c) => c.group === groupKey);
    const groupSelectionRate =
      rows.length > 0
        ? rows.filter((r) => accessor(r) === groupKey).filter((r) => r.loan_approved === 1).length /
          Math.max(rows.filter((r) => accessor(r) === groupKey).length, 1)
        : 0.5;
    const ctx = {
      groupSelectionRate,
      underrepresented: groupComp?.underrepresented !== "ok",
    };
    setResult({
      loan: decideLoan(models.fixed.loan, form, ctx),
      overdraft: decideLoan(models.fixed.overdraft, form, ctx),
      creditLimit: predictLinear(models.fixed.creditLimit, form),
    });
    recordAudit("loan");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Single-applicant predict (uses the fixed models)
        </CardTitle>
        <CardDescription>
          The fairness-fixed models score the applicant for all three products. The loan & overdraft
          decisions also apply a confidence-based reject option that routes borderline or
          underrepresented applicants to a human officer.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age">
              <Input type="number" value={form.applicant_age} onChange={(e) => set("applicant_age", Number(e.target.value))} />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onValueChange={(v) => set("gender", v as Gender)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Non-binary">Non-binary</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Race (inferred)">
              <Select value={form.race_inferred} onValueChange={(v) => set("race_inferred", v as Race)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="White">White</SelectItem>
                  <SelectItem value="Black">Black</SelectItem>
                  <SelectItem value="Hispanic">Hispanic</SelectItem>
                  <SelectItem value="Asian">Asian</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Marital status">
              <Select value={form.marital_status} onValueChange={(v) => set("marital_status", v as Marital)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                  <SelectItem value="Divorced">Divorced</SelectItem>
                  <SelectItem value="Widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Annual income ($)">
              <Input type="number" value={form.annual_income} onChange={(e) => set("annual_income", Number(e.target.value))} />
            </Field>
            <Field label="Credit score">
              <Input type="number" value={form.credit_score} onChange={(e) => set("credit_score", Number(e.target.value))} />
            </Field>
            <Field label="Existing debt ($)">
              <Input type="number" value={form.existing_debt} onChange={(e) => set("existing_debt", Number(e.target.value))} />
            </Field>
            <Field label="Payment history">
              <Select value={form.payment_history} onValueChange={(v) => set("payment_history", v as Payment)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Employment years">
              <Input type="number" value={form.employment_years} onChange={(e) => set("employment_years", Number(e.target.value))} />
            </Field>
            <Field label="DTI ratio">
              <Input type="number" step="0.01" value={form.debt_to_income_ratio} onChange={(e) => set("debt_to_income_ratio", Number(e.target.value))} />
            </Field>
          </div>
          <Button onClick={score}><FileText className="w-4 h-4 mr-2" /> Run all 3 product models</Button>
        </div>
        <div className="space-y-3">
          {result ? (
            <>
              <DecisionCard
                title="Personal Loan"
                icon={Wallet}
                decision={result.loan.decision}
                probability={result.loan.probability}
                confidence={result.loan.confidence}
                reasons={result.loan.reasons}
              />
              <DecisionCard
                title="Overdraft Privilege"
                icon={ShieldCheck}
                decision={result.overdraft.decision}
                probability={result.overdraft.probability}
                confidence={result.overdraft.confidence}
                reasons={result.overdraft.reasons}
              />
              <div className="border rounded-md p-4 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="font-semibold">Credit Card Limit</span>
                </div>
                <div className="text-3xl font-bold">${Math.round(result.creditLimit / 100) * 100}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Predicted by the fairness-reweighted regression model.
                </div>
              </div>
            </>
          ) : (
            <div className="border border-dashed rounded-md p-6 text-center text-sm text-muted-foreground">
              Fill in the applicant profile and run the 3 product models to see the decisions.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function DecisionCard({
  title, icon: Icon, decision, probability, confidence, reasons,
}: {
  title: string; icon: typeof Wallet; decision: string; probability: number;
  confidence: number; reasons: string[];
}) {
  const tone =
    decision === "APPROVE"
      ? "border-green-500/50 bg-green-500/5"
      : decision === "DENY"
        ? "border-destructive/40 bg-destructive/5"
        : "border-yellow-500/40 bg-yellow-500/5";
  return (
    <div className={"border rounded-md p-4 " + tone}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-semibold">
          <Icon className="w-4 h-4 text-primary" /> {title}
        </div>
        <Badge variant="outline">{decision}</Badge>
      </div>
      <div className="text-xs text-muted-foreground">
        Probability {(probability * 100).toFixed(1)}% · Confidence {(confidence * 100).toFixed(0)}%
      </div>
      {reasons.length > 0 && (
        <ul className="text-xs mt-2 list-disc ml-5 space-y-0.5">
          {reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
