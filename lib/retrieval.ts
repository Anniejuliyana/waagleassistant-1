/**
 * Lexical BM25 retrieval over data/knowledge-base.json. Zero external
 * services required. Optionally re-ranks with OpenAI embeddings when
 * OPENAI_API_KEY is set (best-effort, fully optional).
 */
import fs from "fs";
import path from "path";

export type KBChunk = {
  id: string;
  url: string;
  title: string;
  breadcrumb: string;
  category: string;
  headingPath: string;
  text: string;
  tags: string[];
  lastUpdated: string | null;
};

export type RetrievalResult = {
  chunk: KBChunk;
  score: number;
  confidence: number; // 0-1
};

export type RetrievalResponse = {
  results: RetrievalResult[];
  verdict: "high" | "low";
  matchedCategory: string | null;
};

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "to", "of", "in", "on", "at", "for", "with", "about", "as", "by",
  "and", "or", "but", "if", "so", "than", "then", "that", "this",
  "it", "its", "i", "you", "your", "my", "me", "we", "our", "do", "does",
  "did", "can", "could", "will", "would", "should", "what", "when",
  "where", "how", "why", "who", "which", "there", "here", "not",
  "have", "has", "had", "just", "also", "into", "up", "down", "out",
]);

const SYNONYMS: Record<string, string[]> = {
  dog: ["pet", "puppy", "canine"],
  puppy: ["dog", "pet"],
  cam: ["camera"],
  camera: ["cam"],
  monitor: ["sensor", "device"],
  refund: ["return", "money back", "reimbursement"],
  return: ["refund", "send back"],
  price: ["cost", "pricing", "plan"],
  cost: ["price", "pricing"],
  cancel: ["cancellation", "unsubscribe"],
  ship: ["shipping", "delivery"],
  shipping: ["ship", "delivery"],
  broken: ["defective", "not working", "malfunction"],
  warranty: ["guarantee", "replacement"],
  europe: ["eu", "international", "overseas"],
  subscription: ["plan", "billing", "membership"],
  wifi: ["wi-fi", "wireless"],
  battery: ["power", "charge"],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Shipping: ["ship", "shipping", "delivery", "deliver"],
  Warranty: ["warranty", "replacement", "return", "refund", "broken", "defective"],
  Subscription: ["subscription", "billing", "plan", "price", "cost", "cancel", "renew"],
  Setup: ["setup", "install", "connect", "pair", "register", "activate"],
  Troubleshooting: ["troubleshoot", "not working", "offline", "won't", "wont", "issue", "problem"],
  Ordering: ["order", "buy", "purchase"],
};

let CACHE: KBChunk[] | null = null;

export function loadKB(): KBChunk[] {
  if (CACHE) return CACHE;
  const p = path.join(process.cwd(), "data", "knowledge-base.json");
  const raw = fs.readFileSync(p, "utf-8");
  CACHE = JSON.parse(raw);
  return CACHE!;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s%$.-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeForScoring(text: string): string[] {
  return tokenize(text).filter((t) => !STOPWORDS.has(t));
}

function expandQuery(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const t of tokens) {
    const syns = SYNONYMS[t];
    if (syns) syns.forEach((s) => s.split(/\s+/).forEach((w) => expanded.add(w)));
  }
  return Array.from(expanded);
}

function generateQueryVariants(query: string): string[][] {
  const base = normalizeForScoring(query);
  const expanded = expandQuery(base);
  // Variant: keyword-only, variant: expanded with synonyms, variant: raw tokens (no stopword removal, for exact phrase-ish matches)
  const raw = tokenize(query);
  return [base, expanded, raw];
}

function detectCategory(query: string): string | null {
  const q = query.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => q.includes(k))) return category;
  }
  return null;
}

/** BM25 scoring across the corpus for a single set of query tokens. */
function bm25Scores(corpus: KBChunk[], docTokens: string[][], queryTokens: string[]): number[] {
  const N = corpus.length;
  const avgdl = docTokens.reduce((a, d) => a + d.length, 0) / Math.max(N, 1);
  const k1 = 1.5;
  const b = 0.75;

  // document frequency per term
  const df: Record<string, number> = {};
  for (const doc of docTokens) {
    const seen = Array.from(new Set(doc));
    for (const term of seen) df[term] = (df[term] || 0) + 1;
  }

  const scores = new Array(N).fill(0);
  for (const term of queryTokens) {
    const dfT = df[term] || 0;
    if (dfT === 0) continue;
    const idf = Math.log(1 + (N - dfT + 0.5) / (dfT + 0.5));
    for (let i = 0; i < N; i++) {
      const doc = docTokens[i];
      if (doc.length === 0) continue;
      const tf = doc.filter((w) => w === term).length;
      if (tf === 0) continue;
      const denom = tf + k1 * (1 - b + (b * doc.length) / avgdl);
      scores[i] += idf * ((tf * (k1 + 1)) / denom);
    }
  }
  return scores;
}

