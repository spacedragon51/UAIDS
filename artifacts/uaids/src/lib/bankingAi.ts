// Unbiased Banking AI System — math + sample data
// Implements the MEASURE → FLAG → FIX framework for three banking products:
//   - Credit Card Limit Assignment (regression)
//   - Personal Loan Approval (binary classification)
//   - Overdraft Privilege Eligibility (binary classification)

// ----- Types -----
export type Race = "White" | "Black" | "Hispanic" | "Asian" | "Other";
export type Gender = "Male" | "Female" | "Non-binary";
export type Payment = "Good" | "Fair" | "Poor";
export type Marital = "Single" | "Married" | "Divorced" | "Widowed";
export type AgeBracket = "<30" | "30-50" | ">50";

export interface BankingRow {
  applicant_age: number;
  gender: Gender;
  race_inferred: Race;
  marital_status: Marital;
  zip_code: string;
  annual_income: number;
  credit_score: number;
  existing_debt: number;
  payment_history: Payment;
  employment_years: number;
  debt_to_income_ratio: number;
  credit_limit_assigned: number;
  loan_approved: 0 | 1;
  overdraft_eligible: 0 | 1;
  historical_biased_label?: 0 | 1;
}

export interface CompositionItem {
  group: string;
  count: number;
  percentage: number;
  underrepresented: "ok" | "warning" | "critical";
}

export interface CompositionReport {
  total: number;
  race: CompositionItem[];
  gender: CompositionItem[];
  age: CompositionItem[];
  marital: CompositionItem[];
}

export interface PerGroupClassMetric {
  group: string;
  count: number;
  selectionRate: number;
  tpr: number;
  fpr: number;
  auc: number;
  disparateImpact: number;
}

export interface PerGroupRegMetric {
  group: string;
  count: number;
  meanLimit: number;
  mae: number;
}

export interface ClassFairness {
  perGroup: PerGroupClassMetric[];
  deltaTPR: number;
  deltaFPR: number;
  disparateImpact: number;
  overallSelectionRate: number;
  privilegedGroup: string;
}

export interface RegFairness {
  perGroup: PerGroupRegMetric[];
  limitRatio: number;
  maeGap: number;
  overallMean: number;
}

export interface FlagAlert {
  level: "warning" | "critical" | "info";
  category: string;
  title: string;
  detail: string;
}

// ----- Thresholds (per spec) -----
export const FLAG_THRESHOLDS = {
  underrepresentation: { warning: 0.1, critical: 0.05 },
  historicalBiasGap: 0.2,
  creditLimit: { limitRatio: 0.8, maeGap: 500 },
  loanApproval: { deltaTPR: 0.05, deltaFPR: 0.05, disparateImpact: 0.8 },
  overdraft: { deltaTPR: 0.05, deltaFPR: 0.05, disparateImpact: 0.8 },
} as const;

// ----- Helpers -----
export function ageBracket(age: number): AgeBracket {
  if (age < 30) return "<30";
  if (age <= 50) return "30-50";
  return ">50";
}

const PAY_MAP: Record<Payment, number> = { Good: 1, Fair: 0.5, Poor: 0 };

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const RACES: Race[] = ["White", "Black", "Hispanic", "Asian", "Other"];
const RACE_WEIGHT = [0.6, 0.13, 0.18, 0.06, 0.03];
const GENDERS: Gender[] = ["Male", "Female", "Non-binary"];
const GENDER_WEIGHT = [0.49, 0.49, 0.02];
const MARITAL: Marital[] = ["Single", "Married", "Divorced", "Widowed"];
const MARITAL_WEIGHT = [0.4, 0.45, 0.1, 0.05];
const PAYMENT_HIST: Payment[] = ["Good", "Fair", "Poor"];

function pick<T>(arr: T[], weights: number[], r: number): T {
  let cum = 0;
  for (let i = 0; i < arr.length; i++) {
    cum += weights[i];
    if (r <= cum) return arr[i];
  }
  return arr[arr.length - 1];
}

