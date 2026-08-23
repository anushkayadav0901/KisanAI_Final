/**
 * lib/retrieval.js — BM25 lexical retrieval over the advisory corpus
 *
 * Why BM25 rather than embeddings: it needs no API key, no network call and no
 * model download, it is deterministic, and — most importantly here — it is
 * explainable. When an advisory cites a passage we can show exactly which query
 * terms matched it. An embedding score of 0.81 tells a farmer nothing; "matched
 * on 'yellow rust', 'wheat', 'tillering'" tells them something.
 *
 * The scoring is standard Okapi BM25. An embedding reranker can be layered on
 * top later without changing the interface below.
 */

// ── Domain types ──────────────────────────────────────────────────────────────

export interface PassageMeta {
  heading?: string;
  docTitle: string;
  crop?: string | null;
  topic?: string;
  publisher: string;
  section: number;
}

export interface Passage {
  id: string;
  docId: string;
  text: string;
  meta: PassageMeta;
}

export interface DocumentSection {
  heading: string;
  text: string;
}

export interface AdvisoryDocument {
  id: string;
  title: string;
  crop?: string | null;
  topic?: string;
  source: { publisher: string };
  sections: DocumentSection[];
}

export interface SearchHit {
  passage: Passage;
  score: number;
  matchedTerms: string[];
  coverage: number;
}

export interface GroundingAssessment {
  grounded: boolean;
  reason?: string;
  topScore?: number;
  coverage?: number;
}

export interface GateConfig {
  minMatchedTerms: number;
  minCoverage: number;
  minTopScore: number;
}

// ── Tokenisation ──────────────────────────────────────────────────────────────

/**
 * Stopwords kept deliberately small. Aggressive stopword lists hurt
 * agricultural queries, where words like "after", "before" and "between" carry
 * real meaning ("spray after flowering" is not "spray before flowering").
 */
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "of", "to", "in", "on", "at", "by", "for", "with", "as", "and", "or",
  "it", "its", "this", "that", "these", "those", "i", "my", "me", "we",
  "you", "your", "he", "she", "they", "them", "do", "does", "did", "so",
  "if", "then", "than", "there", "here", "what", "which", "who", "how",
]);

