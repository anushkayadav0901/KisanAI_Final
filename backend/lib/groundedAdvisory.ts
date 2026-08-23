import {
  BM25Index,
  chunkDocument,
  assessGrounding,
  GATE,
  type GroundingAssessment,
} from "./retrieval.js";
import { CORPUS, type KnowledgeDoc } from "../data/knowledge/corpus.js";
import { callGemini, parseGeminiJson } from "./gemini.js";

export interface RetrievedPassage {
  passageId: string;
  docId: string;
  docTitle: string;
  heading: string;
  crop: string | null;
  topic: string;
  text: string;
  score: number;
  coverage: number;
  matchedTerms: string[];
  source: KnowledgeDoc["source"];
}

export interface GateInfo {
  decision: "refused" | "answered";
  [key: string]: unknown;
}

export interface AdvisoryCitation {
  n: number | undefined;
  passageId: string;
  docId: string;
  docTitle: string;
  heading: string;
  text: string;
  score: number;
  matchedTerms: string[];
  source: KnowledgeDoc["source"];
}

export interface ConsideredPassage {
  passageId: string;
  docTitle: string;
  heading: string;
  score: number;
  matchedTerms: string[];
}

export interface GroundedAdvisory {
  answerable: boolean;
  answer: string;
  missing: string;
  citations: AdvisoryCitation[];
  confidence: string;
  escalate: boolean;
  grounded: boolean;
  retrieved: number;
  query: string;
  gate: GateInfo;
  suggestion?: string;
  consideredPassages?: ConsideredPassage[];
}

interface RawModelAnswer {
  answerable?: unknown;
  answer?: unknown;
  missing?: unknown;
  confidence?: unknown;
  escalate?: unknown;
  citations?: unknown;
}

const PASSAGES = CORPUS.flatMap((doc) => chunkDocument(doc));
const INDEX = new BM25Index(PASSAGES);

export const CORPUS_STATS = {
  documents: CORPUS.length,
  passages: PASSAGES.length,
  crops: [...new Set(CORPUS.map((d) => d.crop))],
  topics: [...new Set(CORPUS.map((d) => d.topic))],
  provenance:
    "Curated draft corpus written for this project. Not extracted from ICAR, " +
    "KVK or state agricultural university publications. Each document carries " +
    "a verification link to official portals.",
};

const DOC_BY_ID: Record<string, KnowledgeDoc> = Object.fromEntries(
  CORPUS.map((d) => [d.id, d]),
);

const RELEVANCE_FLOOR = 2.0;

export function retrieveWithAssessment(
  query: string,
  { limit = 5 }: { limit?: number } = {},
): { hits: ReturnType<BM25Index["search"]>; assessment: GroundingAssessment } {
  const hits = INDEX.search(query, { limit, minScore: RELEVANCE_FLOOR });
  return { hits, assessment: assessGrounding(hits) };
}

export function retrieve(
  query: string,
  { limit = 5 }: { limit?: number } = {},
): RetrievedPassage[] {
  const hits = INDEX.search(query, { limit, minScore: RELEVANCE_FLOOR });

  return hits.map((hit): RetrievedPassage | null => {
    const doc = DOC_BY_ID[hit.passage.docId];
    if (!doc) return null;
    return {
      passageId: hit.passage.id,
      docId: hit.passage.docId,
      docTitle: hit.passage.meta.docTitle,
      heading: hit.passage.meta.heading ?? "",
      crop: hit.passage.meta.crop ?? null,
      topic: hit.passage.meta.topic ?? "",
      text: hit.passage.text,
      score: Number(hit.score.toFixed(3)),
      coverage: Number(hit.coverage.toFixed(2)),
      matchedTerms: hit.matchedTerms,
      source: doc.source,
    };
  }).filter((p): p is RetrievedPassage => p !== null);
}

