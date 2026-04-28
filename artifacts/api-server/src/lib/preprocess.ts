import type { ResumeRow, ProcessedRow } from "./store.js";
import { detectAttributes } from "./bias.js";

const SYNONYMS: Record<string, string[]> = {
  managed: ["led", "oversaw", "directed", "supervised"],
  led: ["managed", "headed", "spearheaded"],
  built: ["created", "developed", "engineered", "constructed"],
  created: ["built", "developed", "designed", "produced"],
  developed: ["built", "engineered", "implemented"],
  improved: ["enhanced", "optimized", "upgraded", "refined"],
  increased: ["grew", "boosted", "expanded", "raised"],
  decreased: ["reduced", "lowered", "cut", "minimized"],
  designed: ["architected", "crafted", "planned"],
  implemented: ["deployed", "launched", "rolled out"],
  collaborated: ["partnered", "cooperated", "worked together"],
  analyzed: ["evaluated", "assessed", "examined"],
  trained: ["mentored", "coached", "instructed"],
  delivered: ["produced", "shipped", "completed"],
  optimized: ["improved", "tuned", "streamlined"],
  team: ["squad", "group", "unit"],
  project: ["initiative", "program", "engagement"],
  experience: ["background", "expertise", "track record"],
  responsible: ["accountable", "in charge", "tasked with"],
};

function synonymReplace(text: string, seed: number): string {
  const words = text.split(/(\s+)/);
  let r = seed;
  const rnd = () => {
    r = (r * 1664525 + 1013904223) >>> 0;
    return r / 0xffffffff;
  };
  return words
    .map((w) => {
      const lower = w.toLowerCase().replace(/[^a-z]/g, "");
      const syns = SYNONYMS[lower];
      if (syns && rnd() < 0.4) {
        const choice = syns[Math.floor(rnd() * syns.length)]!;
        if (w[0] && w[0] === w[0]!.toUpperCase()) {
          return choice.charAt(0).toUpperCase() + choice.slice(1);
        }
        return choice;
      }
      return w;
    })
    .join("");
}

export interface SplitStats {
  train: Record<string, number>;
  validation: Record<string, number>;
  test: Record<string, number>;
}

export interface PreprocessResult {
  totalSamples: number;
  augmentedSamples: number;
  splitStats: {
    byEthnicity: SplitStats;
    byGender: SplitStats;
  };
  weightDistribution: Array<{ group: string; weight: number; count: number }>;
  rows: ProcessedRow[];
}

function stratifiedSplit<T>(items: T[], keyFn: (i: T) => string, ratios: [number, number, number], seed = 42) {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const k = keyFn(it);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(it);
  }
  const train: T[] = [], val: T[] = [], test: T[] = [];
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (const arr of groups.values()) {
    const shuffled = [...arr].sort(() => rnd() - 0.5);
    const n = shuffled.length;
    const nTrain = Math.max(1, Math.floor(n * ratios[0]));
    const nVal = Math.max(0, Math.floor(n * ratios[1]));
    train.push(...shuffled.slice(0, nTrain));
    val.push(...shuffled.slice(nTrain, nTrain + nVal));
    test.push(...shuffled.slice(nTrain + nVal));
  }
  return { train, val, test };
}

function statsFor<T>(train: T[], val: T[], test: T[], keyFn: (i: T) => string): SplitStats {
  const collect = (arr: T[]) => {
    const m: Record<string, number> = {};
    for (const a of arr) m[keyFn(a)] = (m[keyFn(a)] || 0) + 1;
    return m;
  };
  return { train: collect(train), validation: collect(val), test: collect(test) };
}

export function preprocess(rows: ResumeRow[], sensitiveAxis: "ethnicity" | "gender" = "ethnicity"): PreprocessResult {
  // Detect attributes for every row
  const enriched: ProcessedRow[] = rows.map((r, i) => {
    const attrs = detectAttributes(r);
    return {
      id: `r_${i}`,
      ...r,
      attrs,
      split: "train",
      weight: 1,
      synthetic: false,
    };
  });

  const keyFn = (r: ProcessedRow) =>
    sensitiveAxis === "ethnicity" ? r.attrs.ethnicity : r.attrs.gender;

  // Frequency counts
  const freq = new Map<string, number>();
  for (const r of enriched) freq.set(keyFn(r), (freq.get(keyFn(r)) || 0) + 1);

  // Stratified split 70/15/15
  const { train, val, test } = stratifiedSplit(enriched, keyFn, [0.7, 0.15, 0.15]);
  for (const r of train) r.split = "train";
  for (const r of val) r.split = "validation";
  for (const r of test) r.split = "test";

  // Inverse-frequency weights (normalized so they sum to 1)
  const total = enriched.length || 1;
  const rawWeights = new Map<string, number>();
  for (const [g, c] of freq.entries()) rawWeights.set(g, total / Math.max(1, c));
  const weightSum = Array.from(rawWeights.values()).reduce((a, b) => a + b, 0) || 1;
  const normWeights = new Map<string, number>();
  for (const [g, w] of rawWeights.entries()) normWeights.set(g, w / weightSum);
  for (const r of enriched) r.weight = normWeights.get(keyFn(r)) || 0;

  // Augmentation for groups < 50 samples (only on training rows)
  let augmentedCount = 0;
  const additions: ProcessedRow[] = [];
  for (const [g, count] of freq.entries()) {
    if (count >= 50) continue;
    const groupTrainRows = train.filter((r) => keyFn(r) === g);
    let nextId = enriched.length + additions.length;
    for (const r of groupTrainRows) {
      for (let k = 0; k < 2; k++) {
        const newText = synonymReplace(r.resume_text, nextId * 31 + k);
        additions.push({
          ...r,
          id: `r_${nextId}`,
          resume_text: newText,
          synthetic: true,
          split: "train",
        });
        nextId++;
        augmentedCount++;
      }
    }
  }

  const allRows = [...enriched, ...additions];

  // Recompute split stats including augmentation
  const trainAll = allRows.filter((r) => r.split === "train");
  const valAll = allRows.filter((r) => r.split === "validation");
  const testAll = allRows.filter((r) => r.split === "test");

  return {
    totalSamples: allRows.length,
    augmentedSamples: augmentedCount,
    splitStats: {
      byEthnicity: statsFor(trainAll, valAll, testAll, (r) => r.attrs.ethnicity),
      byGender: statsFor(trainAll, valAll, testAll, (r) => r.attrs.gender),
    },
    weightDistribution: Array.from(freq.entries()).map(([group, count]) => ({
      group,
      count,
      weight: normWeights.get(group) || 0,
    })),
    rows: allRows,
  };
}
