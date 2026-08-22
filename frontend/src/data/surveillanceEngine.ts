/**
 * surveillanceEngine.ts — national crop-health signal layer
 *
 * Aggregates farmer-side diagnoses into district and state level signals for
 * the State Command Centre.
 *
 * IMPORTANT — data provenance:
 * The numbers produced here are SIMULATED reference data, generated from a
 * deterministic seed so that every render, every reload and every machine
 * shows identical values. They model the shape of the real feed, not real
 * observations. The moment the diagnosis pipeline writes to Firestore, this
 * module is replaced by a query against that collection — the exported types
 * are the contract, and they do not change.
 *
 * Nothing in this file claims to be an observation from ICAR, ISRO or any
 * government source.
 */

import { STATE_NODES, CROP_THREATS, type StateNode } from "./nationalGrid";

// ── Types (the API contract) ──────────────────────────────────────────────────

export type Severity = "low" | "guarded" | "elevated" | "high" | "severe";

export interface DistrictSignal {
  id: string;
  district: string;
  stateCode: string;
  stateName: string;
  /** 0-100 composite outbreak pressure index */
  outbreakIndex: number;
  severity: Severity;
  /** Confirmed farmer-submitted diagnoses in the last 30 days */
  diagnoses: number;
  /** Distinct farmers who received an advisory */
  farmersReached: number;
  /** Advisories pushed in the last 7 days */
  advisories7d: number;
  topCrop: string;
  topThreat: string;
  /** Share of diagnoses attributed to topThreat, 0-100 */
  threatShare: number;
  /** 14-day outbreak index history, oldest first */
  trend: number[];
  /** Percentage change over the trailing week */
  weekDelta: number;
  soilStress: number;
  waterStress: number;
}

export interface StateSignal {
  node: StateNode;
  outbreakIndex: number;
  severity: Severity;
  diagnoses: number;
  farmersReached: number;
  advisories7d: number;
  districtsMonitored: number;
  districtsAtRisk: number;
  topThreat: string;
  weekDelta: number;
  districts: DistrictSignal[];
}

export interface OutbreakAlert {
  id: string;
  district: string;
  stateCode: string;
  stateName: string;
  crop: string;
  threat: string;
  severity: Severity;
  outbreakIndex: number;
  /** Minutes since the threshold was crossed */
  minutesAgo: number;
  farmersAtRisk: number;
  /** Which rule fired — shown to the officer so the alert is explainable */
  trigger: string;
}

export interface ModelCard {
  id: string;
  title: string;
  version: string;
  originState: string;
  originCode: string;
  crop: string;
  threat: string;
  /** State codes that have subscribed to or forked this model */
  adoptedBy: string[];
  forks: number;
  /** Field-validation accuracy reported by the publishing state, 0-100 */
  accuracy: number;
  validations: number;
  license: string;
  schema: string;
  updatedDaysAgo: number;
  /** Plain-language summary of what the model encodes */
  summary: string;
}

export type MetricKey = "outbreak" | "reach" | "soil" | "water";

// ── Deterministic PRNG ────────────────────────────────────────────────────────
// A fixed seed keeps the dashboard stable: the same district always shows the
// same figure, so nothing flickers between renders or differs across machines.

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngFor(key: string) {
  return mulberry32(hashString(key));
}

// ── Severity banding ──────────────────────────────────────────────────────────

export function severityOf(index: number): Severity {
  if (index >= 78) return "severe";
  if (index >= 60) return "high";
  if (index >= 42) return "elevated";
  if (index >= 24) return "guarded";
  return "low";
}

export const SEVERITY_META: Record<
  Severity,
  { label: string; color: string; ring: string; text: string }
> = {
  low: { label: "Low", color: "#2E8B6B", ring: "rgba(46,139,107,0.35)", text: "#7FE3BE" },
  guarded: { label: "Guarded", color: "#63A361", ring: "rgba(99,163,97,0.35)", text: "#A8D9A6" },
  elevated: { label: "Elevated", color: "#FFC50F", ring: "rgba(255,197,15,0.35)", text: "#FFD95E" },
  high: { label: "High", color: "#F0872A", ring: "rgba(240,135,42,0.4)", text: "#FFB877" },
  severe: { label: "Severe", color: "#E4453A", ring: "rgba(228,69,58,0.45)", text: "#FF8B82" },
};

// ── Signal generation ─────────────────────────────────────────────────────────

