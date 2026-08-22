/**
 * AlertFeed — the escalation queue an officer actually works from.
 *
 * Every row carries the rule that fired it. An alert with no stated trigger is
 * an alert nobody trusts, so the rule text is part of the row, not a tooltip.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, AlertTriangle, Send, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import {
  ALERTS,
  SEVERITY_META,
  compact,
  type OutbreakAlert,
} from "../../data/surveillanceEngine";

interface Props {
  filterState: string | null;
  onSelectState: (code: string) => void;
}

function timeAgo(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const AlertRow: React.FC<{
  alert: OutbreakAlert;
  onSelectState: (code: string) => void;
}> = ({ alert, onSelectState }) => {
  const meta = SEVERITY_META[alert.severity];

  const dispatch = () => {
    toast.success(
      `Advisory queued for ${compact(alert.farmersAtRisk)} farmers in ${alert.district}`,
      { icon: "📡", duration: 2600 },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -14 }}
      transition={{ duration: 0.28 }}
      className="group relative rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] transition-colors p-3"
    >
      <span
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
        style={{ background: meta.color }}
      />

      <div className="pl-2.5">
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => onSelectState(alert.stateCode)}
            className="text-left min-w-0 flex-1"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-white truncate">
                {alert.district}
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-px rounded bg-white/10 text-white/60 shrink-0">
                {alert.stateCode}
              </span>
            </div>
            <div className="text-[11px] mt-0.5 truncate" style={{ color: meta.text }}>
              {alert.threat}
              <span className="text-white/35"> · {alert.crop}</span>
            </div>
          </button>

          <div className="text-right shrink-0">
            <div className="text-[15px] font-black leading-none" style={{ color: meta.color }}>
              {alert.outbreakIndex}
            </div>
            <div className="text-[9.5px] text-white/35 mt-1">{timeAgo(alert.minutesAgo)} ago</div>
          </div>
        </div>

        <p className="mt-2 text-[10.5px] leading-relaxed text-white/45 line-clamp-2">
          <AlertTriangle className="inline w-3 h-3 mr-1 -mt-px" style={{ color: meta.color }} />
          {alert.trigger}
        </p>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-white/40">
            {compact(alert.farmersAtRisk)} farmers at risk
          </span>
          <button
            onClick={dispatch}
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md
                       bg-[#63A361]/15 text-[#A8D9A6] hover:bg-[#63A361]/30 transition-colors
                       opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <Send className="w-3 h-3" />
            Dispatch
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const AlertFeed: React.FC<Props> = ({ filterState, onSelectState }) => {
  // Reveal alerts progressively so the queue reads as a live feed rather than
  // a static list. Purely presentational — the underlying data is fixed.
  const [revealed, setRevealed] = React.useState(6);

  // Restart the reveal whenever the officer changes scope, so the queue is
  // rebuilt from scratch rather than reconciled against the previous state's
  // rows — mixing two states in one queue would be worse than a slow feed.
  React.useEffect(() => {
    setRevealed(6);
  }, [filterState]);

  React.useEffect(() => {
    if (revealed >= 14) return;
    const t = setTimeout(() => setRevealed((n) => n + 1), 2600);
    return () => clearTimeout(t);
  }, [revealed]);

  const visible = React.useMemo(() => {
    const pool = filterState
      ? ALERTS.filter((a) => a.stateCode === filterState)
      : ALERTS;
    return pool.slice(0, filterState ? 12 : revealed);
  }, [filterState, revealed]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-1 pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E4453A] opacity-70" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E4453A]" />
          </span>
          <h3 className="text-[13px] font-bold text-white tracking-tight">
            Escalation queue
          </h3>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-white/40">
          <Radio className="w-3 h-3" />
          {filterState ?? "National"}
        </span>
      </div>

      <div
        key={filterState ?? "national"}
        className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0"
      >
        <AnimatePresence initial={false}>
          {visible.map((a) => (
            <AlertRow key={a.id} alert={a} onSelectState={onSelectState} />
          ))}
        </AnimatePresence>

        {visible.length === 0 && (
          <div className="text-center py-10 text-[11px] text-white/35">
            No districts above the escalation threshold in this state.
          </div>
        )}
      </div>

      {!filterState && (
        <div className="pt-2 mt-1 border-t border-white/8 flex items-center justify-between">
          <span className="text-[10px] text-white/35">
            Showing {visible.length} of {ALERTS.length} open alerts
          </span>
          <ChevronRight className="w-3 h-3 text-white/25" />
        </div>
      )}
    </div>
  );
};
