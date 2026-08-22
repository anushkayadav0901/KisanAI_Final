/**
 * CommandCentre — the state and ministry facing half of the network.
 *
 * The farmer app produces diagnoses. This view is what those diagnoses become
 * once they are anonymised and aggregated: a live crop-health surveillance
 * picture for a state agriculture department, and a registry through which
 * states hand working advisory models to each other.
 */

import React from "react";
import { motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { Map as MapIcon, Users, Activity, Info } from "lucide-react";
import { HexIndiaMap } from "../components/command/HexIndiaMap";
import { AlertFeed } from "../components/command/AlertFeed";
import { DistrictPanel } from "../components/command/DistrictPanel";
import { ModelExchange } from "../components/command/ModelExchange";
import Footer from "../components/Footer";
import {
  NATIONAL_TOTALS,
  METRIC_META,
  SIGNAL_BY_CODE,
  SEVERITY_META,
  compact,
  inr,
  type MetricKey,
} from "../data/surveillanceEngine";

const CommandCentre: React.FC = () => {
  const [metric, setMetric] = React.useState<MetricKey>("outbreak");
  const [selected, setSelected] = React.useState<string | null>(null);

  const signal = selected ? SIGNAL_BY_CODE[selected] : null;

  const heroStats = [
    { icon: MapIcon, value: String(NATIONAL_TOTALS.states), label: "States live" },
    { icon: Users, value: compact(NATIONAL_TOTALS.farmersReached), label: "Farmers reached" },
    { icon: Activity, value: inr(NATIONAL_TOTALS.districts), label: "Districts" },
  ];

  const bandStats = [
    {
      value: compact(NATIONAL_TOTALS.diagnoses),
      label: "Diagnoses",
      sublabel: "Farmer-submitted, last 30 days",
    },
    {
      value: String(NATIONAL_TOTALS.districtsAtRisk),
      label: "Above Threshold",
      sublabel: "Districts needing action now",
    },
    {
      value: compact(NATIONAL_TOTALS.advisories7d),
      label: "Advisories Pushed",
      sublabel: "Across all states this week",
    },
    {
      value: String(NATIONAL_TOTALS.languages),
      label: "Advisory Languages",
      sublabel: `Across ${NATIONAL_TOTALS.agroZones} agro-climatic zones`,
    },
  ];

  return (
    <div className="relative bg-white">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#FFFFFF",
            color: "#5B532C",
            border: "1px solid rgba(91,83,44,0.12)",
            borderRadius: "16px",
            fontSize: "13px",
            fontWeight: 500,
            boxShadow: "0 10px 30px rgba(91,83,44,0.10)",
          },
          success: { iconTheme: { primary: "#63A361", secondary: "#FFFFFF" } },
        }}
      />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #5B532C 1.2px, transparent 1.2px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#63A361]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#FDE7B3]/20 rounded-full blur-3xl" />
        </div>

        <div className="relative px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#63A361] uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#63A361] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#63A361]" />
              </span>
              For State &amp; Ministry Officers
            </span>

            <h1 className="text-4xl sm:text-5xl font-bold text-[#5B532C] leading-[1.12] mt-4 mb-5">
              National Crop{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-[#63A361] px-2">Surveillance</span>
                <span className="absolute inset-0 bg-[#FDE7B3]/50 rounded-lg -rotate-1" />
              </span>
            </h1>

            <p className="text-base text-[#5B532C]/60 leading-relaxed mb-8 max-w-2xl">
              Every diagnosis a farmer makes becomes one anonymised data point. Together
              they form a live district-level picture of what is happening to India's
              crops — and the registry through which states hand working advisory models
              to each other.
            </p>

            <div className="flex items-center gap-8 sm:gap-12">
              {heroStats.map((s) => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#63A361]/10 flex items-center justify-center">
                    <s.icon className="w-5 h-5 text-[#63A361]" />
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold text-[#5B532C]">{s.value}</div>
                    <div className="text-xs text-[#5B532C]/50">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Signal band ───────────────────────────────────────────────────── */}
      <section className="bg-[#FDFCF8] border-y border-[#5B532C]/10">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-12">
            {bandStats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="text-center lg:text-left"
              >
                <div className="text-4xl font-bold text-[#5B532C] mb-1">{s.value}</div>
                <div className="text-sm font-medium text-[#5B532C]">{s.label}</div>
                <div className="text-xs text-[#5B532C]/50 mt-0.5">{s.sublabel}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Map + escalation queue ────────────────────────────────────────── */}
      <section className="py-20">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 items-end mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-xs font-semibold text-[#63A361] uppercase tracking-wider">
                Live Signal
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#5B532C] mt-3 leading-tight">
                Where India's crops are{" "}
                <span className="text-[#63A361]">under pressure</span>
              </h2>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-[#5B532C]/60 leading-relaxed lg:text-right"
            >
              {METRIC_META[metric].description}. Each tile is one state — click to open
              its districts.
            </motion.p>
          </div>

          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            {/* Map card */}
            <div className="p-6 bg-white rounded-2xl border border-[#5B532C]/10 shadow-lg shadow-[#5B532C]/5">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#5B532C]">
                    {signal ? signal.node.name : "All India"}
                  </h3>
                  <p className="text-sm text-[#5B532C]/50">
                    {signal
                      ? `${signal.node.zone} · ${signal.node.crops.slice(0, 3).join(", ")}`
                      : `${NATIONAL_TOTALS.states} states · ${inr(NATIONAL_TOTALS.districts)} districts`}
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 bg-[#FDE7B3]/30 rounded-full">
                  {(Object.keys(METRIC_META) as MetricKey[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMetric(m)}
                      className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors ${
                        metric === m
                          ? "bg-[#63A361] text-white"
                          : "text-[#5B532C]/60 hover:text-[#5B532C]"
                      }`}
                    >
                      {METRIC_META[m].short}
                    </button>
                  ))}
                </div>
              </div>

              <HexIndiaMap metric={metric} selected={selected} onSelect={setSelected} />
            </div>

            {/* Escalation queue */}
            <div className="p-6 bg-[#FDFCF8] rounded-2xl border border-[#5B532C]/10 h-[620px]">
              <AlertFeed filterState={selected} onSelectState={setSelected} />
            </div>
          </div>

          {/* Selected-state summary */}
          {signal && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-6"
            >
              {[
                {
                  value: String(signal.outbreakIndex),
                  label: "Pressure index",
                  sublabel: SEVERITY_META[signal.severity].label,
                  color: SEVERITY_META[signal.severity].text,
                },
                {
                  value: `${signal.districtsAtRisk}/${signal.districtsMonitored}`,
                  label: "Districts at risk",
                  sublabel: "Above escalation threshold",
                  color: "#5B532C",
                },
                {
                  value: signal.topThreat,
                  label: "Dominant threat",
                  sublabel: `${signal.node.crops.slice(0, 2).join(" & ")} belt`,
                  color: "#5B532C",
                  small: true,
                },
                {
                  value: `${signal.node.farmHouseholdsLakh} L`,
                  label: "Farm households",
                  sublabel: `Advisories in ${signal.node.language}`,
                  color: "#5B532C",
                },
              ].map((c) => (
                <div
                  key={c.label}
                  className="p-5 bg-white rounded-2xl border border-[#5B532C]/10"
                >
                  <div
                    className={`${c.small ? "text-lg" : "text-3xl"} font-bold mb-1 leading-tight`}
                    style={{ color: c.color }}
                  >
                    {c.value}
                  </div>
                  <div className="text-sm font-medium text-[#5B532C]">{c.label}</div>
                  <div className="text-xs text-[#5B532C]/50 mt-0.5">{c.sublabel}</div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── District drill-down ───────────────────────────────────────────── */}
      {signal && (
        <section className="pb-20">
          <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <DistrictPanel
              stateCode={signal.node.code}
              metric={metric}
              onBack={() => setSelected(null)}
            />
          </div>
        </section>
      )}

      {/* ── Model exchange ────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#FDFCF8] border-t border-[#5B532C]/10">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <ModelExchange />
        </div>
      </section>

      {/* ── Provenance ────────────────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#FDE7B3]/25 border border-[#5B532C]/10">
            <div className="w-10 h-10 rounded-xl bg-[#FFC50F]/20 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-[#B08800]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#5B532C] mb-1">
                About this data
              </h4>
              <p className="text-sm text-[#5B532C]/60 leading-relaxed">
                District names and agro-climatic zones are real. Every metric shown is
                seeded reference data that models the shape of the live feed — it is not
                an observation from ICAR, ISRO or any government source. The exported
                schema{" "}
                <span className="font-semibold text-[#5B532C]/80">agri-signal/v1</span> is
                the contract the production feed fills once diagnoses are written to
                persistent storage.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CommandCentre;