// ----- Sample dataset (intentionally biased) -----
export function generateSampleDataset(n = 600, seed = 42): BankingRow[] {
  const rand = rng(seed);
  const rows: BankingRow[] = [];
  for (let i = 0; i < n; i++) {
    const race = pick(RACES, RACE_WEIGHT, rand());
    const gender = pick(GENDERS, GENDER_WEIGHT, rand());
    const marital = pick(MARITAL, MARITAL_WEIGHT, rand());
    const age = Math.round(22 + rand() * 50);
    const zip = String(10000 + Math.floor(rand() * 89999));

    const baseIncome = 35000 + rand() * 90000;
    const incomePenalty =
      (race === "Black" ? 0.85 : race === "Hispanic" ? 0.9 : 1) *
      (gender === "Female" ? 0.93 : 1);
    const annual_income = Math.round(baseIncome * incomePenalty);

    const credit_score = Math.round(
      Math.min(
        850,
        Math.max(
          300,
          580 +
            rand() * 200 +
            (annual_income / 10000) * 1.5 -
            (age < 25 ? 30 : 0),
        ),
      ),
    );
    const existing_debt = Math.round(rand() * annual_income * 0.45);
    const employment_years = Math.max(0, Math.round(rand() * Math.min(30, age - 18)));
    const debt_to_income_ratio = +(existing_debt / Math.max(annual_income, 1)).toFixed(2);
    const payment_history: Payment =
      credit_score > 720 ? "Good" : credit_score > 620 ? "Fair" : "Poor";

    // Intentional biases:
    // - Credit limit: women get ~20% less, Black/Hispanic ~25% less for same financials.
    const baseLimit =
      500 + (annual_income * 0.18 + (credit_score - 500) * 25) * (1 - debt_to_income_ratio * 0.4);
    const limitBias =
      (gender === "Female" ? 0.8 : 1) *
      (race === "Black" ? 0.75 : race === "Hispanic" ? 0.82 : 1);
    const credit_limit_assigned = Math.max(
      500,
      Math.round((baseLimit * limitBias) / 100) * 100,
    );

    // - Loan approval: minorities denied more often even with same scores.
    const loanScore =
      (credit_score - 600) / 200 +
      (annual_income - 50000) / 80000 -
      debt_to_income_ratio * 1.5 +
      (PAY_MAP[payment_history] - 0.5) * 1.2 +
      (race === "Black" ? -0.6 : race === "Hispanic" ? -0.4 : 0) +
      (gender === "Female" ? -0.15 : 0) +
      rand() * 0.5 -
      0.25;
    const loan_approved: 0 | 1 = loanScore > 0.2 ? 1 : 0;

    // - Overdraft: older applicants & minorities get less eligibility.
    const odScore =
      (credit_score - 600) / 250 +
      (annual_income - 40000) / 100000 -
      (age > 60 ? 0.5 : 0) +
      (race === "Black" ? -0.4 : 0) +
      rand() * 0.5 -
      0.25;
    const overdraft_eligible: 0 | 1 = odScore > 0.15 ? 1 : 0;

    rows.push({
      applicant_age: age,
      gender,
      race_inferred: race,
      marital_status: marital,
      zip_code: zip,
      annual_income,
      credit_score,
      existing_debt,
      payment_history,
      employment_years,
      debt_to_income_ratio,
      credit_limit_assigned,
      loan_approved,
      overdraft_eligible,
      historical_biased_label: loan_approved,
    });
  }
  return rows;
}

