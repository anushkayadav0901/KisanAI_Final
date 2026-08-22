/**
 * HexIndiaMap — hex tile cartogram of India's agricultural states.
 *
 * Each state is one tile, positioned to approximate its place in the country
 * without drawing a boundary. A cartogram is the honest choice here: it
 * carries the signal (which states are under pressure) without asserting
 * anything about borders, and it stays readable at any size.
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
    const angle = (Math.PI / 180) * (60 * i - 90);
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

/** Blend the severity palette into a continuous ramp. */
function rampColor(value: number): string {
  return SEVERITY_META[severityOf(value)].color;
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
    <div className="relative">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto select-none"
        role="img"
        aria-label="Hex tile cartogram of Indian states by agricultural signal"
      >
        <defs>
          <filter id="tileGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {NATIONAL_SIGNAL.map((signal, i) => {
          const { col, row, code } = { ...signal.node };
          const { cx, cy } = hexCenter(col, row);
          const value = metricValue(signal, metric);
          const color = rampColor(value);
          const isSelected = selected === code;
          const isDimmed = selected !== null && !isSelected;
          const isCritical = value >= 60;

          return (
            <motion.g
              key={code}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: isDimmed ? 0.32 : 1, scale: 1 }}
              transition={{ delay: i * 0.012, duration: 0.35, ease: "easeOut" }}
              style={{ cursor: "pointer", transformOrigin: `${cx}px ${cy}px` }}
              onClick={() => onSelect(isSelected ? null : code)}
              onMouseEnter={() => setHovered(signal)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Pulse ring on states above the escalation threshold */}
              {isCritical && !isDimmed && (
                <motion.path
                  d={hexPath(cx, cy, R - 1)}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  initial={{ opacity: 0.7, scale: 1 }}
                  animate={{ opacity: 0, scale: 1.5 }}
                  transition={{
                    duration: 2.4,
                    repeat: Infinity,
                    delay: (i % 5) * 0.45,
                    ease: "easeOut",
                  }}
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                />
              )}

              <path
                d={hexPath(cx, cy, R - 2.5)}
                fill={color}
                fillOpacity={0.16 + (value / 100) * 0.74}
                stroke={isSelected ? "#FFFFFF" : color}
                strokeWidth={isSelected ? 2.4 : 1.1}
                strokeOpacity={isSelected ? 1 : 0.85}
                filter={isSelected || isCritical ? "url(#tileGlow)" : undefined}
              />

              <text
                x={cx}
                y={cy - 1}
                textAnchor="middle"
                className="pointer-events-none"
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  fill: value >= 42 ? "#0B1A14" : "#E8F5EE",
                  letterSpacing: "0.02em",
                }}
              >
                {code}
              </text>
              <text
                x={cx}
                y={cy + 11}
                textAnchor="middle"
                className="pointer-events-none"
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  fill: value >= 42 ? "rgba(11,26,20,0.7)" : "rgba(232,245,238,0.65)",
                }}
              >
                {value}
              </text>
            </motion.g>
          );
        })}
      </svg>

      {/* Hover readout — fixed slot, so the layout never jumps */}
      <div className="mt-1 h-[58px] px-3 flex items-center">
        {hovered ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: SEVERITY_META[hovered.severity].color }}
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">
                {hovered.node.name}
                <span className="ml-2 text-[11px] font-medium text-white/45">
                  {hovered.node.zone}
                </span>
              </div>
              <div className="text-[11px] text-white/55 truncate">
                {METRIC_META[metric].label} {metricValue(hovered, metric)} ·{" "}
                {hovered.districtsMonitored} districts · dominant threat{" "}
                <span className="text-white/80">{hovered.topThreat}</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <span className="text-[11px] text-white/35">
            Hover a state for detail · click to drill into districts
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-3 pt-2 border-t border-white/8">
        <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
          {METRIC_META[metric].short}
        </span>
        <div className="flex items-center gap-3">
          {(["low", "guarded", "elevated", "high", "severe"] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ background: SEVERITY_META[s].color, opacity: 0.85 }}
              />
              <span className="text-[10px] text-white/50">{SEVERITY_META[s].label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
