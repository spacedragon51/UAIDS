// Deterministic 384-dim hashed embedding for resume text.
// Mirrors the role of all-MiniLM-L6-v2 in the architecture (fixed 384-dim
// dense vectors per document) without requiring a heavyweight transformer
// download. Tokens are hashed into the embedding space and L2-normalized.

export const EMBED_DIM = 384;

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for",
  "with", "by", "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "must", "shall", "this", "that", "these", "those", "i", "me",
  "my", "we", "our", "you", "your", "he", "she", "it", "they", "them", "his",
  "her", "their", "its", "if", "then", "than", "so", "such", "not", "no",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function hash32(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function embed(text: string): Float32Array {
  const v = new Float32Array(EMBED_DIM);
  const tokens = tokenize(text);
  if (tokens.length === 0) return v;
  for (const tok of tokens) {
    const h1 = hash32(tok);
    const h2 = hash32("ngram_" + tok);
    const sign1 = (h1 & 1) === 0 ? 1 : -1;
    const sign2 = (h2 & 1) === 0 ? 1 : -1;
    v[h1 % EMBED_DIM] += sign1;
    v[h2 % EMBED_DIM] += sign2 * 0.5;
    // Bigrams enrich representation
    for (let i = 0; i < tok.length - 2; i++) {
      const tri = tok.substring(i, i + 3);
      const ht = hash32("c_" + tri);
      v[ht % EMBED_DIM] += ((ht & 1) === 0 ? 1 : -1) * 0.25;
    }
  }
  // L2 normalize
  let norm = 0;
  for (let i = 0; i < EMBED_DIM; i++) norm += v[i]! * v[i]!;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < EMBED_DIM; i++) v[i] = v[i]! / norm;
  return v;
}

// Per-token embeddings (each token represented as its own vector) — used by
// the explainability endpoint to compute token-level importance scores.
export function embedTokens(text: string): { tokens: string[]; vectors: Float32Array[] } {
  const tokens = tokenize(text);
  const vectors = tokens.map((t) => embed(t));
  return { tokens, vectors };
}