// ----- CSV parsing -----
export function rowsToCsv(rows: BankingRow[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const body = rows.map((r) => headers.map((h) => String((r as unknown as Record<string, unknown>)[h] ?? "")).join(","));
  return [headers.join(","), ...body].join("\n");
}

export function parseCsv(csv: string): BankingRow[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: BankingRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    const obj: Record<string, string> = {};
    headers.forEach((h, j) => (obj[h] = (cells[j] ?? "").trim()));
    const row: BankingRow = {
      applicant_age: Number(obj.applicant_age) || 0,
      gender: (obj.gender as Gender) || "Male",
      race_inferred: (obj.race_inferred as Race) || "Other",
      marital_status: (obj.marital_status as Marital) || "Single",
      zip_code: obj.zip_code || "",
      annual_income: Number(obj.annual_income) || 0,
      credit_score: Number(obj.credit_score) || 0,
      existing_debt: Number(obj.existing_debt) || 0,
      payment_history: (obj.payment_history as Payment) || "Fair",
      employment_years: Number(obj.employment_years) || 0,
      debt_to_income_ratio: Number(obj.debt_to_income_ratio) || 0,
      credit_limit_assigned: Number(obj.credit_limit_assigned) || 0,
      loan_approved: (Number(obj.loan_approved) ? 1 : 0) as 0 | 1,
      overdraft_eligible: (Number(obj.overdraft_eligible) ? 1 : 0) as 0 | 1,
      historical_biased_label: obj.historical_biased_label
        ? ((Number(obj.historical_biased_label) ? 1 : 0) as 0 | 1)
        : undefined,
    };
    rows.push(row);
  }
  return rows;
}

// ----- Composition (MEASURE 1.1 & 1.2) -----
function composeBy<T extends string>(values: T[]): CompositionItem[] {
  const total = values.length;
  const map = new Map<string, number>();
  values.forEach((v) => map.set(v, (map.get(v) ?? 0) + 1));
  const items: CompositionItem[] = [];
  for (const [group, count] of map.entries()) {
    const pct = count / total;
    let underrepresented: CompositionItem["underrepresented"] = "ok";
    if (pct < FLAG_THRESHOLDS.underrepresentation.critical) underrepresented = "critical";
    else if (pct < FLAG_THRESHOLDS.underrepresentation.warning) underrepresented = "warning";
    items.push({ group, count, percentage: pct, underrepresented });
  }
  return items.sort((a, b) => b.count - a.count);
}

export function buildComposition(rows: BankingRow[]): CompositionReport {
  return {
    total: rows.length,
    race: composeBy(rows.map((r) => r.race_inferred)),
    gender: composeBy(rows.map((r) => r.gender)),
    age: composeBy(rows.map((r) => ageBracket(r.applicant_age))),
    marital: composeBy(rows.map((r) => r.marital_status)),
  };
}

// ----- Feature engineering -----
function featureVector(r: BankingRow): number[] {
  return [
    1, // bias term
    (r.annual_income - 60000) / 40000,
    (r.credit_score - 650) / 100,
    -r.debt_to_income_ratio,
    PAY_MAP[r.payment_history] - 0.5,
    Math.min(r.employment_years, 25) / 10,
    -r.existing_debt / 50000,
    (r.applicant_age - 40) / 15,
  ];
}
const FEATURE_DIM = 8;

// ----- Linear regression (credit limit) -----
export interface LinearModel {
  w: number[];
}
export function trainLinear(
  rows: BankingRow[],
  target: (r: BankingRow) => number,
  weights?: number[],
): LinearModel {
  const w = new Array(FEATURE_DIM).fill(0);
  const lr = 0.05;
  const epochs = 200;
  const yMean = rows.reduce((s, r) => s + target(r), 0) / Math.max(rows.length, 1);
  const yStd = Math.sqrt(
    rows.reduce((s, r) => s + (target(r) - yMean) ** 2, 0) / Math.max(rows.length, 1),
  ) || 1;

  for (let e = 0; e < epochs; e++) {
    const grad = new Array(FEATURE_DIM).fill(0);
    let n = 0;
    for (let i = 0; i < rows.length; i++) {
      const x = featureVector(rows[i]);
      const yNorm = (target(rows[i]) - yMean) / yStd;
      const pred = w.reduce((s, wi, k) => s + wi * x[k], 0);
      const err = pred - yNorm;
      const wt = weights?.[i] ?? 1;
      for (let k = 0; k < FEATURE_DIM; k++) grad[k] += wt * err * x[k];
      n += wt;
    }
    for (let k = 0; k < FEATURE_DIM; k++) w[k] -= (lr * grad[k]) / Math.max(n, 1);
  }
  // Bake denormalisation into weights so predict returns dollars.
  const baked = w.map((wi, k) => (k === 0 ? wi * yStd + yMean : wi * yStd));
  return { w: baked };
}
export function predictLinear(m: LinearModel, r: BankingRow): number {
  const x = featureVector(r);
  return Math.max(0, m.w.reduce((s, wi, k) => s + wi * x[k], 0));
}

