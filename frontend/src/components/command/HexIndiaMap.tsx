/**
 * HexIndiaMap — hex tile cartogram of India's agricultural states.
 *
 * Each state is one tile, positioned to approximate its place in the country
 * without drawing a boundary. A cartogram is the honest choice here: it
 * carries the signal without asserting anything about borders, and it stays
 * readable at any size.
 */

import React from "react";
import { motion } from "framer-motion";
import {
  NATIONAL_SIGNAL,
  metricValue,
  severityOf,
  SEVERITY_META,
  METRIC_META,
  type MetricKey,
  type StateSignal,
} from "../../data/surveillanceEngine";

const R = 30; // hex circumradius
const HEX_W = Math.sqrt(3) * R;
const ROW_H = 1.5 * R;
const PAD_X = 34;
const PAD_Y = 30;

function hexCenter(col: number, row: number) {
  return {
    cx: PAD_X + col * HEX_W + (row % 2) * (HEX_W / 2),
    cy: PAD_Y + row * ROW_H,
  };
}

function hexPath(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

const bounds = NATIONAL_SIGNAL.reduce(
  (acc, s) => ({
    maxCol: Math.max(acc.maxCol, s.node.col),
    maxRow: Math.max(acc.maxRow, s.node.row),
  }),
  { maxCol: 0, maxRow: 0 },
);

const VB_W = PAD_X * 2 + (bounds.maxCol + 1) * HEX_W + HEX_W / 2;
const VB_H = PAD_Y * 2 + bounds.maxRow * ROW_H + R;

interface Props {
  metric: MetricKey;
  selected: string | null;
  onSelect: (code: string | null) => void;
}

export const HexIndiaMap: React.FC<Props> = ({ metric, selected, onSelect }) => {
  const [hovered, setHovered] = React.useState<StateSignal | null>(null);

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto select-none"
        role="img"
        aria-label="Hex tile cartogram of Indian states by agricultural signal"
      >
        {NATIONAL_SIGNAL.map((signal, i) => {
          const { col, row, code } = signal.node;
          const { cx, cy } = hexCenter(col, row);
          const value = metricValue(signal, metric);
          const meta = SEVERITY_META[severityOf(value)];
          const isSelected = selected === code;
          const isDimmed = selected !== null && !isSelected;
          const isCritical = value >= 60;

          return (
            <motion.g
              key={code}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: isDimmed ? 0.28 : 1, scale: 1 }}
              transition={{ delay: i * 0.012, duration: 0.35, ease: "easeOut" }}
              style={{ cursor: "pointer", transformOrigin: `${cx}px ${cy}px` }}
              onClick={() => onSelect(isSelected ? null : code)}
              onMouseEnter={() => setHovered(signal)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Soft halo on states above the escalation threshold */}
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
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
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
                {code}
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

      {/* Hover readout — fixed height so the layout never jumps */}
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
              {hovered.node.code}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#5B532C] truncate">
                {hovered.node.name}
                <span className="ml-2 text-xs font-medium text-[#5B532C]/45">
                  {hovered.node.zone}
                </span>
              </div>
              <div className="text-xs text-[#5B532C]/55 truncate">
                {METRIC_META[metric].label} {metricValue(hovered, metric)} ·{" "}
                {hovered.districtsMonitored} districts · {hovered.topThreat}
              </div>
            </div>
          </motion.div>
        ) : (
          <span className="text-xs text-[#5B532C]/40">
            Hover a state for detail · click to open its districts
          </span>
        )}
      </div>

      {/* Legend */}
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
