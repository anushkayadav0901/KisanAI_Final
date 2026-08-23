import React from "react";
import { motion } from "framer-motion";
import {
  SEVERITY_META,
  METRIC_META,
  severityOf,
  type MetricKey,
  type StateSignal,
} from "../../data/surveillance";

const R = 30;
const HEX_W = Math.sqrt(3) * R;
const ROW_H = 1.5 * R;
const PAD_X = 34;
const PAD_Y = 30;

const hexCenter = (col: number, row: number) => ({
  cx: PAD_X + col * HEX_W + (row % 2) * (HEX_W / 2),
  cy: PAD_Y + row * ROW_H,
});

function hexPath(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

interface Props {
  states: StateSignal[];
  metric: MetricKey;
  selected: string | null;
  onSelect: (code: string | null) => void;
}

export const HexIndiaMap: React.FC<Props> = ({
  states,
  metric,
  selected,
  onSelect,
}) => {
  const [hovered, setHovered] = React.useState<StateSignal | null>(null);

  const { vbW, vbH } = React.useMemo(() => {
    const maxCol = states.reduce((m, s) => Math.max(m, s.grid.col), 0);
    const maxRow = states.reduce((m, s) => Math.max(m, s.grid.row), 0);
    return {
      vbW: PAD_X * 2 + (maxCol + 1) * HEX_W + HEX_W / 2,
      vbH: PAD_Y * 2 + maxRow * ROW_H + R,
    };
  }, [states]);

  return (
    <div>
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="w-full h-auto select-none"
        role="group"
        aria-label="Indian states by agricultural signal. Use Tab to move between states and Enter to open one."
      >
        {states.map((signal, i) => {
          const { cx, cy } = hexCenter(signal.grid.col, signal.grid.row);
          const value = signal.metrics[metric];
          const meta = SEVERITY_META[severityOf(value)];
          const isSelected = selected === signal.code;
          const isDimmed = selected !== null && !isSelected;
          const isCritical = value >= 60;

          const toggle = () => onSelect(isSelected ? null : signal.code);

          return (
            <motion.g
              key={signal.code}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: isDimmed ? 0.28 : 1, scale: 1 }}
              transition={{ delay: i * 0.012, duration: 0.35, ease: "easeOut" }}
              style={{ cursor: "pointer", transformOrigin: `${cx}px ${cy}px` }}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              aria-label={`${signal.name}. ${METRIC_META[metric].label} ${value}. ${signal.districtsMonitored} districts, ${signal.districtsAtRisk} above threshold. Dominant threat ${signal.topThreat}.`}
              onClick={toggle}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle();
                }
              }}
              onFocus={() => setHovered(signal)}
              onBlur={() => setHovered(null)}
              onMouseEnter={() => setHovered(signal)}
              onMouseLeave={() => setHovered(null)}
            >
              {                                                        }
              {isCritical && !isDimmed && (
                <motion.path
                  d={hexPath(cx, cy, R - 1)}
                  fill="none"
                  stroke={meta.color}
                  strokeWidth={2}
                  initial={{ opacity: 0.5, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.42 }}
                  transition={{
                    duration: 2.6,
                    repeat: Infinity,
                    delay: (i % 5) * 0.5,
                    ease: "easeOut",
                  }}
                  style={{ transformOrigin: `${cx}px ${cy}px`, pointerEvents: "none" }}
                />
              )}

              <path
                d={hexPath(cx, cy, R - 2.5)}
                fill={meta.color}
                fillOpacity={isSelected ? 1 : 0.2 + (value / 100) * 0.68}
                stroke={isSelected ? "#5B532C" : meta.color}
                strokeWidth={isSelected ? 2.5 : 1.2}
                strokeOpacity={isSelected ? 0.85 : 0.55}
              />

              <text
                x={cx}
                y={cy - 1}
                textAnchor="middle"
                className="pointer-events-none"
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  fill: value >= 50 ? "#FFFFFF" : "#5B532C",
                }}
              >
                {signal.code}
              </text>
              <text
                x={cx}
                y={cy + 11.5}
                textAnchor="middle"
                className="pointer-events-none"
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  fill: value >= 50 ? "rgba(255,255,255,0.85)" : "rgba(91,83,44,0.55)",
                }}
              >
                {value}
              </text>
            </motion.g>
          );
        })}
      </svg>

      {                                                                    }
      <div className="mt-2 h-[52px] flex items-center">
        {hovered ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
              style={{
                background: SEVERITY_META[hovered.severity].soft,
                color: SEVERITY_META[hovered.severity].text,
              }}
            >
              {hovered.code}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#5B532C] truncate">
                {hovered.name}
                <span className="ml-2 text-xs font-medium text-[#5B532C]/45">
                  {hovered.zone}
                </span>
              </div>
              <div className="text-xs text-[#5B532C]/55 truncate">
                {METRIC_META[metric].label} {hovered.metrics[metric]} ·{" "}
                {hovered.districtsMonitored} districts · {hovered.topThreat}
              </div>
            </div>
          </motion.div>
        ) : (
          <span className="text-xs text-[#5B532C]/40">
            Hover or Tab to a state for detail · click or press Enter to open its districts
          </span>
        )}
      </div>

      {            }
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 border-t border-[#5B532C]/10">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#63A361]">
          {METRIC_META[metric].short}
        </span>
        {(["low", "guarded", "elevated", "high", "severe"] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-md"
              style={{ background: SEVERITY_META[s].color }}
            />
            <span className="text-xs text-[#5B532C]/60">{SEVERITY_META[s].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
