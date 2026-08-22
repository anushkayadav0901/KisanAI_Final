/**
 * DistrictPanel — district-level drill-down for a selected state.
 *
 * This is the level a block officer or KVK actually acts at, so it carries the
 * full working set: pressure index, 14-day trajectory, dominant threat, and
 * the reach figures that decide where an advisory goes next.
 */

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Download, Layers } from "lucide-react";
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
  const w = 62;
  const h = 20;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = Math.max(max - min, 1);
  const pts = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 3) - 1.5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible shrink-0">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      <circle
        cx={w}
        cy={h - ((series[series.length - 1] - min) / span) * (h - 3) - 1.5}
        r={2}
        fill={color}
      />
    </svg>
  );
};

const DeltaBadge: React.FC<{ delta: number }> = ({ delta }) => {
  if (Math.abs(delta) < 3)
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-white/40">
        <Minus className="w-3 h-3" />
        flat
      </span>
    );
  const rising = delta > 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
      style={{ color: rising ? "#FF8B82" : "#7FE3BE" }}
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
    const rows = districts.map((d) => ({
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
    }));
    const blob = new Blob([JSON.stringify({ schema: "agri-signal/v1", state: signal.node.name, generated: new Date().toISOString(), districts: rows }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agri-signal-${stateCode.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${signal.node.name} district feed exported · agri-signal/v1`, {
      icon: "📦",
      duration: 2600,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/8 bg-white/[0.02]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-white/60 hover:text-white
                     px-2 py-1 rounded-lg hover:bg-white/8 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          National
        </button>

        <div className="h-4 w-px bg-white/12" />

        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white truncate">
            {signal.node.name}
            <span className="ml-2 text-[10px] font-medium text-white/40">
              {signal.node.zone}
            </span>
          </h3>
          <p className="text-[10.5px] text-white/45">
            {signal.districtsMonitored} districts monitored ·{" "}
            <span style={{ color: SEVERITY_META[signal.severity].text }}>
              {signal.districtsAtRisk} above threshold
            </span>{" "}
            · advisories in {signal.node.language}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-white/5 p-0.5">
            {(["pressure", "reach", "name"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors capitalize ${
                  sort === s ? "bg-white/12 text-white" : "text-white/45 hover:text-white/75"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={exportFeed}
            className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg
                       bg-[#63A361]/15 text-[#A8D9A6] hover:bg-[#63A361]/28 transition-colors"
            title="Export this state's district feed as agri-signal/v1 JSON"
          >
            <Download className="w-3 h-3" />
            Export feed
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[380px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0C1512] z-10">
            <tr className="text-[9.5px] uppercase tracking-wider text-white/35">
              <th className="font-semibold px-4 py-2">District</th>
              <th className="font-semibold px-2 py-2">Dominant threat</th>
              <th className="font-semibold px-2 py-2 text-right">
                {METRIC_META[metric].short}
              </th>
              <th className="font-semibold px-2 py-2">14-day</th>
              <th className="font-semibold px-2 py-2 text-right">Diagnoses</th>
              <th className="font-semibold px-4 py-2 text-right">Reached</th>
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
                  transition={{ delay: Math.min(i * 0.012, 0.4) }}
                  className="border-t border-white/5 hover:bg-white/[0.04] transition-colors"
                >
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: meta.color }}
                      />
                      <span className="text-[12px] font-semibold text-white/90">
                        {d.district}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="text-[11px] text-white/70">{d.topThreat}</div>
                    <div className="text-[9.5px] text-white/35">
                      {d.topCrop} · {d.threatShare}% of cases
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <div className="text-[13px] font-black" style={{ color: meta.color }}>
                      {val}
                    </div>
                    <DeltaBadge delta={d.weekDelta} />
                  </td>
                  <td className="px-2 py-2">
                    <Spark series={d.trend} color={meta.color} />
                  </td>
                  <td className="px-2 py-2 text-right text-[11.5px] text-white/70 tabular-nums">
                    {inr(d.diagnoses)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="text-[11.5px] text-white/85 tabular-nums font-semibold">
                      {compact(d.farmersReached)}
                    </div>
                    <div className="text-[9.5px] text-white/35">
                      {compact(d.advisories7d)} advisories/7d
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-white/8 flex items-center gap-2 text-[10px] text-white/35">
        <Layers className="w-3 h-3" />
        Sorted by {sort} · schema <code className="text-white/50">agri-signal/v1</code> · the
        same payload the public API serves
      </div>
    </motion.div>
  );
};
