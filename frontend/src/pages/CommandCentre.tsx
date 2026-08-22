/**
 * CommandCentre — the state and ministry facing half of the network.
 *
 * The farmer app produces diagnoses. This view is what those diagnoses become
 * once they are anonymised and aggregated: a live crop-health surveillance
 * picture for a state agriculture department, and a registry through which
 * states hand working advisory models to each other.
 *
 * Every figure on this page is fetched from the public /v1 API. The dashboard
 * holds no private copy of the data and has no privileged access path — it is
 * one consumer of an open endpoint, exactly like any state system would be.
 */

import React from "react";
import { motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import {
  Map as MapIcon,
  Users,
  Activity,
  Info,
  Terminal,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { HexIndiaMap } from "../components/command/HexIndiaMap";
import { AlertFeed } from "../components/command/AlertFeed";
import { DistrictPanel } from "../components/command/DistrictPanel";
import { ModelExchange } from "../components/command/ModelExchange";
import Footer from "../components/Footer";
import {
  METRIC_META,
  SEVERITY_META,
  compact,
  inr,
  type MetricKey,
  type DistrictSignal,
  type ModelCard,
  type NationalTotals,
  type OutbreakAlert,
  type RegistryTotals,
  type StateDetail,
  type StateSignal,
} from "../data/surveillance";
import {
  API_ROOT,
  endpointFor,
  fetchAlerts,
  fetchDistricts,
  fetchNational,
  fetchRegistry,
} from "../api/surveillance";

// ── Live endpoint readout ─────────────────────────────────────────────────────

/**
 * Shows the exact request behind whatever is on screen. Not decoration: the
 * point of an open API is that a reader can copy this line, run it themselves
 * and get the same bytes the page is rendering.
 */
const EndpointStrip: React.FC<{ endpoint: string }> = ({ endpoint }) => {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    const url = `${window.location.origin}${endpoint.replace("GET ", "")}`;
    try {
      await navigator.clipboard.writeText(`curl ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — the endpoint is still readable on screen */
    }
  };

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      <button
        onClick={copy}
        className="group inline-flex items-center gap-2 px-3 py-2 bg-white rounded-full
                   border border-[#5B532C]/12 hover:border-[#63A361]/40 transition-colors max-w-full"
        title="Copy as a curl command"
      >
        <Terminal className="w-3.5 h-3.5 text-[#63A361] shrink-0" />
        <code className="text-xs font-mono text-[#5B532C]/70 truncate">{endpoint}</code>
        {copied ? (
          <Check className="w-3.5 h-3.5 text-[#63A361] shrink-0" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-[#5B532C]/30 group-hover:text-[#5B532C]/60 shrink-0" />
        )}
      </button>
      <a
        href={`${API_ROOT}/docs`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#4A8A4D]
                   bg-[#63A361]/10 rounded-full hover:bg-[#63A361]/20 transition-colors"
      >
        API docs
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const CommandCentre: React.FC = () => {
  const [metric, setMetric] = React.useState<MetricKey>("outbreak");
  const [selected, setSelected] = React.useState<string | null>(null);

  // National signal — loaded once.
  const [states, setStates] = React.useState<StateSignal[]>([]);
  const [totals, setTotals] = React.useState<NationalTotals | null>(null);
  const [provenance, setProvenance] = React.useState<string>("");
  const [nationalLoading, setNationalLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Escalation queue — refetched whenever scope changes.
  const [alerts, setAlerts] = React.useState<OutbreakAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = React.useState(true);

  // District drill-down — fetched on selection.
  const [stateDetail, setStateDetail] = React.useState<StateDetail | null>(null);
  const [districts, setDistricts] = React.useState<DistrictSignal[]>([]);
  const [districtsLoading, setDistrictsLoading] = React.useState(false);

  // Model registry.
  const [models, setModels] = React.useState<ModelCard[]>([]);
  const [registryTotals, setRegistryTotals] = React.useState<RegistryTotals | null>(null);
  const [registryLoading, setRegistryLoading] = React.useState(true);

  // ── Load national signal + registry ────────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;

    fetchNational()
      .then((res) => {
        if (cancelled) return;
        setStates(res.states);
        setTotals(res.totals);
        setProvenance(res.provenance);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setNationalLoading(false));

    fetchRegistry()
      .then((res) => {
        if (cancelled) return;
        setModels(res.models);
        setRegistryTotals(res.totals);
      })
      .catch(() => {
        /* registry failure is not fatal — the surveillance view still works */
      })
      .finally(() => !cancelled && setRegistryLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Alerts follow the selected scope ───────────────────────────────────────
  React.useEffect(() => {
    let cancelled = false;
    setAlertsLoading(true);

    fetchAlerts(selected)
      .then((res) => !cancelled && setAlerts(res))
      .catch(() => !cancelled && setAlerts([]))
      .finally(() => !cancelled && setAlertsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [selected]);

  // ── Districts load on selection ────────────────────────────────────────────
  React.useEffect(() => {
    if (!selected) {
      setStateDetail(null);
      setDistricts([]);
      return;
    }

    let cancelled = false;
    setDistrictsLoading(true);

    fetchDistricts(selected)
      .then((res) => {
        if (cancelled) return;
        setStateDetail(res.state);
        setDistricts(res.districts);
      })
      .catch(() => {
        if (cancelled) return;
        setStateDetail(null);
        setDistricts([]);
      })
      .finally(() => !cancelled && setDistrictsLoading(false));

    return () => {
      cancelled = true;
    };
  }, [selected]);

  const signal = React.useMemo(
    () => states.find((s) => s.code === selected) ?? null,
    [states, selected],
  );

  const heroStats = [
    { icon: MapIcon, value: totals ? String(totals.states) : "—", label: "States live" },
    {
      icon: Users,
      value: totals ? compact(totals.farmersReached) : "—",
      label: "Farmers reached",
    },
    { icon: Activity, value: totals ? inr(totals.districts) : "—", label: "Districts" },
  ];

  const bandStats = [
    {
      value: totals ? compact(totals.diagnoses) : "—",
      label: "Diagnoses",
      sublabel: "Farmer-submitted, last 30 days",
    },
    {
      value: totals ? String(totals.districtsAtRisk) : "—",
      label: "Above Threshold",
      sublabel: "Districts needing action now",
    },
    {
      value: totals ? compact(totals.advisories7d) : "—",
      label: "Advisories Pushed",
      sublabel: "Across all states this week",
    },
    {
      value: totals ? String(totals.languages) : "—",
      label: "Advisory Languages",
      sublabel: totals
        ? `Across ${totals.agroZones} agro-climatic zones`
        : "Across agro-climatic zones",
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
              backgroundImage: "radial-gradient(circle, #5B532C 1.2px, transparent 1.2px)",
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

            <p className="text-base text-[#5B532C]/60 leading-relaxed mb-6 max-w-2xl">
              Every diagnosis a farmer makes becomes one anonymised data point. Together
              they form a live district-level picture of what is happening to India's
              crops — served over an open API that any state department can call.
            </p>

            <div className="mb-8">
              <EndpointStrip endpoint={endpointFor(metric, selected)} />
            </div>

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

      {/* ── API unreachable ───────────────────────────────────────────────── */}
      {error && (
        <section className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8 pb-8">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#D64545]/8 border border-[#D64545]/20">
            <div className="w-10 h-10 rounded-xl bg-[#D64545]/12 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-[#B3332E]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#5B532C] mb-1">
                Signal API unreachable
              </h4>
              <p className="text-sm text-[#5B532C]/65 leading-relaxed">
                {error}. This page reads live from{" "}
                <code className="font-semibold">{API_ROOT}/surveillance/states</code>, so
                the backend needs to be running — start it with{" "}
                <code className="font-semibold">npm start</code> in{" "}
                <code className="font-semibold">backend/</code>.
              </p>
            </div>
          </div>
        </section>
      )}

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
              {METRIC_META[metric].description}. Each tile is one state — click or press
              Enter to open its districts.
            </motion.p>
          </div>

          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            {/* Map card */}
            <div className="p-6 bg-white rounded-2xl border border-[#5B532C]/10 shadow-lg shadow-[#5B532C]/5">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#5B532C]">
                    {signal ? signal.name : "All India"}
                  </h3>
                  <p className="text-sm text-[#5B532C]/50">
                    {signal
                      ? `${signal.zone} · ${signal.crops.slice(0, 3).join(", ")}`
                      : totals
                        ? `${totals.states} states · ${inr(totals.districts)} districts`
                        : "Loading national signal…"}
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

              {nationalLoading ? (
                <div className="h-[420px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-[#63A361]/20 border-t-[#63A361] animate-spin mx-auto mb-3" />
                    <p className="text-sm text-[#5B532C]/45">
                      Fetching national signal from {API_ROOT}…
                    </p>
                  </div>
                </div>
              ) : states.length > 0 ? (
                <HexIndiaMap
                  states={states}
                  metric={metric}
                  selected={selected}
                  onSelect={setSelected}
                />
              ) : (
                <div className="h-[420px] flex items-center justify-center">
                  <p className="text-sm text-[#5B532C]/45">No signal available.</p>
                </div>
              )}
            </div>

            {/* Escalation queue */}
            <div className="p-6 bg-[#FDFCF8] rounded-2xl border border-[#5B532C]/10 h-[620px]">
              <AlertFeed
                alerts={alerts}
                loading={alertsLoading}
                filterState={selected}
                onSelectState={setSelected}
              />
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
                  value: String(signal.metrics.outbreak),
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
                  sublabel: `${signal.crops.slice(0, 2).join(" & ")} belt`,
                  color: "#5B532C",
                  small: true,
                },
                {
                  value: `${signal.farmHouseholdsLakh} L`,
                  label: "Farm households",
                  sublabel: `Advisories in ${signal.language}`,
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
      {stateDetail && (
        <section className="pb-20">
          <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
            <DistrictPanel
              state={stateDetail}
              districts={districts}
              loading={districtsLoading}
              metric={metric}
              onBack={() => setSelected(null)}
            />
          </div>
        </section>
      )}

      {/* ── Model exchange ────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#FDFCF8] border-t border-[#5B532C]/10">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <ModelExchange
            models={models}
            totals={registryTotals}
            states={states}
            loading={registryLoading}
          />
        </div>
      </section>

      {/* ── Provenance ────────────────────────────────────────────────────── */}
      <section className="py-12 bg-white">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-[#FDE7B3]/25 border border-[#5B532C]/10">
            <div className="w-10 h-10 rounded-xl bg-[#FFC50F]/20 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-[#A57D00]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#5B532C] mb-1">About this data</h4>
              <p className="text-sm text-[#5B532C]/60 leading-relaxed">
                {provenance ||
                  "District names and agro-climatic zones are real; metrics model the shape of the live feed and are not observations from ICAR, ISRO or any government source."}{" "}
                The response schemas are the published contract and do not change when the
                live feed is connected, so anything built against this API keeps working.
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
