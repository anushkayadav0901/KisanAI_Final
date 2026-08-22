/**
 * ModelExchange — the cross-state advisory model registry.
 *
 * This is the part that makes the platform a network instead of an app. A
 * state publishes what it has learned — thresholds, spray windows, staged
 * response ladders — as a versioned, licensed JSON artefact. Any other state
 * subscribes to it or forks it and adapts the local parameters.
 *
 * The advisory logic travels between states as data. No integration project,
 * no code sharing, no vendor in between.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitFork, BadgeCheck, Share2, Code2, Check, Copy, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { MODEL_REGISTRY, REGISTRY_TOTALS, inr, type ModelCard } from "../../data/surveillanceEngine";
import { STATE_BY_CODE } from "../../data/nationalGrid";

/** The artefact a state actually publishes and another state consumes. */
function toArtifact(m: ModelCard) {
  return {
    $schema: `https://kisan.ai/schema/${m.schema}.json`,
    id: m.id,
    version: m.version,
    title: m.title,
    publisher: {
      state: m.originState,
      code: m.originCode,
      authority: "State Department of Agriculture",
    },
    scope: { crop: m.crop, threat: m.threat },
    license: m.license,
    validation: { field_validations: m.validations, reported_accuracy_pct: m.accuracy },
    adoption: { subscribed_states: m.adoptedBy, forks: m.forks },
    interoperability: {
      profile: "agri-model/v1",
      transport: "HTTPS + JSON",
      auth: "none (open data)",
    },
  };
}

const ModelRow: React.FC<{
  model: ModelCard;
  adopted: Set<string>;
  onAdopt: (id: string) => void;
}> = ({ model, adopted, onAdopt }) => {
  const [showCard, setShowCard] = React.useState(false);
  const isAdopted = adopted.has(model.id);

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(toArtifact(model), null, 2));
      toast.success("Model card copied", { duration: 2000 });
    } catch {
      toast.error("Clipboard unavailable in this browser");
    }
  };

  const adopt = () => {
    onAdopt(model.id);
    toast.success(`${model.title} v${model.version} adopted — rules live in your state`, {
      duration: 3200,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl border border-[#5B532C]/10 hover:shadow-xl hover:shadow-[#5B532C]/5 transition-all duration-300 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-bold text-[#5B532C]">{model.title}</h4>
              <span className="px-2 py-0.5 text-xs font-bold text-[#4A8A4D] bg-[#63A361]/10 rounded-full">
                v{model.version}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#5B532C]/60">{model.summary}</p>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-1.5 justify-end">
              <BadgeCheck className="w-4 h-4 text-[#63A361]" />
              <span className="text-2xl font-bold text-[#5B532C] leading-none">
                {model.accuracy}%
              </span>
            </div>
            <div className="text-xs text-[#5B532C]/45 mt-1.5">
              {inr(model.validations)} field checks
            </div>
          </div>
        </div>

        {/* Provenance chain: who published it, who runs it now */}
        <div className="mt-4 flex items-center gap-2.5 flex-wrap">
          <span className="px-3 py-1.5 text-xs font-bold text-[#5B532C] bg-[#FFC50F]/20 rounded-full">
            {model.originCode} published
          </span>
          <ArrowRight className="w-4 h-4 text-[#5B532C]/25" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {model.adoptedBy.map((code) => (
              <span
                key={code}
                title={STATE_BY_CODE[code]?.name ?? code}
                className="px-2.5 py-1.5 text-xs font-semibold text-[#5B532C]/70 bg-[#FDE7B3]/50 rounded-full"
              >
                {code}
              </span>
            ))}
            {isAdopted && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="px-2.5 py-1.5 text-xs font-bold text-white bg-[#63A361] rounded-full"
              >
                YOU
              </motion.span>
            )}
          </div>
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-[#5B532C]/45">
            <GitFork className="w-3.5 h-3.5" />
            {model.forks} forks · {model.license}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <button
            onClick={adopt}
            disabled={isAdopted}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-full transition-colors ${
              isAdopted
                ? "text-[#4A8A4D] bg-[#63A361]/15 cursor-default"
                : "text-white bg-[#63A361] hover:bg-[#4a8a4d]"
            }`}
          >
            {isAdopted ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            {isAdopted ? "Adopted" : "Adopt in my state"}
          </button>

          <button
            onClick={() => setShowCard((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#5B532C]
                       bg-white border-2 border-[#5B532C]/15 rounded-full hover:border-[#63A361]/40
                       hover:bg-[#FDE7B3]/30 transition-colors"
          >
            <Code2 className="w-3.5 h-3.5" />
            {showCard ? "Hide card" : "View model card"}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showCard && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="border-t border-[#5B532C]/10 bg-[#FDFCF8]"
          >
            <div className="relative p-5">
              <button
                onClick={copyCard}
                className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-1.5
                           text-xs font-semibold text-[#5B532C]/60 bg-white border border-[#5B532C]/15
                           rounded-full hover:text-[#5B532C] hover:border-[#63A361]/40 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
              <pre className="text-xs leading-relaxed text-[#5B532C]/75 overflow-x-auto font-mono">
                {JSON.stringify(toArtifact(model), null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const ModelExchange: React.FC = () => {
  const [adopted, setAdopted] = React.useState<Set<string>>(new Set());

  const onAdopt = React.useCallback((id: string) => {
    setAdopted((prev) => new Set(prev).add(id));
  }, []);

  const stats = [
    { value: String(REGISTRY_TOTALS.models), label: "Published models", sublabel: "across 6 states" },
    {
      value: String(REGISTRY_TOTALS.adoptions + adopted.size),
      label: "State adoptions",
      sublabel: "live in production",
    },
    { value: String(REGISTRY_TOTALS.forks), label: "Forks", sublabel: "locally adapted" },
    {
      value: inr(REGISTRY_TOTALS.validations),
      label: "Field validations",
      sublabel: "farmer-confirmed outcomes",
    },
  ];

  return (
    <section>
      {/* Section header — matches the site's eyebrow + headline pattern */}
      <div className="grid lg:grid-cols-2 gap-8 items-end mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-xs font-semibold text-[#63A361] uppercase tracking-wider">
            The Network Layer
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#5B532C] mt-3 leading-tight">
            States share <span className="text-[#63A361]">working models</span>, not documents
          </h2>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-[#5B532C]/60 leading-relaxed lg:text-right"
        >
          A state publishes its advisory logic — pest thresholds, spray windows, response
          ladders — as versioned open data. Any other state subscribes or forks it and
          adapts the local parameters. No integration project required.
        </motion.p>
      </div>

      {/* Registry stats — horizontal rule row, same as the About section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-10 border-y border-[#5B532C]/10 mb-10"
      >
        {stats.map((s) => (
          <div key={s.label} className="text-center lg:text-left">
            <div className="text-4xl font-bold text-[#5B532C] mb-1">{s.value}</div>
            <div className="text-sm font-medium text-[#5B532C]">{s.label}</div>
            <div className="text-xs text-[#5B532C]/50 mt-0.5">{s.sublabel}</div>
          </div>
        ))}
      </motion.div>

      <div className="grid md:grid-cols-2 gap-5">
        {MODEL_REGISTRY.map((m) => (
          <ModelRow key={m.id} model={m} adopted={adopted} onAdopt={onAdopt} />
        ))}
      </div>
    </section>
  );
};
