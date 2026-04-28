// Adversarial debiasing classifier implemented with hand-rolled gradients.
// Architecture:
//   x (384) -> Dense(128, ReLU) [feature extractor]
//          -> Dense(1, sigmoid) [main classifier: hire probability]
//          -> GradientReversal(-lambda) -> Dense(G, softmax) [adversary]
// Loss: BCE_main + lambda * CrossEntropy_adversary

import { embed, EMBED_DIM } from "./embedding.js";
import type { ModelState, ProcessedRow, TrainingHistoryEntry } from "./store.js";

const HIDDEN = 128;
const LR = 0.05;
const LAMBDA = 0.5;

function randn(n: number, seed: number): Float32Array {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    // Box-Muller
    const u1 = Math.max(rnd(), 1e-9);
    const u2 = rnd();
    v[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * 0.1;
  }
  return v;
}

export function initModel(groups: string[], groupAxis: "ethnicity" | "gender"): ModelState {
  const G = groups.length;
  return {
    trained: false,
    groups,
    groupAxis,
    W1: randn(EMBED_DIM * HIDDEN, 1),
    b1: new Float32Array(HIDDEN),
    W2: randn(HIDDEN, 7),
    b2: 0,
    Wa: randn(HIDDEN * G, 13),
    ba: new Float32Array(G),
    history: [],
    version: "v1.0.0-" + Date.now().toString(36),
  };
}

function sigmoid(x: number): number {
  if (x >= 0) return 1 / (1 + Math.exp(-x));
  const e = Math.exp(x);
  return e / (1 + e);
}

function relu(x: number): number {
  return x > 0 ? x : 0;
}

export interface ForwardResult {
  h: Float32Array; // hidden (HIDDEN)
  hMask: Float32Array; // ReLU mask (1 where active)
  pHire: number;
  advLogits: Float32Array;
  advProbs: Float32Array;
}

export function forward(model: ModelState, x: Float32Array): ForwardResult {
  const G = model.groups.length;
  const h = new Float32Array(HIDDEN);
  const hMask = new Float32Array(HIDDEN);
  for (let j = 0; j < HIDDEN; j++) {
    let sum = model.b1[j]!;
    for (let i = 0; i < EMBED_DIM; i++) sum += x[i]! * model.W1[i * HIDDEN + j]!;
    const a = relu(sum);
    h[j] = a;
    hMask[j] = sum > 0 ? 1 : 0;
  }
  let z = model.b2;
  for (let j = 0; j < HIDDEN; j++) z += h[j]! * model.W2[j]!;
  const pHire = sigmoid(z);
  // Adversary
  const advLogits = new Float32Array(G);
  for (let g = 0; g < G; g++) {
    let s = model.ba[g]!;
    for (let j = 0; j < HIDDEN; j++) s += h[j]! * model.Wa[j * G + g]!;
    advLogits[g] = s;
  }
  // softmax
  let mx = -Infinity;
  for (let g = 0; g < G; g++) if (advLogits[g]! > mx) mx = advLogits[g]!;
  let sum = 0;
  const advProbs = new Float32Array(G);
  for (let g = 0; g < G; g++) {
    advProbs[g] = Math.exp(advLogits[g]! - mx);
    sum += advProbs[g]!;
  }
  for (let g = 0; g < G; g++) advProbs[g] = advProbs[g]! / (sum || 1);
  return { h, hMask, pHire, advLogits, advProbs };
}

interface BackwardInput {
  x: Float32Array;
  y: number; // 0 or 1 hire label
  groupIndex: number;
  weight: number;
}

function step(model: ModelState, batch: BackwardInput[]): { lossMain: number; lossAdv: number } {
  const G = model.groups.length;
  let lossMain = 0;
  let lossAdv = 0;

  // Accumulate gradients
  const dW1 = new Float32Array(EMBED_DIM * HIDDEN);
  const db1 = new Float32Array(HIDDEN);
  const dW2 = new Float32Array(HIDDEN);
  let db2 = 0;
  const dWa = new Float32Array(HIDDEN * G);
  const dba = new Float32Array(G);

  for (const sample of batch) {
    const { x, y, groupIndex, weight } = sample;
    const fwd = forward(model, x);
    const { h, hMask, pHire, advProbs } = fwd;

    // BCE loss on main
    const eps = 1e-7;
    const lm = -(y * Math.log(pHire + eps) + (1 - y) * Math.log(1 - pHire + eps));
    lossMain += lm * weight;
    // CE on adversary
    const la = -Math.log(Math.max(advProbs[groupIndex]!, eps));
    lossAdv += la * weight;

    // ----- Backprop main classifier -----
    // dL/dz = pHire - y
    const dzMain = (pHire - y) * weight;
    db2 += dzMain;
    for (let j = 0; j < HIDDEN; j++) dW2[j] += dzMain * h[j]!;
    const dh_main = new Float32Array(HIDDEN);
    for (let j = 0; j < HIDDEN; j++) dh_main[j] = dzMain * model.W2[j]!;

    // ----- Backprop adversary -----
    // dL/dlogit_g = adv_prob_g - 1{g==target}
    const dlogit = new Float32Array(G);
    for (let g = 0; g < G; g++) {
      dlogit[g] = (advProbs[g]! - (g === groupIndex ? 1 : 0)) * weight;
      dba[g] += dlogit[g]!;
    }
    for (let j = 0; j < HIDDEN; j++) {
      for (let g = 0; g < G; g++) {
        dWa[j * G + g] += dlogit[g]! * h[j]!;
      }
    }
    // dh from adversary, then apply gradient reversal: multiply by -LAMBDA
    const dh_adv = new Float32Array(HIDDEN);
    for (let j = 0; j < HIDDEN; j++) {
      let s = 0;
      for (let g = 0; g < G; g++) s += dlogit[g]! * model.Wa[j * G + g]!;
      dh_adv[j] = -LAMBDA * s;
    }

    // Total dh for shared trunk
    for (let j = 0; j < HIDDEN; j++) {
      const grad_h = dh_main[j]! + dh_adv[j]!;
      const grad_pre = grad_h * hMask[j]!;
      db1[j] += grad_pre;
      for (let i = 0; i < EMBED_DIM; i++) dW1[i * HIDDEN + j] += grad_pre * x[i]!;
    }
  }

  const n = Math.max(1, batch.length);
  for (let i = 0; i < model.W1.length; i++) model.W1[i] = model.W1[i]! - (LR * dW1[i]!) / n;
  for (let i = 0; i < HIDDEN; i++) model.b1[i] = model.b1[i]! - (LR * db1[i]!) / n;
  for (let j = 0; j < HIDDEN; j++) model.W2[j] = model.W2[j]! - (LR * dW2[j]!) / n;
  model.b2 = model.b2 - (LR * db2) / n;
  for (let i = 0; i < model.Wa.length; i++) model.Wa[i] = model.Wa[i]! - (LR * dWa[i]!) / n;
  for (let g = 0; g < G; g++) model.ba[g] = model.ba[g]! - (LR * dba[g]!) / n;

  return { lossMain: lossMain / n, lossAdv: lossAdv / n };
}