export function retrieve(query: string, topK = 5): RetrievalResponse {
  const corpus = loadKB();
  const docTokens = corpus.map((c) =>
    normalizeForScoring(`${c.title} ${c.headingPath} ${c.text} ${c.tags.join(" ")}`)
  );

  const variants = generateQueryVariants(query);
  const combined = new Array(corpus.length).fill(0);
  for (const variant of variants) {
    if (variant.length === 0) continue;
    const s = bm25Scores(corpus, docTokens, variant);
    for (let i = 0; i < s.length; i++) combined[i] += s[i];
  }

  const matchedCategory = detectCategory(query);

  let ranked = corpus.map((chunk, i) => ({ chunk, score: combined[i] }));

  if (matchedCategory) {
    // Boost matching category, but don't hard-filter (avoid zero-result traps)
    ranked = ranked.map((r) =>
      r.chunk.category === matchedCategory ? { ...r, score: r.score * 1.35 } : r
    );
  }

  ranked = ranked.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);

  const maxScore = ranked.length > 0 ? ranked[0].score : 0;
  const top = ranked.slice(0, topK).map((r) => ({
    chunk: r.chunk,
    score: r.score,
    confidence: maxScore > 0 ? Math.min(1, r.score / maxScore) : 0,
  }));

  const verdict: "high" | "low" = top.length > 0 && top[0].confidence >= 0.55 && top[0].score > 1.0 ? "high" : "low";

  return { results: top, verdict, matchedCategory };
}

const COMPANY_KEYWORDS = [
  "waggle", "subscription", "billing", "plan", "price", "cost", "cancel",
  "refund", "return", "warranty", "replacement", "shipping", "ship",
  "deliver", "order", "account", "app", "device", "sensor", "camera",
  "monitor", "wagglecam", "pet monitor", "rv", "troubleshoot", "setup",
  "install", "connect", "pair", "wifi", "battery", "charge", "led",
  "support", "help", "europe", "international", "coverage", "signal",
  "sim", "4g", "activation", "register",
];

const GENERAL_PET_KEYWORDS = [
  "eat", "food", "feed", "diet", "nutrition", "toxic", "poison", "breed",
  "vaccine", "vaccinat", "groom", "train", "puppy training", "vet",
  "veterinarian", "symptom", "sick", "vomit", "diarrhea", "seizure",
  "bleeding", "choking", "allergy", "flea", "tick", "worm", "heatstroke",
  "exercise", "walk", "socializ", "behavior", "bark", "chew", "teeth",
  "weight", "obesity", "pregnan", "spay", "neuter", "first aid",
];

/** Heuristic: does this query look like it's about Waggle-the-company/product, vs general pet care? */
export function classifyIntent(query: string): "company" | "general" | "ambiguous" {
  const q = query.toLowerCase();
  const companyHit = COMPANY_KEYWORDS.some((k) => q.includes(k));
  const generalHit = GENERAL_PET_KEYWORDS.some((k) => q.includes(k));
  if (companyHit && !generalHit) return "company";
  if (generalHit && !companyHit) return "general";
  if (companyHit && generalHit) return "company"; // company context wins when device+pet both mentioned
  return "ambiguous";
}

/** Optional embeddings re-rank; only runs if OPENAI_API_KEY is present. Falls back silently on any error. */
export async function rerankWithEmbeddings(
  query: string,
  candidates: RetrievalResult[]
): Promise<RetrievalResult[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || candidates.length === 0) return candidates;
  try {
    const { embed, embedMany } = await import("ai");
    const { openai } = await import("@ai-sdk/openai");
    const model = openai.embedding("text-embedding-3-small");
    const { embedding: queryEmbedding } = await embed({ model, value: query });
    const { embeddings } = await embedMany({
      model,
      values: candidates.map((c) => c.chunk.text),
    });
    const cosine = (a: number[], b: number[]) => {
      let dot = 0, na = 0, nb = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
      }
      return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
    };
    const rescored = candidates.map((c, i) => ({
      ...c,
      score: cosine(queryEmbedding, embeddings[i]),
    }));
    rescored.sort((a, b) => b.score - a.score);
    const max = rescored[0]?.score || 1;
    return rescored.map((r) => ({ ...r, confidence: Math.max(0, Math.min(1, r.score / max)) }));
  } catch {
    return candidates;
  }
}
