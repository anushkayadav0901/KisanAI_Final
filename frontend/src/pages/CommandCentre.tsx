/**
 * CommandCentre — the state and ministry facing half of the network.
 *
 * The farmer app produces diagnoses. This view is what those diagnoses become
 * once they are anonymised and aggregated: a live crop-health surveillance
 * picture for a state agriculture department, and a registry through which
 * states hand working advisory models to each other.
 *
 * Deliberately styled as an operations console rather than a consumer page —
 * this is the screen an officer keeps open, not one a farmer visits.
 */

import React from "react";
import { motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import {
  Activity,
  Map as MapIcon,
  Users,
  Languages,
  ShieldAlert,
  Layers3,
  Info,
  Terminal,
  Copy,
  Check,
} from "lucide-react";
import { HexIndiaMap } from "../components/command/HexIndiaMap";
import { AlertFeed } from "../components/command/AlertFeed";
import { DistrictPanel } from "../components/command/DistrictPanel";
import { ModelExchange } from "../components/command/ModelExchange";
import {
  NATIONAL_TOTALS,
  METRIC_META,
  SIGNAL_BY_CODE,
  SEVERITY_META,
  compact,
  inr,
  type MetricKey,
} from "../data/surveillanceEngine";

// ── Header pieces ─────────────────────────────────────────────────────────────

const LiveClock: React.FC = () => {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-[11px] text-white/50 tabular-nums">
      {now.toLocaleTimeString("en-IN", { hour12: false })} IST
    </span>
  );
};

const ApiStrip: React.FC<{ endpoint: string }> = ({ endpoint }) => {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — the endpoint is still readable on screen */
    }
  };
  return (
    <button
      onClick={copy}
      className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/8
                 hover:border-white/18 transition-colors max-w-full"
      title="This view reads the same open endpoint any state system can call"
    >
      <Terminal className="w-3 h-3 text-[#63A361] shrink-0" />
      <code className="text-[10.5px] font-mono text-white/55 truncate">{endpoint}</code>
      {copied ? (
        <Check className="w-3 h-3 text-[#7FE3BE] shrink-0" />
      ) : (
        <Copy className="w-3 h-3 text-white/25 group-hover:text-white/50 shrink-0" />
      )}
    </button>
  );
};

interface KpiProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub?: string;
  accent?: string;
}

