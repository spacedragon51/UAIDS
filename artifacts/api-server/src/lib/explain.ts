// Token-level importance via finite-difference perturbation. Mirrors
// "Grad-CAM-for-text" intent: drop each token, observe Δ in hire probability,
// and use the negated delta as the token's importance score.

import { tokenize } from "./embedding.js";
import { predict } from "./model.js";
import type { ModelState } from "./store.js";

export interface TokenImportance {
  token: string;
  importance: number;
  index: number;
}

export function explain(model: ModelState, text: string) {
  const tokens = tokenize(text);
  const base = predict(model, text).hire_probability;

  const importances: TokenImportance[] = tokens.map((t, i) => {
    const without = tokens.slice(0, i).concat(tokens.slice(i + 1)).join(" ");
    const p = without ? predict(model, without).hire_probability : base;
    // If removing the token drops probability, it was positive (good). So
    // importance = base - p.
    return { token: t, importance: base - p, index: i };
  });

  const top = [...importances].sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance)).slice(0, 10);
  return {
    hire_probability: base,
    tokens: importances,
    top_tokens: top,
  };
}