export interface TrainOptions {
  epochs?: number;
  batchSize?: number;
}

export function train(rows: ProcessedRow[], groupAxis: "ethnicity" | "gender", opts: TrainOptions = {}): ModelState {
  const epochs = opts.epochs ?? 20;
  const batchSize = opts.batchSize ?? 16;

  const groups = Array.from(
    new Set(rows.map((r) => (groupAxis === "ethnicity" ? r.attrs.ethnicity : r.attrs.gender))),
  );
  const groupIndex = new Map(groups.map((g, i) => [g, i]));
  const model = initModel(groups, groupAxis);

  // Pre-embed all rows
  const trainRows = rows.filter((r) => r.split === "train");
  const valRows = rows.filter((r) => r.split === "validation");
  const cache = new Map<string, Float32Array>();
  for (const r of [...trainRows, ...valRows]) cache.set(r.id, embed(r.resume_text));

  let bestGap = Infinity;
  let stagnant = 0;
  for (let epoch = 1; epoch <= epochs; epoch++) {
    // Shuffle
    const order = trainRows.map((_, i) => i).sort(() => Math.random() - 0.5);
    let totalMain = 0, totalAdv = 0, batches = 0;
    for (let i = 0; i < order.length; i += batchSize) {
      const slice = order.slice(i, i + batchSize);
      const batch: BackwardInput[] = slice.map((idx) => {
        const r = trainRows[idx]!;
        const g = groupAxis === "ethnicity" ? r.attrs.ethnicity : r.attrs.gender;
        return {
          x: cache.get(r.id)!,
          y: r.label,
          groupIndex: groupIndex.get(g) ?? 0,
          weight: r.weight * trainRows.length,
        };
      });
      const { lossMain, lossAdv } = step(model, batch);
      totalMain += lossMain;
      totalAdv += lossAdv;
      batches++;
    }

    // Validation: compute fairness gap (max ΔTPR across groups) and accuracy
    const perGroupTPR = new Map<string, { pos: number; tp: number }>();
    let correct = 0;
    for (const r of valRows) {
      const fwd = forward(model, cache.get(r.id)!);
      const pred = fwd.pHire >= 0.5 ? 1 : 0;
      if (pred === r.label) correct++;
      const g = groupAxis === "ethnicity" ? r.attrs.ethnicity : r.attrs.gender;
      const cur = perGroupTPR.get(g) || { pos: 0, tp: 0 };
      if (r.label === 1) {
        cur.pos++;
        if (pred === 1) cur.tp++;
      }
      perGroupTPR.set(g, cur);
    }
    const tprs = Array.from(perGroupTPR.values())
      .filter((v) => v.pos > 0)
      .map((v) => v.tp / v.pos);
    const gap = tprs.length >= 2 ? Math.max(...tprs) - Math.min(...tprs) : 0;
    const valAccuracy = valRows.length ? correct / valRows.length : 0;

    const entry: TrainingHistoryEntry = {
      epoch,
      loss_main: totalMain / Math.max(1, batches),
      loss_adversary: totalAdv / Math.max(1, batches),
      fairness_gap: gap,
      val_accuracy: valAccuracy,
    };
    model.history.push(entry);

    if (gap < bestGap - 0.001) {
      bestGap = gap;
      stagnant = 0;
    } else {
      stagnant++;
      if (stagnant >= 5 && epoch >= 8) break; // early stopping
    }
  }

  model.trained = true;
  model.trainedAt = Date.now();
  return model;
}

export function predict(model: ModelState, text: string) {
  const x = embed(text);
  const fwd = forward(model, x);
  // Confidence = how far from 0.5
  const confidence = Math.min(1, Math.abs(fwd.pHire - 0.5) * 2);
  let advTopIdx = 0;
  for (let g = 1; g < fwd.advProbs.length; g++) {
    if (fwd.advProbs[g]! > fwd.advProbs[advTopIdx]!) advTopIdx = g;
  }
  return {
    hire_probability: fwd.pHire,
    confidence,
    sensitive_group_prediction: model.groups[advTopIdx] ?? "Unknown",
    sensitive_group_probs: Object.fromEntries(model.groups.map((g, i) => [g, fwd.advProbs[i]!])),
  };
}