/**
 * Some states carry a deliberate hotspot so the map tells a story rather than
 * showing uniform noise. These mirror genuinely recurring Indian outbreak
 * patterns — wheat rust in the north-west, pink bollworm in the cotton belt,
 * fall armyworm on southern maize.
 */
const PRESSURE_BIAS: Record<string, number> = {
  PB: 26, HR: 22, RJ: 14, MP: 18, MH: 24, TG: 20, GJ: 16,
  UP: 12, BR: 10, WB: 8, AP: 14, KA: 18, TN: 6, AS: 10, OD: 8,
};

function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

function buildDistrict(state: StateNode, district: string): DistrictSignal {
  const rnd = rngFor(`${state.code}:${district}:v3`);

  const bias = PRESSURE_BIAS[state.code] ?? 6;
  const base = 14 + rnd() * 46 + bias * (0.4 + rnd() * 0.9);
  const outbreakIndex = Math.max(4, Math.min(96, Math.round(base)));

  const topCrop = pick(state.crops, rnd());
  const threats = CROP_THREATS[topCrop] ?? ["Unclassified Stress"];
  const topThreat = pick(threats, rnd());

  // Diagnoses scale with the state's farm-household base, so Uttar Pradesh
  // reads heavier than Sikkim without either number being arbitrary.
  const scale = Math.sqrt(state.farmHouseholdsLakh) * 0.9 + 1;
  const diagnoses = Math.round((40 + rnd() * 320) * scale * (0.5 + outbreakIndex / 120));
  const farmersReached = Math.round(diagnoses * (5 + rnd() * 9));
  const advisories7d = Math.round(farmersReached * (0.28 + rnd() * 0.34));

  // 14-day history that lands on the current index, with a plausible drift.
  const drift = (rnd() - 0.42) * 2.6;
  const trend: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const wobble = (rngFor(`${state.code}:${district}:d${i}`)() - 0.5) * 9;
    trend.push(
      Math.max(2, Math.min(99, Math.round(outbreakIndex - drift * i + wobble))),
    );
  }
  const weekAgo = trend[trend.length - 8] || outbreakIndex;
  const weekDelta = Math.round(((outbreakIndex - weekAgo) / Math.max(weekAgo, 1)) * 100);

  return {
    id: `${state.code}-${district.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    district,
    stateCode: state.code,
    stateName: state.name,
    outbreakIndex,
    severity: severityOf(outbreakIndex),
    diagnoses,
    farmersReached,
    advisories7d,
    topCrop,
    topThreat,
    threatShare: Math.round(32 + rnd() * 46),
    trend,
    weekDelta,
    soilStress: Math.round(12 + rnd() * 74),
    waterStress: Math.round(10 + rnd() * 78),
  };
}

function buildState(node: StateNode): StateSignal {
  const districts = node.districts.map((d) => buildDistrict(node, d));

  const sum = (fn: (d: DistrictSignal) => number) =>
    districts.reduce((acc, d) => acc + fn(d), 0);

  const outbreakIndex = districts.length
    ? Math.round(sum((d) => d.outbreakIndex) / districts.length)
    : 0;

  // The dominant threat is whichever one the most districts are reporting.
  const threatCounts = new Map<string, number>();
  districts.forEach((d) =>
    threatCounts.set(d.topThreat, (threatCounts.get(d.topThreat) ?? 0) + 1),
  );
  const topThreat =
    [...threatCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const weekDelta = districts.length
    ? Math.round(sum((d) => d.weekDelta) / districts.length)
    : 0;

  return {
    node,
    outbreakIndex,
    severity: severityOf(outbreakIndex),
    diagnoses: sum((d) => d.diagnoses),
    farmersReached: sum((d) => d.farmersReached),
    advisories7d: sum((d) => d.advisories7d),
    districtsMonitored: districts.length,
    districtsAtRisk: districts.filter((d) => d.outbreakIndex >= 60).length,
    topThreat,
    weekDelta,
    districts: districts.sort((a, b) => b.outbreakIndex - a.outbreakIndex),
  };
}

/** Full national signal set. Computed once — the seed makes it stable. */
export const NATIONAL_SIGNAL: StateSignal[] = STATE_NODES.map(buildState);

export const SIGNAL_BY_CODE: Record<string, StateSignal> = Object.fromEntries(
  NATIONAL_SIGNAL.map((s) => [s.node.code, s]),
);

export const ALL_DISTRICTS: DistrictSignal[] = NATIONAL_SIGNAL.flatMap(
  (s) => s.districts,
);

// ── National roll-up ──────────────────────────────────────────────────────────

export const NATIONAL_TOTALS = {
  states: NATIONAL_SIGNAL.length,
  districts: ALL_DISTRICTS.length,
  diagnoses: ALL_DISTRICTS.reduce((a, d) => a + d.diagnoses, 0),
  farmersReached: ALL_DISTRICTS.reduce((a, d) => a + d.farmersReached, 0),
  advisories7d: ALL_DISTRICTS.reduce((a, d) => a + d.advisories7d, 0),
  districtsAtRisk: ALL_DISTRICTS.filter((d) => d.outbreakIndex >= 60).length,
  languages: new Set(STATE_NODES.map((s) => s.language)).size,
  agroZones: new Set(STATE_NODES.map((s) => s.zone)).size,
};

// ── Alerts ────────────────────────────────────────────────────────────────────

/**
 * An alert fires when a district crosses an escalation rule. Each alert
 * carries the rule that produced it, so an officer can see why it exists —
 * this is the explainability requirement, not a black box.
 */
export function buildAlerts(limit = 40): OutbreakAlert[] {
  return ALL_DISTRICTS.filter((d) => d.outbreakIndex >= 58)
    .sort((a, b) => b.outbreakIndex - a.outbreakIndex)
    .slice(0, limit)
    .map((d, i) => {
      const rnd = rngFor(`alert:${d.id}`);
      let trigger: string;
      if (d.weekDelta >= 18) {
        trigger = `Outbreak index rose ${d.weekDelta}% in 7 days, above the 15% escalation rule`;
      } else if (d.outbreakIndex >= 78) {
        trigger = `Index ${d.outbreakIndex} crossed the severe threshold of 78`;
      } else {
        trigger = `${d.threatShare}% of ${d.diagnoses.toLocaleString("en-IN")} diagnoses attributed to a single threat`;
      }

      return {
        id: `ALT-${d.id}`,
        district: d.district,
        stateCode: d.stateCode,
        stateName: d.stateName,
        crop: d.topCrop,
        threat: d.topThreat,
        severity: d.severity,
        outbreakIndex: d.outbreakIndex,
        minutesAgo: Math.round(3 + i * (4 + rnd() * 11)),
        farmersAtRisk: Math.round(d.farmersReached * (0.18 + rnd() * 0.3)),
        trigger,
      };
    });
}

export const ALERTS: OutbreakAlert[] = buildAlerts();

// ── Cross-state model exchange ────────────────────────────────────────────────

/**
 * The registry that makes this a network rather than an app: a state publishes
 * a versioned advisory model, other states subscribe to or fork it. This is the
 * shareable artefact — thresholds, crop calendars and package-of-practices
 * encoded as data, not code.
 */
export const MODEL_REGISTRY: ModelCard[] = [
  {
    id: "kai.pb.wheat-yellow-rust",
    title: "Wheat Yellow Rust — Early Warning",
    version: "2.1.0",
    originState: "Punjab",
    originCode: "PB",
    crop: "Wheat",
    threat: "Yellow Rust",
    adoptedBy: ["HR", "UP", "RJ", "UK", "HP"],
    forks: 3,
    accuracy: 91,
    validations: 1284,
    license: "CC-BY 4.0",
    schema: "agri-model/v1",
    updatedDaysAgo: 4,
    summary:
      "Temperature and humidity windows that precede rust pustule formation, tuned on 3 rabi seasons of Trans-Gangetic field data.",
  },
  {
    id: "kai.mh.cotton-pink-bollworm",
    title: "Cotton Pink Bollworm — ETL Model",
    version: "1.4.2",
    originState: "Maharashtra",
    originCode: "MH",
    crop: "Cotton",
    threat: "Pink Bollworm",
    adoptedBy: ["TG", "GJ", "AP", "MP"],
    forks: 4,
    accuracy: 87,
    validations: 962,
    license: "CC-BY 4.0",
    schema: "agri-model/v1",
    updatedDaysAgo: 9,
    summary:
      "Economic threshold levels by boll stage with pheromone trap counts, calibrated for Vidarbha and Marathwada sowing windows.",
  },
  {
    id: "kai.ap.rice-bph-threshold",
    title: "Rice Brown Planthopper — Threshold Set",
    version: "3.0.1",
    originState: "Andhra Pradesh",
    originCode: "AP",
    crop: "Rice",
    threat: "Brown Planthopper",
    adoptedBy: ["TN", "OD", "WB", "TG", "CG"],
    forks: 5,
    accuracy: 89,
    validations: 1740,
    license: "CC-BY 4.0",
    schema: "agri-model/v1",
    updatedDaysAgo: 2,
    summary:
      "Hopper-per-hill thresholds mapped to crop stage and nitrogen dose, with a resurgence flag for pyrethroid misuse.",
  },
  {
    id: "kai.ka.maize-fall-armyworm",
    title: "Maize Fall Armyworm — Response Protocol",
    version: "1.2.0",
    originState: "Karnataka",
    originCode: "KA",
    crop: "Maize",
    threat: "Fall Armyworm",
    adoptedBy: ["MP", "MH", "TN", "BR", "TG"],
    forks: 6,
    accuracy: 84,
    validations: 1105,
    license: "CC-BY 4.0",
    schema: "agri-model/v1",
    updatedDaysAgo: 6,
    summary:
      "Whorl damage scoring with staged intervention ladder, from hand-picking through to biopesticide, avoiding blanket spraying.",
  },
  {
    id: "kai.rj.mustard-aphid-window",
    title: "Mustard Aphid — Spray Window",
    version: "1.0.3",
    originState: "Rajasthan",
    originCode: "RJ",
    crop: "Mustard",
    threat: "Mustard Aphid",
    adoptedBy: ["HR", "MP", "UP"],
    forks: 2,
    accuracy: 82,
    validations: 613,
    license: "CC-BY 4.0",
    schema: "agri-model/v1",
    updatedDaysAgo: 12,
    summary:
      "Minimum-temperature trigger for aphid colonisation with a pollinator-safe spray window for the Western Dry Region.",
  },
  {
    id: "kai.wb.potato-late-blight",
    title: "Potato Late Blight — Forecast",
    version: "2.0.0",
    originState: "West Bengal",
    originCode: "WB",
    crop: "Potato",
    threat: "Late Blight",
    adoptedBy: ["BR", "UP", "PB", "HP"],
    forks: 3,
    accuracy: 93,
    validations: 1476,
    license: "CC-BY 4.0",
    schema: "agri-model/v1",
    updatedDaysAgo: 1,
    summary:
      "Humid-period accumulation model issuing a prophylactic spray call 48 hours before visible lesion onset.",
  },
];

export const REGISTRY_TOTALS = {
  models: MODEL_REGISTRY.length,
  adoptions: MODEL_REGISTRY.reduce((a, m) => a + m.adoptedBy.length, 0),
  forks: MODEL_REGISTRY.reduce((a, m) => a + m.forks, 0),
  validations: MODEL_REGISTRY.reduce((a, m) => a + m.validations, 0),
};

// ── Metric access ─────────────────────────────────────────────────────────────

export const METRIC_META: Record<
  MetricKey,
  { label: string; short: string; unit: string; description: string }
> = {
  outbreak: {
    label: "Outbreak pressure",
    short: "Outbreak",
    unit: "index",
    description: "Composite pest and disease pressure from farmer diagnoses",
  },
  reach: {
    label: "Advisory reach",
    short: "Reach",
    unit: "%",
    description: "Share of the farm-household base receiving advisories",
  },
  soil: {
    label: "Soil stress",
    short: "Soil",
    unit: "index",
    description: "Nutrient depletion and organic-carbon stress signal",
  },
  water: {
    label: "Water stress",
    short: "Water",
    unit: "index",
    description: "Irrigation deficit against crop-stage requirement",
  },
};

/** Normalise any metric onto the same 0-100 scale the colour ramp expects. */
export function metricValue(signal: StateSignal, metric: MetricKey): number {
  const ds = signal.districts;
  if (!ds.length) return 0;
  const avg = (fn: (d: DistrictSignal) => number) =>
    Math.round(ds.reduce((a, d) => a + fn(d), 0) / ds.length);

  switch (metric) {
    case "outbreak":
      return signal.outbreakIndex;
    case "reach": {
      const base = signal.node.farmHouseholdsLakh * 100000;
      return Math.max(3, Math.min(100, Math.round((signal.farmersReached / base) * 100)));
    }
    case "soil":
      return avg((d) => d.soilStress);
    case "water":
      return avg((d) => d.waterStress);
  }
}

export function districtMetricValue(d: DistrictSignal, metric: MetricKey): number {
  switch (metric) {
    case "outbreak":
      return d.outbreakIndex;
    case "reach":
      return Math.max(3, Math.min(100, Math.round((d.advisories7d / Math.max(d.farmersReached, 1)) * 100)));
    case "soil":
      return d.soilStress;
    case "water":
      return d.waterStress;
  }
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function compact(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1)} L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function inr(n: number): string {
  return n.toLocaleString("en-IN");
}
