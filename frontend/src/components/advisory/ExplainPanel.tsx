import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  ChevronDown,
  Droplets,
  Bug,
  FlaskConical,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

interface Advisory {
  id: string;
  title: string;
  urgency: "high" | "medium" | "low";
  inputs: Array<{ label: string; value: string; threshold: string; met: boolean }>;
  rule: string;
  because: string;
  chain: string[];
}

interface Skipped {
  id: string;
  title: string;
  missingInputs: string[];
  reason: string;
}

export interface ExplainResult {
  method: string;
  advisories: Advisory[];
  notEvaluated: Skipped[];
  summary: { rulesTotal: number; rulesFired: number; rulesSkipped: number };
}

const URGENCY = {
  high: { label: "Act now", color: "#B3332E", soft: "rgba(214,69,69,0.1)" },
  medium: { label: "This week", color: "#A57D00", soft: "rgba(255,197,15,0.15)" },
  low: { label: "No action", color: "#4A8A4D", soft: "rgba(99,163,97,0.12)" },
};

function iconFor(id: string) {
  if (id.startsWith("irrigate")) return Droplets;
  if (id.startsWith("pest") || id.startsWith("disease")) return Bug;
  if (id.startsWith("nutrient")) return FlaskConical;
  return GitBranch;
}

const AdvisoryCard: React.FC<{ advisory: Advisory }> = ({ advisory }) => {
  const [open, setOpen] = React.useState(advisory.urgency === "high");
  const u = URGENCY[advisory.urgency];
  const Icon = iconFor(advisory.id);

  return (
    <div className="bg-white rounded-2xl border border-[#5B532C]/10 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-4 p-5 text-left hover:bg-[#FDE7B3]/12 transition-colors"
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: u.soft }}
        >
          {/* eslint-disable-next-line react-hooks/static-components --
              iconFor returns one of four module-level lucide components, so the
              identity is stable; the rule cannot prove that. */}
          <Icon className="w-5 h-5" style={{ color: u.color }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-[#5B532C]">{advisory.title}</h3>
            <span
              className="px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ background: u.soft, color: u.color }}
            >
              {u.label}
            </span>
          </div>
          <p className="text-sm text-[#5B532C]/60 mt-1.5 leading-relaxed">
            {advisory.because}
          </p>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-[#5B532C]/30 shrink-0 mt-3 transition-transform ${open ? "rotate-180" : ""}`}
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
            <div className="p-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#5B532C]/45 mb-3">
                What was measured
              </div>

              {                                                    }
              <div className="space-y-2">
                {advisory.inputs.map((inp) => (
                  <div
                    key={inp.label}
                    className="flex items-center gap-3 px-3.5 py-2.5 bg-white rounded-xl border border-[#5B532C]/8"
                  >
                    <span className="text-sm text-[#5B532C]/60 min-w-[140px]">
                      {inp.label}
                    </span>
                    <span className="text-sm font-bold text-[#5B532C]">{inp.value}</span>
                    <span className="text-xs text-[#5B532C]/40 ml-auto">
                      threshold: {inp.threshold}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: inp.met ? "#63A361" : "#5B532C33" }}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2.5 mt-4 px-3.5 py-3 rounded-xl bg-[#63A361]/8">
                <ArrowRight className="w-4 h-4 text-[#4A8A4D] shrink-0 mt-0.5" />
                <p className="text-sm text-[#5B532C]/75 leading-relaxed">
                  {advisory.rule}
                </p>
              </div>

              <p className="text-[11px] text-[#5B532C]/35 mt-3 font-mono">
                rule id: {advisory.id}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ExplainPanel: React.FC<{ result: ExplainResult }> = ({ result }) => (
  <div>
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#63A361]/12 text-[#4A8A4D] text-xs font-bold">
        <GitBranch className="w-3.5 h-3.5" />
        {result.summary.rulesFired} of {result.summary.rulesTotal} rules fired
      </span>
      <span className="text-xs text-[#5B532C]/45">{result.method}</span>
    </div>

    <div className="space-y-3">
      {result.advisories.map((a) => (
        <AdvisoryCard key={a.id} advisory={a} />
      ))}

      {result.advisories.length === 0 && (
        <div className="p-6 rounded-2xl border border-dashed border-[#5B532C]/15 text-center">
          <p className="text-sm text-[#5B532C]/50">
            No rule fired on these observations. That is a result, not a failure — it
            means nothing in the rule set calls for action right now.
          </p>
        </div>
      )}
    </div>

    {result.notEvaluated.length > 0 && (
      <div className="mt-5 p-4 rounded-2xl bg-[#FDE7B3]/25 border border-[#5B532C]/10">
        <div className="flex items-center gap-2 mb-2.5">
          <HelpCircle className="w-4 h-4 text-[#A57D00]" />
          <h4 className="text-sm font-bold text-[#5B532C]">
            Not checked ({result.notEvaluated.length})
          </h4>
        </div>
        <ul className="space-y-1.5">
          {result.notEvaluated.map((s) => (
            <li key={s.id} className="text-xs text-[#5B532C]/60">
              <span className="font-semibold text-[#5B532C]/75">{s.title}</span>
              {" — "}
              {s.reason}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);
