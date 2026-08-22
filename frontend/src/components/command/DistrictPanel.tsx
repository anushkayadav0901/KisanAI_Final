/**
 * DistrictPanel — district-level drill-down for a selected state.
 *
 * This is the level a block officer or KVK actually acts at, so it carries the
 * full working set: pressure index, 14-day trajectory, dominant threat, and
 * the reach figures that decide where an advisory goes next.
 */

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Download } from "lucide-react";
import toast from "react-hot-toast";
import {
  SIGNAL_BY_CODE,
  SEVERITY_META,
  METRIC_META,
  districtMetricValue,
  severityOf,
  compact,
  inr,
  type MetricKey,
  type DistrictSignal,
} from "../../data/surveillanceEngine";

interface Props {
  stateCode: string;
  metric: MetricKey;
  onBack: () => void;
}

/** Inline sparkline — cheaper and sharper than a chart library at this size. */
const Spark: React.FC<{ series: number[]; color: string }> = ({ series, color }) => {
  const w = 64;
  const h = 22;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = Math.max(max - min, 1);
  const y = (v: number) => h - ((v - min) / span) * (h - 4) - 2;
  const pts = series
    .map((v, i) => `${((i / (series.length - 1)) * w).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible flex-shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={w} cy={y(series[series.length - 1])} r={2.4} fill={color} />
    </svg>
  );
};

const DeltaBadge: React.FC<{ delta: number }> = ({ delta }) => {
  if (Math.abs(delta) < 3)
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-[#5B532C]/40">
        <Minus className="w-3 h-3" />
        flat
      </span>
    );
  const rising = delta > 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-semibold"
      style={{ color: rising ? "#B3332E" : "#4A8A4D" }}
    >
      {rising ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {rising ? "+" : ""}
      {delta}%
    </span>
  );
};

export const DistrictPanel: React.FC<Props> = ({ stateCode, metric, onBack }) => {
  const signal = SIGNAL_BY_CODE[stateCode];
  const [sort, setSort] = React.useState<"pressure" | "reach" | "name">("pressure");

  const districts = React.useMemo(() => {
    const list = [...signal.districts];
    if (sort === "name") return list.sort((a, b) => a.district.localeCompare(b.district));
    if (sort === "reach") return list.sort((a, b) => b.farmersReached - a.farmersReached);
    return list.sort(
      (a, b) => districtMetricValue(b, metric) - districtMetricValue(a, metric),
    );
  }, [signal, sort, metric]);

  const exportFeed = () => {
    const payload = {
      schema: "agri-signal/v1",
      state: signal.node.name,
      generated: new Date().toISOString(),
      districts: districts.map((d) => ({
        district: d.district,
        state: d.stateName,
        outbreak_index: d.outbreakIndex,
        severity: d.severity,
        top_crop: d.topCrop,
        top_threat: d.topThreat,
        diagnoses_30d: d.diagnoses,
        farmers_reached: d.farmersReached,
        advisories_7d: d.advisories7d,
        soil_stress: d.soilStress,
        water_stress: d.waterStress,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agri-signal-${stateCode.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${signal.node.name} district feed exported`, { duration: 2600 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-white rounded-2xl border border-[#5B532C]/10 shadow-lg shadow-[#5B532C]/5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 px-6 py-5 border-b border-[#5B532C]/10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#5B532C]
                     bg-white border-2 border-[#5B532C]/15 rounded-full hover:border-[#63A361]/40
                     hover:bg-[#FDE7B3]/30 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All India
        </button>

        <div className="min-w-0">
          <h3 className="text-xl font-bold text-[#5B532C] truncate">
            {signal.node.name}
          </h3>
          <p className="text-sm text-[#5B532C]/55">
            {signal.districtsMonitored} districts ·{" "}
            <span className="font-semibold" style={{ color: SEVERITY_META[signal.severity].text }}>
              {signal.districtsAtRisk} above threshold
            </span>{" "}
            · advisories in {signal.node.language}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#FDE7B3]/30 rounded-full">
            {(["pressure", "reach", "name"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors capitalize ${
                  sort === s
                    ? "bg-[#63A361] text-white"
                    : "text-[#5B532C]/60 hover:text-[#5B532C]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={exportFeed}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white
                       bg-[#63A361] rounded-full hover:bg-[#4a8a4d] transition-colors"
            title="Export as agri-signal/v1 JSON"
          >
            <Download className="w-3.5 h-3.5" />
            Export feed
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#FDFCF8] z-10">
            <tr className="text-xs font-semibold uppercase tracking-wider text-[#5B532C]/45">
              <th className="px-6 py-3">District</th>
              <th className="px-3 py-3">Dominant threat</th>
              <th className="px-3 py-3 text-right">{METRIC_META[metric].short}</th>
              <th className="px-3 py-3">14-day</th>
              <th className="px-3 py-3 text-right">Diagnoses</th>
              <th className="px-6 py-3 text-right">Reached</th>
            </tr>
          </thead>
          <tbody>
            {districts.map((d: DistrictSignal, i) => {
              const val = districtMetricValue(d, metric);
              const meta = SEVERITY_META[severityOf(val)];
              return (
                <motion.tr
                  key={d.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.012, 0.35) }}
                  className="border-t border-[#5B532C]/8 hover:bg-[#FDE7B3]/20 transition-colors"
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: meta.color }}
                      />
                      <span className="text-sm font-semibold text-[#5B532C]">
                        {d.district}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-sm text-[#5B532C]/75">{d.topThreat}</div>
                    <div className="text-xs text-[#5B532C]/40">
                      {d.topCrop} · {d.threatShare}% of cases
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="text-base font-bold" style={{ color: meta.text }}>
                      {val}
                    </div>
                    <DeltaBadge delta={d.weekDelta} />
                  </td>
                  <td className="px-3 py-3">
                    <Spark series={d.trend} color={meta.color} />
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-[#5B532C]/70 tabular-nums">
                    {inr(d.diagnoses)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="text-sm font-semibold text-[#5B532C] tabular-nums">
                      {compact(d.farmersReached)}
                    </div>
                    <div className="text-xs text-[#5B532C]/40">
                      {compact(d.advisories7d)} advisories/7d
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="px-6 py-3 border-t border-[#5B532C]/10 bg-[#FDFCF8] text-xs text-[#5B532C]/45">
        Sorted by {sort} · schema{" "}
        <span className="font-semibold text-[#5B532C]/65">agri-signal/v1</span> — the same
        payload the public API serves
      </p>
    </motion.div>
  );
};
