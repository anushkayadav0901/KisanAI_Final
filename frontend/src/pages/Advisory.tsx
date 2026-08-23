import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Search, FileText, Ban } from "lucide-react";
import { GroundedAdvisory } from "../components/advisory/GroundedAdvisory";
import { ExplainPanel, type ExplainResult } from "../components/advisory/ExplainPanel";
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

const SCENARIOS: Record<string, Record<string, string | number>> = {
  "Dry spell, wheat at tillering": {
    crop: "Wheat",
    cropStage: "tillering",
    soilMoisturePct: 18,
    rainForecastMm3d: 2,
    minTempC: 11,
    humidityPct: 86,
    zincStatus: "low",
  },
  "Heavy rain forecast": {
    crop: "Wheat",
    cropStage: "tillering",
    soilMoisturePct: 28,
    rainForecastMm3d: 32,
  },
  "Rice, planthopper after pyrethroid": {
    crop: "Rice",
    pest: "Brown planthopper",
    lastSprayClass: "pyrethroid",
    soilMoisturePct: 40,
    rainForecastMm3d: 8,
    cropStage: "panicle initiation",
  },
};

const Advisory: React.FC = () => {
  const [corpus, setCorpus] = React.useState<CorpusInfo | null>(null);
  const [scenario, setScenario] = React.useState<string>(Object.keys(SCENARIOS)[0]);
  const [explain, setExplain] = React.useState<ExplainResult | null>(null);

  React.useEffect(() => {
    fetch("/v1/knowledge")
      .then((r) => (r.ok ? r.json() : null))
      .then(setCorpus)
      .catch(() => setCorpus(null));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/v1/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ observations: SCENARIOS[scenario] }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && setExplain(d))
      .catch(() => !cancelled && setExplain(null));
    return () => {
      cancelled = true;
    };
  }, [scenario]);

  return (
    <div className="relative bg-white">
      {                                                                          }
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

      {                                                                          }
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

          {                  }
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

      {                                                                          }
      <section className="py-20">
        <div className="px-4 mx-auto max-w-4xl sm:px-6 lg:px-8">
          <div className="mb-8">
            <span className="text-xs font-semibold text-[#63A361] uppercase tracking-wider">
              Why an advisory fires
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#5B532C] mt-3 leading-tight">
              Every recommendation shows{" "}
              <span className="text-[#63A361]">its working</span>
            </h2>
            <p className="text-[#5B532C]/60 leading-relaxed mt-3 max-w-2xl">
              "Irrigate within 48 hours" is an instruction to be taken on trust. The
              measurements behind it, and the threshold each one crossed, are something a
              farmer can check against their own field — and disagree with when an input
              is wrong.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {Object.keys(SCENARIOS).map((k) => (
              <button
                key={k}
                onClick={() => setScenario(k)}
                className={`px-4 py-2 text-xs font-semibold rounded-full border transition-colors ${
                  scenario === k
                    ? "bg-[#63A361] text-white border-[#63A361]"
                    : "bg-white text-[#5B532C]/70 border-[#5B532C]/12 hover:border-[#63A361]/40"
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          {explain ? (
            <ExplainPanel result={explain} />
          ) : (
            <div className="h-40 rounded-2xl border border-dashed border-[#5B532C]/15 flex items-center justify-center">
              <p className="text-sm text-[#5B532C]/45">
                Loading the rule evaluation from /v1/explain…
              </p>
            </div>
          )}
        </div>
      </section>

      {                                                                          }
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