// ----- Logistic regression -----
function sigmoid(z: number): number {
  if (z >= 0) {
    const ez = Math.exp(-z);
    return 1 / (1 + ez);
  }
  const ez = Math.exp(z);
  return ez / (1 + ez);
}
export interface LogisticModel {
  w: number[];
}
export function trainLogistic(
  rows: BankingRow[],
  target: (r: BankingRow) => 0 | 1,
  weights?: number[],
): LogisticModel {
  const w = new Array(FEATURE_DIM).fill(0);
  const lr = 0.1;
  const epochs = 300;
  for (let e = 0; e < epochs; e++) {
    const grad = new Array(FEATURE_DIM).fill(0);
    let n = 0;
    for (let i = 0; i < rows.length; i++) {
      const x = featureVector(rows[i]);
      const z = w.reduce((s, wi, k) => s + wi * x[k], 0);
      const p = sigmoid(z);
      const y = target(rows[i]);
      const err = p - y;
      const wt = weights?.[i] ?? 1;
      for (let k = 0; k < FEATURE_DIM; k++) grad[k] += wt * err * x[k];
      n += wt;
    }
    for (let k = 0; k < FEATURE_DIM; k++) w[k] -= (lr * grad[k]) / Math.max(n, 1);
  }
  return { w };
}
export function predictLogistic(m: LogisticModel, r: BankingRow): number {
  const x = featureVector(r);
  return sigmoid(m.w.reduce((s, wi, k) => s + wi * x[k], 0));
}

// ----- Fairness metrics -----
function aucScore(probs: number[], labels: number[]): number {
  const idx = probs.map((_, i) => i).sort((a, b) => probs[a] - probs[b]);
  let tp = 0, fp = 0;
  let prevTp = 0, prevFp = 0;
  let auc = 0;
  let totalP = 0, totalN = 0;
  labels.forEach((l) => (l ? totalP++ : totalN++));
  if (totalP === 0 || totalN === 0) return 0.5;
  for (let i = idx.length - 1; i >= 0; i--) {
    if (labels[idx[i]] === 1) tp++;
    else fp++;
    if (i === 0 || probs[idx[i]] !== probs[idx[i - 1]]) {
      auc += (fp - prevFp) * (tp + prevTp) / 2;
      prevTp = tp;
      prevFp = fp;
    }
  }
  return auc / (totalP * totalN);
}

