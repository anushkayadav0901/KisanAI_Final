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
import {
  GitFork,
  BadgeCheck,
  Share2,
  Code2,
  Check,
  Copy,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  MODEL_REGISTRY,
  REGISTRY_TOTALS,
  inr,
  type ModelCard,
} from "../../data/surveillanceEngine";
import { STATE_BY_CODE } from "../../data/nationalGrid";

/** The artefact a state actually publishes and another state consumes. */
function toArtifact(m: ModelCard) {
  return {
    $schema: `https://kisan.ai/schema/${m.schema}.json`,
    id: m.id,
    version: m.version,
    title: m.title,
    publisher: { state: m.originState, code: m.originCode, authority: "State Department of Agriculture" },
    scope: { crop: m.crop, threat: m.threat },
    license: m.license,
    validation: { field_validations: m.validations, reported_accuracy_pct: m.accuracy },
    adoption: { subscribed_states: m.adoptedBy, forks: m.forks },
    interoperability: { profile: "agri-model/v1", transport: "HTTPS + JSON", auth: "none (open data)" },
  };
}

const ModelRow: React.FC<{ model: ModelCard; adopted: Set<string>; onAdopt: (id: string) => void }> = ({
  model,
  adopted,
  onAdopt,
}) => {
  const [showCard, setShowCard] = React.useState(false);
  const isAdopted = adopted.has(model.id);

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(toArtifact(model), null, 2));
      toast.success("Model card copied", { icon: "📋", duration: 2000 });
    } catch {
      toast.error("Clipboard unavailable in this browser");
    }
  };

  const adopt = () => {
    onAdopt(model.id);
    toast.success(`${model.title} v${model.version} adopted — advisory rules live in your state`, {
      icon: "🔗",
      duration: 3200,
    });
  };

  return (
    <motion.div
      layout
      className="rounded-xl border border-white/8 bg-white/[0.025] hover:bg-white/[0.045] transition-colors overflow-hidden"
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-[13px] font-bold text-white truncate">{model.title}</h4>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-px rounded bg-[#63A361]/18 text-[#A8D9A6]">
                v{model.version}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/50 line-clamp-2">
              {model.summary}
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 justify-end">
              <BadgeCheck className="w-3.5 h-3.5 text-[#7FE3BE]" />
              <span className="text-[15px] font-black text-white leading-none">
                {model.accuracy}%
              </span>
            </div>
            <div className="text-[9.5px] text-white/35 mt-1">
              {inr(model.validations)} field checks
            </div>
          </div>
        </div>

        {/* Provenance chain: who published it, who runs it now */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-[#FFC50F]/15 text-[#FFD95E]">
            {model.originCode} published
          </span>
          <ArrowRight className="w-3 h-3 text-white/25" />
          <div className="flex items-center gap-1 flex-wrap">
            {model.adoptedBy.map((code) => (
              <span
                key={code}
                title={STATE_BY_CODE[code]?.name ?? code}
                className="text-[10px] font-semibold px-1.5 py-1 rounded-md bg-white/8 text-white/65"
              >
                {code}
              </span>
            ))}
            {isAdopted && (
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[10px] font-bold px-1.5 py-1 rounded-md bg-[#63A361] text-[#0B1A14]"
              >
                YOU
              </motion.span>
            )}
          </div>
          <span className="text-[10px] text-white/30 ml-auto">
            <GitFork className="inline w-3 h-3 mr-0.5 -mt-px" />
            {model.forks} forks · {model.license}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={adopt}
            disabled={isAdopted}
            className={`flex items-center gap-1.5 text-[10.5px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
              isAdopted
                ? "bg-[#63A361]/25 text-[#A8D9A6] cursor-default"
                : "bg-[#63A361]/15 text-[#A8D9A6] hover:bg-[#63A361]/32"
            }`}
          >
            {isAdopted ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
            {isAdopted ? "Adopted" : "Adopt in my state"}
          </button>

          <button
            onClick={() => setShowCard((v) => !v)}
            className="flex items-center gap-1.5 text-[10.5px] font-semibold px-2.5 py-1.5 rounded-lg
                       bg-white/6 text-white/60 hover:bg-white/12 hover:text-white/85 transition-colors"
          >
            <Code2 className="w-3 h-3" />
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
            className="border-t border-white/8 bg-black/25"
          >
            <div className="relative p-3">
              <button
                onClick={copyCard}
                className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[9.5px] font-semibold
                           px-1.5 py-1 rounded-md bg-white/8 text-white/55 hover:bg-white/15 hover:text-white"
              >
                <Copy className="w-2.5 h-2.5" />
                Copy
              </button>
              <pre className="text-[10px] leading-relaxed text-[#A8D9A6]/80 overflow-x-auto font-mono">
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
    { label: "Published models", value: REGISTRY_TOTALS.models },
    { label: "State adoptions", value: REGISTRY_TOTALS.adoptions + adopted.size },
    { label: "Forks", value: REGISTRY_TOTALS.forks },
    { label: "Field validations", value: inr(REGISTRY_TOTALS.validations) },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#FFC50F]" />
              Cross-state model exchange
            </h3>
            <p className="text-[11px] text-white/45 mt-0.5">
              States publish advisory logic as versioned open data. Any state subscribes
              or forks — no integration project required.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-white/6 text-white/45">
            profile: agri-model/v1
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg bg-white/[0.03] px-2.5 py-2">
              <div className="text-[15px] font-black text-white leading-none">{s.value}</div>
              <div className="text-[9.5px] text-white/40 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 space-y-2.5 max-h-[520px] overflow-y-auto">
        {MODEL_REGISTRY.map((m) => (
          <ModelRow key={m.id} model={m} adopted={adopted} onAdopt={onAdopt} />
        ))}
      </div>
    </div>
  );
};