const SYSTEM_RULES = `You are an agricultural advisor for Indian farmers. You are given numbered SOURCE passages and a farmer's question.

Absolute rules:
1. Use ONLY information present in the SOURCE passages. Do not add agronomic facts from your own knowledge, however confident you are.
2. Every statement in "answer" must be traceable to a source. Cite the source number inline like [1] or [2].
3. If the sources do not contain enough to answer, set "answerable" to false and explain what is missing. Do not partially guess.
4. Never state a pesticide dose as final. Where a source mentions a chemical, always include the instruction to confirm with the product label and the local Krishi Vigyan Kendra.
5. Write plainly, for a farmer, not an agronomist. Short sentences.

Return ONLY valid JSON:
{
  "answerable": boolean,
  "answer": "The advisory, with inline [n] citations. Empty string if answerable is false.",
  "missing": "If not answerable, what information would be needed. Empty string otherwise.",
  "citations": [ { "n": 1, "passageId": "the id given with the source" } ],
  "confidence": "high" | "medium" | "low",
  "escalate": boolean
}

Set "escalate" to true when the situation warrants confirmation from a Krishi Vigyan Kendra or laboratory rather than acting on this advisory alone.`;

function buildPrompt(question: string, passages: RetrievedPassage[]): string {
  const sources = passages
    .map(
      (p, i) =>
        `[${i + 1}] passageId: ${p.passageId}\nDocument: ${p.docTitle} — ${p.heading}\n${p.text}`,
    )
    .join("\n\n");

  return `${SYSTEM_RULES}

SOURCE PASSAGES
${sources}

FARMER'S QUESTION
${question}`;
}

function refusal(question: string, assessment: GroundingAssessment): GroundedAdvisory {
  return {
    answerable: false,
    answer: "",
    missing:
      "No passage in the advisory corpus covers this question well enough to " +
      "ground an answer, so this system returns no advisory rather than a guess.",
    citations: [],
    confidence: "low",
    escalate: true,
    grounded: true,
    retrieved: 0,
    query: question,
    gate: { ...GATE, decision: "refused", ...assessment },
    suggestion:
      "Contact your district Krishi Vigyan Kendra, or rephrase the question " +
      "naming the crop and the symptom you can see.",
  };
}

export async function answerGrounded(
  question: string,
  opts: { limit?: number } = {},
): Promise<GroundedAdvisory> {
  const limit = opts.limit ?? 5;
  const { assessment } = retrieveWithAssessment(question, { limit });

  if (!assessment.grounded) return refusal(question, assessment);

  const passages = retrieve(question, { limit });
  if (passages.length === 0) return refusal(question, assessment);

  const text = await callGemini({
    prompt: buildPrompt(question, passages),
    generationConfig: { temperature: 0.15, maxOutputTokens: 1200 },
  });

  let parsed: RawModelAnswer;
  try {
    parsed = parseGeminiJson<RawModelAnswer>(text);
  } catch {
    return {
      ...refusal(question, assessment),
      missing:
        "The advisory could not be generated in a verifiable form. No " +
        "ungrounded text is returned.",
    };
  }

  interface RawCitation {
    n?: unknown;
    passageId?: unknown;
  }

  const cited: AdvisoryCitation[] = ((parsed.citations as RawCitation[] | undefined) ?? [])
    .map((c): AdvisoryCitation | null => {
      const byId =
        typeof c.passageId === "string"
          ? passages.find((x) => x.passageId === c.passageId)
          : undefined;
      const idx = (typeof c.n === "number" ? c.n : 1) - 1;
      const p = byId ?? (idx >= 0 ? passages[idx] : undefined);
      if (!p) return null;
      return {
        n: typeof c.n === "number" ? c.n : undefined,
        passageId: p.passageId,
        docId: p.docId,
        docTitle: p.docTitle,
        heading: p.heading,
        text: p.text,
        score: p.score,
        matchedTerms: p.matchedTerms,
        source: p.source,
      };
    })
    .filter((c): c is AdvisoryCitation => c !== null);

  return {
    answerable: parsed.answerable !== false,
    answer: typeof parsed.answer === "string" ? parsed.answer : "",
    missing: typeof parsed.missing === "string" ? parsed.missing : "",
    confidence: typeof parsed.confidence === "string" ? parsed.confidence : "medium",
    escalate: parsed.escalate === true,
    citations: cited,
    grounded: true,
    retrieved: passages.length,
    query: question,
    gate: { ...GATE, decision: "answered", ...assessment },
    consideredPassages: passages.map((p) => ({
      passageId: p.passageId,
      docTitle: p.docTitle,
      heading: p.heading,
      score: p.score,
      matchedTerms: p.matchedTerms,
    })),
  };
}