export function tokenise(text: unknown): string[] {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Very light suffix stripping. A full stemmer is overkill and misfires on
 * agricultural vocabulary ("blight"/"blights" matters, "rust"/"rusty" does
 * not), so this only handles plurals and common verb endings.
 */
function stem(token: string): string {
  if (token.length <= 4) return token;
  return token
    .replace(/ies$/, "y")
    .replace(/(sses|shes|ches|xes)$/, (m) => m.slice(0, -2))
    .replace(/([^s])s$/, "$1")
    .replace(/(ing|ed)$/, "");
}

const normalise = (text: unknown): string[] => tokenise(text).map(stem);

// ── Index ─────────────────────────────────────────────────────────────────────

const K1 = 1.5; // term-frequency saturation
const B = 0.75; // length normalisation

export class BM25Index {
  passages: Passage[];
  termFreqs: Map<string, number>[];
  lengths: number[];
  avgLength: number;
  docFreq: Map<string, number>;
  N: number;

  constructor(passages: Passage[]) {
    this.passages = passages;

    this.termFreqs = passages.map((p) => {
      const counts = new Map<string, number>();
      for (const term of normalise(`${p.meta?.heading ?? ""} ${p.text}`)) {
        counts.set(term, (counts.get(term) ?? 0) + 1);
      }
      return counts;
    });

    this.lengths = this.termFreqs.map((m) =>
      [...m.values()].reduce((a, b) => a + b, 0),
    );
    this.avgLength =
      this.lengths.reduce((a, b) => a + b, 0) / Math.max(this.lengths.length, 1);

    // Document frequency per term.
    this.docFreq = new Map();
    for (const counts of this.termFreqs) {
      for (const term of counts.keys()) {
        this.docFreq.set(term, (this.docFreq.get(term) ?? 0) + 1);
      }
    }

    this.N = passages.length;
  }

  idf(term: string): number {
    const df = this.docFreq.get(term) ?? 0;
    // BM25 probabilistic IDF, floored so very common terms cannot go negative.
    return Math.max(0.05, Math.log(1 + (this.N - df + 0.5) / (df + 0.5)));
  }

  search(
    query: string,
    { limit = 5, minScore = 1.0 }: { limit?: number; minScore?: number } = {},
  ): SearchHit[] {
    const queryTerms = [...new Set(normalise(query))];
    if (queryTerms.length === 0) return [];

    const scored = this.passages.map((passage, i): SearchHit => {
      const counts = this.termFreqs[i]!;
      const len = this.lengths[i]!;
      let score = 0;
      const matchedTerms: string[] = [];

      for (const term of queryTerms) {
        const tf = counts.get(term);
        if (!tf) continue;
        matchedTerms.push(term);
        const denom = tf + K1 * (1 - B + (B * len) / this.avgLength);
        score += this.idf(term) * ((tf * (K1 + 1)) / denom);
      }

      return {
        passage,
        score,
        matchedTerms,
        // How much of what the farmer asked was actually found. A high score
        // from one common word is not relevance, so callers gate on this too.
        coverage: matchedTerms.length / queryTerms.length,
      };
    });

    return scored
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /** Query terms after normalisation — exposed so callers can report coverage. */
  queryTerms(query: string): string[] {
    return [...new Set(normalise(query))];
  }
}

// -- Relevance gate -----------------------------------------------------------

/**
 * Decides whether a result set is strong enough to ground an answer on.
 *
 * A raw BM25 floor is not sufficient on its own. "which brand of tractor should
 * I buy" matches the single word "should" inside an irrigation passage and
 * scores above any sensible floor, yet the corpus plainly cannot answer it.
 * Three signals together separate real matches from incidental ones:
 *
 *   1. at least two distinct query terms matched, which kills single
 *      common-word hits outright
 *   2. a minimum share of the question actually found in the passage
 *   3. an absolute score floor, which filters weak multi-term coincidences
 *
 * Returns the decision plus its reasoning, so an API consumer can see why a
 * question was refused rather than being told only that it was.
 */
export const GATE: GateConfig = {
  minMatchedTerms: 2,
  minCoverage: 0.4,
  minTopScore: 6.0,
};

export function assessGrounding(hits: SearchHit[]): GroundingAssessment {
  if (hits.length === 0) {
    return { grounded: false, reason: "no passage matched the question at all" };
  }

  const top = hits[0]!;

  if (top.matchedTerms.length < GATE.minMatchedTerms) {
    return {
      grounded: false,
      reason: `only ${top.matchedTerms.length} term matched (${top.matchedTerms.join(", ")}), which is incidental rather than relevant`,
      topScore: Number(top.score.toFixed(2)),
    };
  }

  if (top.coverage < GATE.minCoverage) {
    return {
      grounded: false,
      reason: `only ${Math.round(top.coverage * 100)}% of the question was found in the corpus, below the ${Math.round(GATE.minCoverage * 100)}% needed`,
      topScore: Number(top.score.toFixed(2)),
    };
  }

  if (top.score < GATE.minTopScore) {
    return {
      grounded: false,
      reason: `best match scored ${top.score.toFixed(2)}, below the ${GATE.minTopScore} required to answer`,
      topScore: Number(top.score.toFixed(2)),
    };
  }

  return {
    grounded: true,
    topScore: Number(top.score.toFixed(2)),
    coverage: Number(top.coverage.toFixed(2)),
  };
}

// ── Chunking ──────────────────────────────────────────────────────────────────

/**
 * Splits a document into retrievable passages on its section headings.
 *
 * Sections are the right unit for agricultural guidance: a farmer asking about
 * a spray window needs the whole window with its caveats, not a stray sentence
 * from the middle of it. Anything unusually long is split further on sentence
 * boundaries so a citation stays quotable.
 */
export function chunkDocument(
  doc: AdvisoryDocument,
  { maxChars = 900 }: { maxChars?: number } = {},
): Passage[] {
  const passages: Passage[] = [];

  doc.sections.forEach((section: DocumentSection, sIdx: number) => {
    const base = {
      docId: doc.id,
      meta: {
        heading: section.heading,
        docTitle: doc.title,
        crop: doc.crop,
        topic: doc.topic,
        publisher: doc.source.publisher,
        section: sIdx + 1,
      },
    };

    if (section.text.length <= maxChars) {
      passages.push({ id: `${doc.id}#${sIdx + 1}`, text: section.text, ...base });
      return;
    }

    const sentences = section.text.split(/(?<=\.)\s+/);
    let buffer = "";
    let part = 1;

    const flush = (): void => {
      if (!buffer.trim()) return;
      passages.push({
        id: `${doc.id}#${sIdx + 1}.${part}`,
        text: buffer.trim(),
        ...base,
      });
      part += 1;
      buffer = "";
    };

    for (const sentence of sentences) {
      if ((buffer + sentence).length > maxChars) flush();
      buffer += `${sentence} `;
    }
    flush();
  });

  return passages;
}
