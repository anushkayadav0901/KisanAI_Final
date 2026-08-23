import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  ChevronDown,
  Loader2,
  CornerDownLeft,
} from "lucide-react";

interface Citation {
  n: number;
  passageId: string;
  docTitle: string;
  heading: string;
  text: string;
  score: number;
  matchedTerms: string[];
  source: { publisher: string; status: string; verify_at: string };
}

interface Gate {
  decision: "answered" | "refused";
  reason?: string;
  topScore?: number;
  coverage?: number;
  minMatchedTerms: number;
  minCoverage: number;
  minTopScore: number;
}

interface AdvisoryResponse {
  answerable: boolean;
  answer: string;
  missing: string;
  confidence: "high" | "medium" | "low";
  escalate: boolean;
  citations: Citation[];
  retrieved: number;
  query: string;
  gate?: Gate;
  suggestion?: string;
  error?: string;
  message?: string;
}

const EXAMPLES = [
  "My wheat has yellow stripes on the leaves",
  "When should I irrigate wheat if I only have water for one irrigation",
  "How do I read organic carbon on my Soil Health Card",
  "Which brand of tractor should I buy",
];

function renderAnswer(answer: string) {
  const parts = answer.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (!m) return <span key={i}>{part}</span>;
    return (
      <sup
        key={i}
        className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 mx-0.5
                   text-[10px] font-bold text-[#4A8A4D] bg-[#63A361]/15 rounded-md align-super"
      >
        {m[1]}
      </sup>
    );
  });
}

const CitationCard: React.FC<{ c: Citation }> = ({ c }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="bg-white rounded-xl border border-[#5B532C]/10 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 p-3.5 text-left hover:bg-[#FDE7B3]/15 transition-colors"
      >
        <span className="w-6 h-6 rounded-md bg-[#63A361]/15 text-[#4A8A4D] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
          {c.n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-[#5B532C] truncate">
            {c.docTitle}
          </span>
          <span className="block text-xs text-[#5B532C]/50 mt-0.5">
            {c.heading} · matched on{" "}
            <span className="text-[#4A8A4D] font-medium">
              {c.matchedTerms.slice(0, 4).join(", ")}
            </span>
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#5B532C]/30 shrink-0 mt-1 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[#5B532C]/8 bg-[#FDFCF8]"
          >
            <div className="p-4">
              <p className="text-sm leading-relaxed text-[#5B532C]/75">{c.text}</p>
              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[11px] text-[#5B532C]/45">
                  {c.source.publisher} ·{" "}
                  <span
                    className={
                      c.source.status === "curated-draft"
                        ? "text-[#A57D00] font-semibold"
                        : "text-[#4A8A4D] font-semibold"
                    }
                  >
                    {c.source.status}
                  </span>{" "}
                  · passage {c.passageId}
                </span>
                <a
                  href={c.source.verify_at}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4A8A4D] hover:underline"
                >
                  Verify on official portals
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const GroundedAdvisory: React.FC = () => {
  const [question, setQuestion] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<AdvisoryResponse | null>(null);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || loading) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/v1/advisory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      setResult(await res.json());
    } catch (err) {
      setResult({
        answerable: false,
        answer: "",
        missing:
          err instanceof Error
            ? `Could not reach the advisory API: ${err.message}`
            : "Could not reach the advisory API.",
        confidence: "low",
        escalate: true,
        citations: [],
        retrieved: 0,
        query: text,
      });
    } finally {
      setLoading(false);
    }
  };

  const refused = result && !result.answerable;

  return (
    <div>
      {             }
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="relative"
      >
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5B532C]/30" />
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Describe what you can see on your crop…"
          className="w-full pl-14 pr-32 py-5 text-base bg-white rounded-2xl border border-[#5B532C]/12
                     shadow-lg shadow-[#5B532C]/5 outline-none focus:border-[#63A361]/50
                     text-[#5B532C] placeholder-[#5B532C]/35"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5
                     px-5 py-2.5 text-sm font-bold text-white bg-[#63A361] rounded-full
                     hover:bg-[#4a8a4d] disabled:opacity-40 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CornerDownLeft className="w-4 h-4" />
          )}
          Ask
        </button>
      </form>

      {              }
      <div className="flex flex-wrap gap-2 mt-4">
        {EXAMPLES.map((ex, i) => (
          <button
            key={ex}
            onClick={() => {
              setQuestion(ex);
              ask(ex);
            }}
            className={`px-3.5 py-2 text-xs font-medium rounded-full border transition-colors ${
              i === EXAMPLES.length - 1
                ? "border-[#FFC50F]/50 bg-[#FFC50F]/10 text-[#A57D00] hover:bg-[#FFC50F]/20"
                : "border-[#5B532C]/12 bg-white text-[#5B532C]/70 hover:border-[#63A361]/40 hover:bg-[#FDE7B3]/25"
            }`}
            title={
              i === EXAMPLES.length - 1
                ? "Outside the corpus — this one is refused on purpose"
                : undefined
            }
          >
            {ex}
            {i === EXAMPLES.length - 1 && " ↯"}
          </button>
        ))}
      </div>

      {            }
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.query + String(result.answerable)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6"
          >
            {refused ? (
              <div className="p-6 rounded-2xl bg-[#FFC50F]/8 border border-[#FFC50F]/30">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#FFC50F]/20 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-6 h-6 text-[#A57D00]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-[#5B532C]">
                      No sourced answer available
                    </h3>
                    <p className="text-sm text-[#5B532C]/65 leading-relaxed mt-1.5">
                      {result.missing || result.message}
                    </p>
                    {result.suggestion && (
                      <p className="text-sm text-[#5B532C]/55 leading-relaxed mt-2">
                        {result.suggestion}
                      </p>
                    )}

                    {result.gate && (
                      <div className="mt-4 p-3.5 rounded-xl bg-white/70 border border-[#5B532C]/10">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#5B532C]/45 mb-1.5">
                          Why it was refused
                        </div>
                        <p className="text-xs text-[#5B532C]/70 leading-relaxed">
                          {result.gate.reason}
                        </p>
                        <p className="text-[11px] text-[#5B532C]/40 mt-2">
                          Thresholds: ≥{result.gate.minMatchedTerms} matched terms, ≥
                          {Math.round(result.gate.minCoverage * 100)}% question coverage, ≥
                          {result.gate.minTopScore} retrieval score. No model was called.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="p-6 bg-white rounded-2xl border border-[#5B532C]/10 shadow-lg shadow-[#5B532C]/5">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#63A361]/12 text-[#4A8A4D] text-xs font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Grounded in {result.citations.length}{" "}
                      {result.citations.length === 1 ? "source" : "sources"}
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-[#FDE7B3]/40 text-[#5B532C]/60 text-xs font-semibold capitalize">
                      {result.confidence} confidence
                    </span>
                    {result.escalate && (
                      <span className="px-3 py-1.5 rounded-full bg-[#EF8A3C]/12 text-[#C2661F] text-xs font-semibold">
                        Confirm with your KVK
                      </span>
                    )}
                  </div>

                  <div className="text-[15px] leading-[1.75] text-[#5B532C] whitespace-pre-wrap">
                    {renderAnswer(result.answer)}
                  </div>
                </div>

                {result.citations.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-4 h-4 text-[#63A361]" />
                      <h4 className="text-sm font-bold text-[#5B532C]">
                        Sources this answer came from
                      </h4>
                      <span className="text-xs text-[#5B532C]/40">
                        — click any to read the exact passage
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {result.citations.map((c) => (
                        <CitationCard key={c.passageId} c={c} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