export function evaluateClass(
  rows: BankingRow[],
  axis: (r: BankingRow) => string,
  predict: (r: BankingRow) => number,
  trueLabel: (r: BankingRow) => 0 | 1,
  threshold = 0.5,
): ClassFairness {
  const groups = new Map<string, BankingRow[]>();
  rows.forEach((r) => {
    const g = axis(r);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(r);
  });
  const perGroup: PerGroupClassMetric[] = [];
  let overallSelected = 0;
  for (const [group, grpRows] of groups.entries()) {
    const probs = grpRows.map(predict);
    const labels = grpRows.map(trueLabel);
    let tp = 0, fp = 0, tn = 0, fn = 0, sel = 0;
    probs.forEach((p, i) => {
      const pred = p >= threshold ? 1 : 0;
      const y = labels[i];
      if (pred === 1 && y === 1) tp++;
      if (pred === 1 && y === 0) fp++;
      if (pred === 0 && y === 0) tn++;
      if (pred === 0 && y === 1) fn++;
      if (pred === 1) sel++;
    });
    const tpr = tp + fn > 0 ? tp / (tp + fn) : 0;
    const fpr = fp + tn > 0 ? fp / (fp + tn) : 0;
    const selectionRate = grpRows.length > 0 ? sel / grpRows.length : 0;
    overallSelected += sel;
    perGroup.push({
      group,
      count: grpRows.length,
      selectionRate,
      tpr,
      fpr,
      auc: aucScore(probs, labels),
      disparateImpact: 1,
    });
  }
  const privileged = perGroup.reduce(
    (best, g) => (g.selectionRate > (best?.selectionRate ?? -1) ? g : best),
    perGroup[0],
  );
  perGroup.forEach((g) => {
    g.disparateImpact =
      privileged && privileged.selectionRate > 0
        ? g.selectionRate / privileged.selectionRate
        : 1;
  });
  const tprs = perGroup.map((g) => g.tpr);
  const fprs = perGroup.map((g) => g.fpr);
  const dis = perGroup.map((g) => g.disparateImpact);
  return {
    perGroup: perGroup.sort((a, b) => b.count - a.count),
    deltaTPR: tprs.length ? Math.max(...tprs) - Math.min(...tprs) : 0,
    deltaFPR: fprs.length ? Math.max(...fprs) - Math.min(...fprs) : 0,
    disparateImpact: dis.length ? Math.min(...dis) : 1,
    overallSelectionRate: rows.length ? overallSelected / rows.length : 0,
    privilegedGroup: privileged?.group ?? "—",
  };
}

export function evaluateReg(
  rows: BankingRow[],
  axis: (r: BankingRow) => string,
  predict: (r: BankingRow) => number,
  trueValue: (r: BankingRow) => number,
): RegFairness {
  const groups = new Map<string, BankingRow[]>();
  rows.forEach((r) => {
    const g = axis(r);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(r);
  });
  const perGroup: PerGroupRegMetric[] = [];
  for (const [group, grpRows] of groups.entries()) {
    const preds = grpRows.map(predict);
    const truth = grpRows.map(trueValue);
    const meanLimit = preds.reduce((s, p) => s + p, 0) / preds.length;
    const mae =
      preds.reduce((s, p, i) => s + Math.abs(p - truth[i]), 0) / preds.length;
    perGroup.push({ group, count: grpRows.length, meanLimit, mae });
  }
  const means = perGroup.map((g) => g.meanLimit);
  const maes = perGroup.map((g) => g.mae);
  const overallMean = rows.reduce((s, r) => s + trueValue(r), 0) / Math.max(rows.length, 1);
  return {
    perGroup: perGroup.sort((a, b) => b.count - a.count),
    limitRatio: means.length ? Math.min(...means) / Math.max(...means) : 1,
    maeGap: maes.length ? Math.max(...maes) - Math.min(...maes) : 0,
    overallMean,
  };
}

// ----- Historical bias (pre-model, on raw labels) -----
export interface HistoricalGap {
  group: string;
  rate: number;
  gapFromOverall: number;
  flagged: boolean;
}

export function historicalRates(
  rows: BankingRow[],
  axis: (r: BankingRow) => string,
  value: (r: BankingRow) => number,
): { overall: number; perGroup: HistoricalGap[] } {
  const groups = new Map<string, number[]>();
  rows.forEach((r) => {
    const g = axis(r);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(value(r));
  });
  const overall = rows.reduce((s, r) => s + value(r), 0) / Math.max(rows.length, 1);
  const perGroup: HistoricalGap[] = [];
  for (const [group, vals] of groups.entries()) {
    const rate = vals.reduce((s, v) => s + v, 0) / Math.max(vals.length, 1);
    const gap = overall ? (rate - overall) / overall : 0;
    perGroup.push({
      group,
      rate,
      gapFromOverall: gap,
      flagged: Math.abs(gap) > FLAG_THRESHOLDS.historicalBiasGap,
    });
  }
  return { overall, perGroup: perGroup.sort((a, b) => b.rate - a.rate) };
}

