/**
 * Advisory — the grounded question-answering page
 *
 * Every other AI surface in this app sends a prompt and renders whatever comes
 * back. This one retrieves first, answers only from what it retrieved, and
 * shows the farmer the passages behind the answer. When the corpus cannot
 * support an answer it declines to give one.
 */

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Search, FileText, Ban } from "lucide-react";
import { GroundedAdvisory } from "../components/advisory/GroundedAdvisory";
import Footer from "../components/Footer";

interface CorpusInfo {
  documents: number;
  passages: number;
  crops: string[];
  retrieval: string;
  provenance: string;
}

const HOW_IT_WORKS = [
  {
    icon: Search,
    title: "Retrieve first",
    body: "The question is searched against the advisory corpus with BM25. Which passages matched, and on which words, is recorded and shown.",
  },
  {
    icon: Ban,
    title: "Refuse when unsupported",
    body: "If retrieval is too weak, no model is called at all. The system returns no advisory and says why, rather than producing a confident guess.",
  },
  {
    icon: FileText,
    title: "Answer only from sources",
    body: "When grounding succeeds, the model may use only the retrieved passages, and every claim carries an inline citation you can open and read.",
  },
];

const Advisory: React.FC = () => {
  const [corpus, setCorpus] = React.useState<CorpusInfo | null>(null);

  React.useEffect(() => {
    fetch("/v1/knowledge")
      .then((r) => (r.ok ? r.json() : null))
      .then(setCorpus)
      .catch(() => setCorpus(null));
  }, []);

  return (
    <div className="relative bg-white">
      {/* ── Hero + ask ────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage: "radial-gradient(circle, #5B532C 1.2px, transparent 1.2px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="absolute top-10 right-1/4 w-96 h-96 bg-[#63A361]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative px-4 mx-auto max-w-4xl sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#63A361] uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              Every answer shows its source
            </span>

            <h1 className="text-4xl sm:text-5xl font-bold text-[#5B532C] leading-[1.12] mt-4 mb-5">
              Advice you can{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-[#63A361] px-2">check</span>
                <span className="absolute inset-0 bg-[#FDE7B3]/50 rounded-lg -rotate-1" />
              </span>
            </h1>

            <p className="text-base text-[#5B532C]/60 leading-relaxed mb-8 max-w-2xl">
              Ask about a crop problem and get an answer built only from documents in
              the advisory corpus — with the exact passages it came from. If the corpus
              cannot support an answer, this system tells you so instead of guessing.
            </p>

            <GroundedAdvisory />
          </motion.div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#FDFCF8] border-y border-[#5B532C]/10">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 items-end mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-xs font-semibold text-[#63A361] uppercase tracking-wider">
                How it works
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#5B532C] mt-3 leading-tight">
                Retrieval first, <span className="text-[#63A361]">generation second</span>
              </h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-[#5B532C]/60 leading-relaxed lg:text-right"
            >
              A wrong crop advisory costs a farmer a season. So the architecture is
              built to fail loudly rather than answer confidently from nothing.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-6 bg-white rounded-2xl border border-[#5B532C]/10"
              >
                <div className="w-12 h-12 rounded-xl bg-[#63A361]/10 flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-[#63A361]" />
                </div>
                <h3 className="text-base font-bold text-[#5B532C] mb-2">{step.title}</h3>
                <p className="text-sm text-[#5B532C]/60 leading-relaxed">{step.body}</p>
              </motion.div>
            ))}
          </div>

          {/* Corpus stats */}
          {corpus && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-10 mt-12 border-y border-[#5B532C]/10">
              {[
                { value: String(corpus.documents), label: "Documents", sub: "in the corpus" },
                { value: String(corpus.passages), label: "Passages", sub: "individually retrievable" },
                { value: String(corpus.crops.length), label: "Crops covered", sub: corpus.crops.slice(0, 3).join(", ") },
                { value: "BM25", label: "Retrieval", sub: "deterministic, explainable" },
              ].map((s) => (
                <div key={s.label} className="text-center lg:text-left">
                  <div className="text-4xl font-bold text-[#5B532C] mb-1">{s.value}</div>
                  <div className="text-sm font-medium text-[#5B532C]">{s.label}</div>
                  <div className="text-xs text-[#5B532C]/50 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Provenance ────────────────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#FDE7B3]/25 border border-[#5B532C]/10">
            <div className="w-10 h-10 rounded-xl bg-[#FFC50F]/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-[#A57D00]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#5B532C] mb-1">
                About the corpus
              </h4>
              <p className="text-sm text-[#5B532C]/60 leading-relaxed">
                {corpus?.provenance ??
                  "Curated draft corpus written for this project. Not extracted from ICAR, KVK or state agricultural university publications."}{" "}
                Every citation carries a link to verify the guidance against official
                portals. Replacing this seed corpus with genuine package-of-practices
                documents changes only the corpus — the retrieval, the citation
                requirement and the refusal behaviour stay exactly as they are.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Advisory;