const Kpi: React.FC<KpiProps> = ({ icon, value, label, sub, accent = "#63A361" }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-xl border border-white/8 bg-white/[0.025] px-3.5 py-3"
  >
    <div className="flex items-center gap-2">
      <span style={{ color: accent }}>{icon}</span>
      <span className="text-[9.5px] uppercase tracking-wider text-white/40 font-semibold">
        {label}
      </span>
    </div>
    <div className="mt-1.5 text-[21px] font-black text-white leading-none tabular-nums">
      {value}
    </div>
    {sub && <div className="mt-1 text-[10px] text-white/40">{sub}</div>}
  </motion.div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

const CommandCentre: React.FC = () => {
  const [metric, setMetric] = React.useState<MetricKey>("outbreak");
  const [selected, setSelected] = React.useState<string | null>(null);

  const selectedSignal = selected ? SIGNAL_BY_CODE[selected] : null;

  const endpoint = selected
    ? `GET /v1/surveillance/districts?state=${selected}&metric=${metric}`
    : `GET /v1/surveillance/states?metric=${metric}`;

  return (
    <div className="min-h-screen bg-[#0A120F] text-white">
      {/* Ambient field texture — subtle, keeps the console from reading flat */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 22% 18%, rgba(99,163,97,0.14), transparent 45%), radial-gradient(circle at 78% 72%, rgba(255,197,15,0.08), transparent 48%)",
        }}
      />

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#132019",
            color: "#E8F5EE",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: "12.5px",
          },
        }}
      />

      <div className="relative max-w-[1500px] mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#63A361] opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#63A361]" />
              </span>
              <h1 className="text-[22px] sm:text-[26px] font-black tracking-tight">
                National Crop Surveillance
              </h1>
              <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-[#63A361]/18 text-[#A8D9A6]">
                Command Centre
              </span>
            </div>
            <p className="mt-1.5 text-[12px] text-white/45 max-w-2xl leading-relaxed">
              Farmer diagnoses, anonymised and aggregated into a live district-level
              picture — and the registry through which states hand working advisory
              models to each other.
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex items-center gap-3">
              <LiveClock />
              <span
                className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md bg-[#FFC50F]/12 text-[#FFD95E]"
                title="These figures are seeded reference data modelling the shape of the live feed. They are not observations from any government source."
              >
                <Info className="w-3 h-3" />
                Simulated network data
              </span>
            </div>
            <ApiStrip endpoint={endpoint} />
          </div>
        </header>

        {/* ── KPI strip ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
          <Kpi
            icon={<MapIcon className="w-3.5 h-3.5" />}
            value={String(NATIONAL_TOTALS.states)}
            label="States live"
            sub={`${NATIONAL_TOTALS.agroZones} agro-climatic zones`}
          />
          <Kpi
            icon={<Layers3 className="w-3.5 h-3.5" />}
            value={inr(NATIONAL_TOTALS.districts)}
            label="Districts"
            sub="continuously monitored"
          />
          <Kpi
            icon={<Activity className="w-3.5 h-3.5" />}
            value={compact(NATIONAL_TOTALS.diagnoses)}
            label="Diagnoses 30d"
            sub="farmer-submitted, anonymised"
            accent="#FFC50F"
          />
          <Kpi
            icon={<Users className="w-3.5 h-3.5" />}
            value={compact(NATIONAL_TOTALS.farmersReached)}
            label="Farmers reached"
            sub={`${compact(NATIONAL_TOTALS.advisories7d)} advisories / 7d`}
          />
          <Kpi
            icon={<ShieldAlert className="w-3.5 h-3.5" />}
            value={String(NATIONAL_TOTALS.districtsAtRisk)}
            label="Above threshold"
            sub="districts needing action"
            accent="#E4453A"
          />
          <Kpi
            icon={<Languages className="w-3.5 h-3.5" />}
            value={String(NATIONAL_TOTALS.languages)}
            label="Advisory languages"
            sub="state default routing"
            accent="#FFC50F"
          />
        </div>

        {/* ── Map + alert queue ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-4 mb-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div>
                <h2 className="text-[13px] font-bold text-white">
                  {selectedSignal ? selectedSignal.node.name : "National signal"}
                </h2>
                <p className="text-[10.5px] text-white/40">
                  {METRIC_META[metric].description}
                </p>
              </div>

              <div className="flex items-center rounded-lg bg-white/5 p-0.5">
                {(Object.keys(METRIC_META) as MetricKey[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    className={`px-2.5 py-1.5 text-[10.5px] font-semibold rounded-md transition-colors ${
                      metric === m
                        ? "bg-white/12 text-white"
                        : "text-white/45 hover:text-white/75"
                    }`}
                  >
                    {METRIC_META[m].short}
                  </button>
                ))}
              </div>
            </div>

            <HexIndiaMap metric={metric} selected={selected} onSelect={setSelected} />
          </section>

          <aside className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 h-[520px] lg:h-auto lg:max-h-[620px]">
            <AlertFeed filterState={selected} onSelectState={setSelected} />
          </aside>
        </div>

        {/* ── District drill-down ────────────────────────────────────────── */}
        {selectedSignal ? (
          <div className="mb-4">
            <DistrictPanel
              stateCode={selectedSignal.node.code}
              metric={metric}
              onBack={() => setSelected(null)}
            />
          </div>
        ) : (
          <div className="mb-4 rounded-2xl border border-dashed border-white/12 bg-white/[0.015] px-4 py-5 text-center">
            <p className="text-[12px] text-white/45">
              Select a state on the map to drill into district-level pressure, dominant
              threats and advisory reach.
            </p>
          </div>
        )}

        {/* ── Watchlist ──────────────────────────────────────────────────── */}
        {selectedSignal && (
          <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              {
                label: "State pressure index",
                value: String(selectedSignal.outbreakIndex),
                sub: SEVERITY_META[selectedSignal.severity].label,
                color: SEVERITY_META[selectedSignal.severity].color,
              },
              {
                label: "Districts at risk",
                value: `${selectedSignal.districtsAtRisk}/${selectedSignal.districtsMonitored}`,
                sub: "above escalation threshold",
                color: "#FFC50F",
              },
              {
                label: "Dominant threat",
                value: selectedSignal.topThreat,
                sub: `${selectedSignal.node.crops.slice(0, 2).join(", ")} belt`,
                color: "#A8D9A6",
              },
              {
                label: "Farm households",
                value: `${selectedSignal.node.farmHouseholdsLakh} L`,
                sub: `advisories in ${selectedSignal.node.language}`,
                color: "#63A361",
              },
            ].map((c) => (
              <div
                key={c.label}
                className="rounded-xl border border-white/8 bg-white/[0.025] px-3.5 py-3"
              >
                <div className="text-[9.5px] uppercase tracking-wider text-white/40 font-semibold">
                  {c.label}
                </div>
                <div
                  className="mt-1.5 text-[15px] font-black leading-tight"
                  style={{ color: c.color }}
                >
                  {c.value}
                </div>
                <div className="mt-0.5 text-[10px] text-white/40">{c.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Model exchange ─────────────────────────────────────────────── */}
        <ModelExchange />

        {/* ── Provenance footer ──────────────────────────────────────────── */}
        <footer className="mt-6 rounded-xl border border-white/8 bg-white/[0.015] px-4 py-3">
          <p className="text-[10.5px] leading-relaxed text-white/40">
            <span className="font-semibold text-white/60">Data provenance.</span>{" "}
            District names and agro-climatic zones are real. Every metric on this page is
            seeded reference data that models the shape of the live feed — it is not an
            observation from ICAR, ISRO or any government source. The exported schema{" "}
            <code className="text-white/55">agri-signal/v1</code> is the contract the
            production feed fills once diagnoses are written to persistent storage.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default CommandCentre;