// ----- FLAG: alert builders -----
export function flagComposition(comp: CompositionReport): FlagAlert[] {
  const out: FlagAlert[] = [];
  const axes: Array<{ name: string; items: CompositionItem[] }> = [
    { name: "Race", items: comp.race },
    { name: "Gender", items: comp.gender },
    { name: "Age bracket", items: comp.age },
    { name: "Marital status", items: comp.marital },
  ];
  axes.forEach((ax) => {
    ax.items.forEach((it) => {
      if (it.underrepresented === "critical") {
        out.push({
          level: "critical",
          category: "Composition",
          title: `Critical underrepresentation: ${ax.name} = ${it.group}`,
          detail: `Only ${(it.percentage * 100).toFixed(1)}% of training rows. Below 5% critical threshold; per-group fairness numbers for this slice will not be reliable.`,
        });
      } else if (it.underrepresented === "warning") {
        out.push({
          level: "warning",
          category: "Composition",
          title: `Underrepresented: ${ax.name} = ${it.group}`,
          detail: `Only ${(it.percentage * 100).toFixed(1)}% of training rows. Below 10% warning threshold.`,
        });
      }
    });
  });
  return out;
}

export function flagClass(
  product: "loanApproval" | "overdraft",
  fairness: ClassFairness,
): FlagAlert[] {
  const t = FLAG_THRESHOLDS[product];
  const out: FlagAlert[] = [];
  if (fairness.deltaTPR > t.deltaTPR) {
    out.push({
      level: "critical",
      category: "True-positive parity",
      title: `ΔTPR ${(fairness.deltaTPR * 100).toFixed(1)}% > ${(t.deltaTPR * 100).toFixed(0)}%`,
      detail:
        "Approval rate for qualified applicants varies too much across groups. Eligible applicants in some groups are being rejected at materially higher rates.",
    });
  }
  if (fairness.deltaFPR > t.deltaFPR) {
    out.push({
      level: "warning",
      category: "False-positive parity",
      title: `ΔFPR ${(fairness.deltaFPR * 100).toFixed(1)}% > ${(t.deltaFPR * 100).toFixed(0)}%`,
      detail:
        "Unqualified applicants are being approved at uneven rates across groups, exposing the bank to risk concentration.",
    });
  }
  if (fairness.disparateImpact < t.disparateImpact) {
    out.push({
      level: "critical",
      category: "Disparate impact (4/5ths rule)",
      title: `DI ${fairness.disparateImpact.toFixed(2)} < ${t.disparateImpact}`,
      detail: `Lowest-selected group's rate is only ${(fairness.disparateImpact * 100).toFixed(1)}% of the most-selected group (${fairness.privilegedGroup}). EEOC / ECOA red flag.`,
    });
  }
  return out;
}

export function flagReg(fairness: RegFairness): FlagAlert[] {
  const t = FLAG_THRESHOLDS.creditLimit;
  const out: FlagAlert[] = [];
  if (fairness.limitRatio < t.limitRatio) {
    out.push({
      level: "critical",
      category: "Limit ratio",
      title: `Limit ratio ${fairness.limitRatio.toFixed(2)} < ${t.limitRatio}`,
      detail:
        "Lowest-served group's average credit limit is well below the most-served group, even after controlling for income and credit score.",
    });
  }
  if (fairness.maeGap > t.maeGap) {
    out.push({
      level: "warning",
      category: "Error parity",
      title: `MAE gap $${fairness.maeGap.toFixed(0)} > $${t.maeGap}`,
      detail: "The model is meaningfully less accurate for some groups than others.",
    });
  }
  return out;
}

