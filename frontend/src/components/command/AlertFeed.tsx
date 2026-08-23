/**
 * AlertFeed — the escalation queue an officer actually works from.
 *
 * Every row carries the rule that fired it. An alert with no stated trigger is
 * an alert nobody trusts, so the rule text is part of the row, not a tooltip.
 */

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Send } from "lucide-react";
import toast from "react-hot-toast";
import {
  SEVERITY_META,
  compact,
  type OutbreakAlert,
} from "../../data/surveillance";

interface Props {
  alerts: OutbreakAlert[];
  loading: boolean;
  filterState: string | null;
  onSelectState: (code: string) => void;
}

function timeAgo(min: number): string {
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const AlertRow: React.FC<{
  alert: OutbreakAlert;
  onSelectState: (code: string) => void;
}> = ({ alert, onSelectState }) => {
  const meta = SEVERITY_META[alert.severity];

  const dispatch = () => {
    toast(
      `Demo — in deployment this queues the advisory for ${compact(alert.farmersAtRisk)} farmers in ${alert.district}`,
      { duration: 3200, icon: "📡" },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group p-4 bg-white rounded-2xl border border-[#5B532C]/10 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: meta.soft }}
        >
          <AlertTriangle className="w-5 h-5" style={{ color: meta.text }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button
              onClick={() => onSelectState(alert.stateCode)}
              className="text-left min-w-0"
            >
              <h4 className="text-sm font-bold text-[#5B532C] truncate hover:text-[#63A361] transition-colors">
                {alert.district}
                <span className="ml-1.5 text-xs font-medium text-[#5B532C]/40">
                  {alert.stateCode}
                </span>
              </h4>
              <p className="text-xs mt-0.5 truncate font-medium" style={{ color: meta.text }}>
                {alert.threat}
                <span className="text-[#5B532C]/40 font-normal"> · {alert.crop}</span>
              </p>
            </button>

            <div className="text-right flex-shrink-0">
              <div className="text-lg font-bold leading-none" style={{ color: meta.text }}>
                {alert.outbreakIndex}
              </div>
              <div className="text-[11px] text-[#5B532C]/40 mt-1">
                {timeAgo(alert.minutesAgo)}
              </div>
            </div>
          </div>

          <p className="mt-2 text-xs leading-relaxed text-[#5B532C]/55">{alert.trigger}</p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs text-[#5B532C]/50">
              <span className="font-semibold text-[#5B532C]/70">
                {compact(alert.farmersAtRisk)}
              </span>{" "}
              farmers at risk
            </span>
            <button
              onClick={dispatch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white
                         bg-[#63A361] rounded-full hover:bg-[#4a8a4d] transition-colors"
            >
              <Send className="w-3 h-3" />
              Dispatch
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const AlertFeed: React.FC<Props> = ({
  alerts,
  loading,
  filterState,
  onSelectState,
}) => {
  const [revealed, setRevealed] = React.useState(5);

  // Restart the reveal whenever the officer changes scope, so the queue is
  // rebuilt from scratch rather than reconciled against the previous state's
  // rows — mixing two states in one queue would be worse than a slow feed.
  React.useEffect(() => {
    setRevealed(5);
  }, [filterState]);

  React.useEffect(() => {
    if (revealed >= 12) return;
    const t = setTimeout(() => setRevealed((n) => n + 1), 2600);
    return () => clearTimeout(t);
  }, [revealed]);

  // The API already scopes the queue to the requested state; the client only
  // paces how many rows appear, so a national feed reads as live.
  const visible = React.useMemo(
    () => alerts.slice(0, filterState ? 10 : revealed),
    [alerts, filterState, revealed],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-semibold text-[#63A361] uppercase tracking-wider">
            Needs Action
          </span>
          <h3 className="text-lg font-bold text-[#5B532C] mt-1">Escalation queue</h3>
        </div>
        <span className="px-3 py-1.5 text-xs font-bold text-[#5B532C]/70 bg-[#FDE7B3]/40 rounded-full">
          {filterState ?? "All India"}
        </span>
      </div>

      <div
        key={filterState ?? "national"}
        className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1"
      >
        {!loading &&
          visible.map((a) => (
            <AlertRow key={a.id} alert={a} onSelectState={onSelectState} />
          ))}

        {loading && (
          <div className="space-y-3" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 bg-white rounded-2xl border border-[#5B532C]/10 animate-pulse"
              >
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FDE7B3]/60 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded bg-[#FDE7B3]/60" />
                    <div className="h-2.5 w-1/3 rounded bg-[#FDE7B3]/40" />
                    <div className="h-2.5 w-full rounded bg-[#FDE7B3]/30" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-xl bg-[#63A361]/10 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-[#63A361]" />
            </div>
            <p className="text-sm text-[#5B532C]/50">
              No districts above the escalation threshold in this state.
            </p>
          </div>
        )}
      </div>

      {!filterState && !loading && (
        <p className="pt-3 mt-3 border-t border-[#5B532C]/10 text-xs text-[#5B532C]/40">
          Showing {visible.length} of {alerts.length} open alerts nationally
        </p>
      )}
    </div>
  );
};
