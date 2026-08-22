/**
 * lib/groundedAdvisory.js — retrieval-grounded advisory generation
 *
 * The contract this module enforces: the model may only use the passages it is
 * given, and every claim it makes must name the passage it came from. If
 * retrieval returns nothing above threshold, no model call is made at all and
 * the caller gets an explicit refusal.
 *
 * That refusal path is the whole point. A crop advisory system that invents a
 * plausible answer when it does not know is worse than one that says so — a
 * farmer can act on "I don't have a source for this, ask your KVK", but they
 * cannot recover from spraying the wrong chemical on a confident guess.
 */

import { BM25Index, chunkDocument, assessGrounding, GATE } from "./retrieval.js";
import { CORPUS } from "../data/knowledge/corpus.js";
import { callGemini, parseGeminiJson } from "./gemini.js";

// ── Index construction ────────────────────────────────────────────────────────
// Built once at module load. The corpus is small enough that rebuilding costs
// nothing; when real documents are ingested this becomes a startup step.

const PASSAGES = CORPUS.flatMap((doc) => chunkDocument(doc));
const INDEX = new BM25Index(PASSAGES);

export const CORPUS_STATS = {
  documents: CORPUS.length,
  passages: PASSAGES.length,
  crops: [...new Set(CORPUS.map((d) => d.crop))],
  topics: [...new Set(CORPUS.map((d) => d.topic))],
  /** Honest about what this corpus is. Surfaced through the API. */
  provenance:
    "Curated draft corpus written for this project. Not extracted from ICAR, " +
    "KVK or state agricultural university publications. Each document carries " +
    "a verification link to official portals.",
};

const DOC_BY_ID = Object.fromEntries(CORPUS.map((d) => [d.id, d]));

// ── Retrieval ─────────────────────────────────────────────────────────────────

/** Minimum BM25 score for a passage to be considered relevant at all. */
const RELEVANCE_FLOOR = 2.0;

/** Raw hits plus the gate decision, for callers that need both. */
export function retrieveWithAssessment(query, { limit = 5 } = {}) {
  const hits = INDEX.search(query, { limit, minScore: RELEVANCE_FLOOR });
  return { hits, assessment: assessGrounding(hits) };
}

export function retrieve(query, { limit = 5 } = {}) {
  const hits = INDEX.search(query, { limit, minScore: RELEVANCE_FLOOR });

  return hits.map((hit) => {
    const doc = DOC_BY_ID[hit.passage.docId];
    return {
      passageId: hit.passage.id,
      docId: hit.passage.docId,
      docTitle: hit.passage.meta.docTitle,
      heading: hit.passage.meta.heading,
      crop: hit.passage.meta.crop,
      topic: hit.passage.meta.topic,
      text: hit.passage.text,
      score: Number(hit.score.toFixed(3)),
      coverage: Number(hit.coverage.toFixed(2)),
      matchedTerms: hit.matchedTerms,
      source: doc.source,
    };
  });
}

// ── Grounded generation ───────────────────────────────────────────────────────

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

function buildPrompt(question, passages) {
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

/** Returned when retrieval is too weak to ground an answer. No model call is made. */
function refusal(question, assessment) {
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
    // The gate is shown, not hidden: a refusal a consumer cannot inspect is
    // indistinguishable from a failure.
    gate: { ...GATE, decision: "refused", ...assessment },
    suggestion:
      "Contact your district Krishi Vigyan Kendra, or rephrase the question " +
      "naming the crop and the symptom you can see.",
  };
}

/**
 * Answers a question strictly from the corpus.
 *
 * @param {string} question
 * @param {{limit?: number}} [opts]
 */
export async function answerGrounded(question, opts = {}) {
  const limit = opts.limit ?? 5;
  const { assessment } = retrieveWithAssessment(question, { limit });

  // Insufficient grounding: refuse before spending a model call. This is the
  // load-bearing branch of the whole module.
  if (!assessment.grounded) return refusal(question, assessment);

  const passages = retrieve(question, { limit });
  if (passages.length === 0) return refusal(question, assessment);

  const text = await callGemini({
    prompt: buildPrompt(question, passages),
    generationConfig: { temperature: 0.15, maxOutputTokens: 1200 },
  });

  let parsed;
  try {
    parsed = parseGeminiJson(text);
  } catch {
    // A malformed model response is treated as a failure to ground, not as an
    // opportunity to pass raw text through as if it were an advisory.
    return {
      ...refusal(question, assessment),
      missing:
        "The advisory could not be generated in a verifiable form. No " +
        "ungrounded text is returned.",
    };
  }

  // Attach the full passage behind each citation so the client can show the
  // farmer exactly what the advisory was built from.
  const cited = (parsed.citations ?? [])
    .map((c) => {
      const p = passages.find((x) => x.passageId === c.passageId) ?? passages[(c.n ?? 1) - 1];
      if (!p) return null;
      return {
        n: c.n,
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
    .filter(Boolean);

  return {
    answerable: parsed.answerable !== false,
    answer: parsed.answer ?? "",
    missing: parsed.missing ?? "",
    confidence: parsed.confidence ?? "medium",
    escalate: parsed.escalate === true,
    citations: cited,
    grounded: true,
    retrieved: passages.length,
    query: question,
    gate: { ...GATE, decision: "answered", ...assessment },
    /** Everything retrieval considered, whether the model cited it or not. */
    consideredPassages: passages.map((p) => ({
      passageId: p.passageId,
      docTitle: p.docTitle,
      heading: p.heading,
      score: p.score,
      matchedTerms: p.matchedTerms,
    })),
  };
}