export function flagHistorical(
  product: string,
  axisName: string,
  hist: { overall: number; perGroup: HistoricalGap[] },
): FlagAlert[] {
  return hist.perGroup
    .filter((g) => g.flagged)
    .map((g) => ({
      level: g.gapFromOverall < 0 ? "critical" : "warning",
      category: `Historical bias · ${product}`,
      title: `${axisName}=${g.group}: ${(g.rate * 100).toFixed(1)}% vs ${(hist.overall * 100).toFixed(1)}% overall`,
      detail: `Historical ${product.toLowerCase()} rate is ${(g.gapFromOverall * 100).toFixed(0)}% off the overall — exceeds ±20% historical-bias gate.`,
    }));
}

// ----- FIX: reweighting -----
export function buildReweighting(
  rows: BankingRow[],
  axis: (r: BankingRow) => string,
  positive: (r: BankingRow) => 0 | 1,
): number[] {
  const overall = rows.reduce((s, r) => s + positive(r), 0) / Math.max(rows.length, 1);
  const groupCount = new Map<string, number>();
  const groupPos = new Map<string, number>();
  rows.forEach((r) => {
    const g = axis(r);
    groupCount.set(g, (groupCount.get(g) ?? 0) + 1);
    groupPos.set(g, (groupPos.get(g) ?? 0) + positive(r));
  });
  return rows.map((r) => {
    const g = axis(r);
    const cnt = groupCount.get(g) ?? 1;
    const pos = groupPos.get(g) ?? 0;
    const groupRate = pos / Math.max(cnt, 1);
    const isPos = positive(r);
    if (isPos === 1) {
      return groupRate > 0 ? overall / groupRate : 1;
    }
    return (1 - overall) > 0 && (1 - groupRate) > 0
      ? (1 - overall) / (1 - groupRate)
      : 1;
  });
}

export function buildReweightingReg(
  rows: BankingRow[],
  axis: (r: BankingRow) => string,
  value: (r: BankingRow) => number,
): number[] {
  const overall = rows.reduce((s, r) => s + value(r), 0) / Math.max(rows.length, 1);
  const groupMean = new Map<string, number>();
  const groupCount = new Map<string, number>();
  rows.forEach((r) => {
    const g = axis(r);
    groupCount.set(g, (groupCount.get(g) ?? 0) + 1);
    groupMean.set(g, (groupMean.get(g) ?? 0) + value(r));
  });
  groupMean.forEach((sum, g) =>
    groupMean.set(g, sum / Math.max(groupCount.get(g) ?? 1, 1)),
  );
  return rows.map((r) => {
    const g = axis(r);
    const gm = groupMean.get(g) ?? overall;
    return gm > 0 ? overall / gm : 1;
  });
}

// ----- Reject option (single-applicant predict) -----
export interface RejectDecision {
  decision: "APPROVE" | "DENY" | "ROUTE TO HUMAN OFFICER";
  reasons: string[];
  probability: number;
  confidence: number;
  estimatedCreditLimit?: number;
}

export function decideLoan(
  m: LogisticModel,
  r: BankingRow,
  context: { groupSelectionRate?: number; underrepresented?: boolean },
): RejectDecision {
  const p = predictLogistic(m, r);
  const confidence = Math.max(p, 1 - p);
  const reasons: string[] = [];
  if (confidence < 0.65) reasons.push(`Low confidence (${(confidence * 100).toFixed(0)}%) — borderline applicant.`);
  if (context.underrepresented) reasons.push("Applicant belongs to an underrepresented training slice.");
  if (context.groupSelectionRate !== undefined && context.groupSelectionRate < 0.4)
    reasons.push("Group historical selection rate is low; applying extra human review to avoid compounding past bias.");
  let decision: RejectDecision["decision"];
  if (reasons.length > 0) decision = "ROUTE TO HUMAN OFFICER";
  else decision = p >= 0.5 ? "APPROVE" : "DENY";
  return { decision, reasons, probability: p, confidence };
}
