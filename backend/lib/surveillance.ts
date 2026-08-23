/**
 * lib/surveillance.js — national crop-health signal layer
 *
 * Aggregates farmer-side diagnoses into district and state level signals, and
 * serves them through the public /v1 API.
 *
 * IMPORTANT — data provenance:
 * The numbers produced here are SIMULATED reference data, generated from a
 * deterministic seed so every request returns identical values. They model the
 * shape of the real feed, not real observations. When the diagnosis pipeline
 * writes to persistent storage, only the internals of `buildDistrict` change —
 * the exported payload shapes are the published contract and stay fixed.
 *
 * Nothing here claims to be an observation from ICAR, ISRO or any government
 * source.
 */

import { STATE_NODES, CROP_THREATS, type StateNode } from "../data/nationalGrid.js";

export const SIGNAL_SCHEMA = "agri-signal/v1";
export const ALERT_SCHEMA = "agri-alert/v1";
export const MODEL_SCHEMA = "agri-model/v1";

// ── Domain types ──────────────────────────────────────────────────────────────

export type Severity = "severe" | "high" | "elevated" | "guarded" | "low";

export interface DistrictSignal {
  id: string;
  district: string;
  stateCode: string;
  stateName: string;
  outbreakIndex: number;
  severity: Severity;
  diagnoses: number;
  farmersReached: number;
  advisories7d: number;
  topCrop: string;
  topThreat: string;
  threatShare: number;
  trend: number[];
  weekDelta: number;
  soilStress: number;
  waterStress: number;
}

export interface StateMetrics {
  outbreak: number;
  reach: number;
  soil: number;
  water: number;
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
  metrics: StateMetrics;
  districts: DistrictSignal[];
}

export interface NationalTotals {
  states: number;
  districts: number;
  diagnoses: number;
  farmersReached: number;
  advisories7d: number;
  districtsAtRisk: number;
  languages: number;
  agroZones: number;
}

export interface AgriAlert {
  id: string;
  district: string;
  stateCode: string;
  stateName: string;
  crop: string;
  threat: string;
  severity: Severity;
  outbreakIndex: number;
  minutesAgo: number;
  farmersAtRisk: number;
  trigger: string;
}

export interface RegistryModel {
  id: string;
  title: string;
  version: string;
  originState: string;
  originCode: string;
  crop: string;
  threat: string;
  adoptedBy: string[];
  forks: number;
  accuracy: number;
  validations: number;
  license: string;
  schema: string;
  updatedDaysAgo: number;
  summary: string;
}

export interface RegistryTotals {
  models: number;
  adoptions: number;
  forks: number;
  validations: number;
}

// ── Deterministic PRNG ────────────────────────────────────────────────────────
// A fixed seed keeps the feed stable: the same district always returns the same
// figure, so a consumer polling the API sees a coherent series rather than noise.

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

const rngFor = (key: string): (() => number) => mulberry32(hashString(key));

// ── Severity banding ──────────────────────────────────────────────────────────

export function severityOf(index: number): Severity {
  if (index >= 78) return "severe";
  if (index >= 60) return "high";
  if (index >= 42) return "elevated";
  if (index >= 24) return "guarded";
  return "low";
}

// ── Signal generation ─────────────────────────────────────────────────────────

/**
 * Some states carry a deliberate hotspot so the feed reflects genuinely
 * recurring Indian outbreak patterns — wheat rust in the north-west, pink
 * bollworm in the cotton belt, fall armyworm on southern maize — rather than
 * uniform noise.
 */
const PRESSURE_BIAS: Record<string, number> = {
  PB: 26, HR: 22, RJ: 14, MP: 18, MH: 24, TG: 20, GJ: 16,
  UP: 12, BR: 10, WB: 8, AP: 14, KA: 18, TN: 6, AS: 10, OD: 8,
};

const pick = <T>(arr: T[], r: number): T =>
  arr[Math.floor(r * arr.length) % arr.length]!;

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
  const diagnoses = Math.round(
    (40 + rnd() * 320) * scale * (0.5 + outbreakIndex / 120),
  );
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
  const weekDelta = Math.round(
    ((outbreakIndex - weekAgo) / Math.max(weekAgo, 1)) * 100,
  );

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
  const sum = (fn: (d: DistrictSignal) => number): number =>
    districts.reduce((acc, d) => acc + fn(d), 0);
  const avg = (fn: (d: DistrictSignal) => number): number =>
    districts.length ? Math.round(sum(fn) / districts.length) : 0;

  const outbreakIndex = avg((d) => d.outbreakIndex);

  // The dominant threat is whichever one the most districts are reporting.
  const threatCounts = new Map<string, number>();
  districts.forEach((d) =>
    threatCounts.set(d.topThreat, (threatCounts.get(d.topThreat) ?? 0) + 1),
  );
  const topThreat =
    [...threatCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const farmersReached = sum((d) => d.farmersReached);
  const base = node.farmHouseholdsLakh * 100000;

  return {
    node,
    outbreakIndex,
    severity: severityOf(outbreakIndex),
    diagnoses: sum((d) => d.diagnoses),
    farmersReached,
    advisories7d: sum((d) => d.advisories7d),
    districtsMonitored: districts.length,
    districtsAtRisk: districts.filter((d) => d.outbreakIndex >= 60).length,
    topThreat,
    weekDelta: avg((d) => d.weekDelta),
    metrics: {
      outbreak: outbreakIndex,
      reach: Math.max(3, Math.min(100, Math.round((farmersReached / base) * 100))),
      soil: avg((d) => d.soilStress),
      water: avg((d) => d.waterStress),
    },
    districts: districts.sort((a, b) => b.outbreakIndex - a.outbreakIndex),
  };
}

export const NATIONAL_SIGNAL: StateSignal[] = STATE_NODES.map(buildState);

export const SIGNAL_BY_CODE: Record<string, StateSignal> = Object.fromEntries(
  NATIONAL_SIGNAL.map((s) => [s.node.code, s]),
);

const ALL_DISTRICTS: DistrictSignal[] = NATIONAL_SIGNAL.flatMap((s) => s.districts);

export const NATIONAL_TOTALS: NationalTotals = {
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
 * An alert fires when a district crosses an escalation rule. Each alert carries
 * the rule that produced it so a consumer can show why it exists — an alert
 * nobody can explain is an alert nobody acts on.
 */
export const ALERTS: AgriAlert[] = ALL_DISTRICTS.filter((d) => d.outbreakIndex >= 58)
  .sort((a, b) => b.outbreakIndex - a.outbreakIndex)
  .slice(0, 40)
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

// ── Cross-state model exchange ────────────────────────────────────────────────

/**
 * The registry that makes this a network rather than an app: a state publishes
 * a versioned advisory model, other states subscribe to or fork it. Thresholds,
 * crop calendars and package-of-practices encoded as data, not code.
 */
export const MODEL_REGISTRY: RegistryModel[] = [
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
    schema: MODEL_SCHEMA,
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
    schema: MODEL_SCHEMA,
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
    schema: MODEL_SCHEMA,
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
    schema: MODEL_SCHEMA,
    updatedDaysAgo: 6,
    summary:
      "Whorl damage scoring with a staged intervention ladder, from hand-picking through to biopesticide, avoiding blanket spraying.",
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
    schema: MODEL_SCHEMA,
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
    schema: MODEL_SCHEMA,
    updatedDaysAgo: 1,
    summary:
      "Humid-period accumulation model issuing a prophylactic spray call 48 hours before visible lesion onset.",
  },
];

export const REGISTRY_TOTALS: RegistryTotals = {
  models: MODEL_REGISTRY.length,
  adoptions: MODEL_REGISTRY.reduce((a, m) => a + m.adoptedBy.length, 0),
  forks: MODEL_REGISTRY.reduce((a, m) => a + m.forks, 0),
  validations: MODEL_REGISTRY.reduce((a, m) => a + m.validations, 0),
};

// ── Public payload serialisers ────────────────────────────────────────────────
// snake_case on the wire: this is an open-data endpoint, and that is the
// convention Indian government data portals publish in.

export interface SignalTotalsPayload {
  states: number;
  districts: number;
  diagnoses_30d: number;
  farmers_reached: number;
  advisories_7d: number;
  districts_at_risk: number;
  advisory_languages: number;
  agro_climatic_zones: number;
}

export interface SerialisedState {
  code: string;
  name: string;
  agro_climatic_zone: string;
  primary_crops: string[];
  advisory_language: string;
  farm_households_lakh: number;
  grid: { col: number; row: number };
  metrics: StateMetrics;
  severity: Severity;
  districts_monitored: number;
  districts_at_risk: number;
  top_threat: string;
  diagnoses_30d: number;
  farmers_reached: number;
  advisories_7d: number;
  week_delta_pct: number;
}

export interface StatesFeed {
  schema: string;
  generated: string;
  provenance: string;
  license: string;
  totals: SignalTotalsPayload;
  states: SerialisedState[];
}

export interface SerialisedDistrict {
  id: string;
  district: string;
  outbreak_index: number;
  severity: Severity;
  top_crop: string;
  top_threat: string;
  threat_share_pct: number;
  diagnoses_30d: number;
  farmers_reached: number;
  advisories_7d: number;
  soil_stress: number;
  water_stress: number;
  week_delta_pct: number;
  trend_14d: number[];
}

export interface DistrictsFeed {
  schema: string;
  generated: string;
  provenance: string;
  license: string;
  state: {
    code: string;
    name: string;
    agro_climatic_zone: string;
    advisory_language: string;
    farm_households_lakh: number;
    primary_crops: string[];
    districts_monitored: number;
    districts_at_risk: number;
    top_threat: string;
    severity: Severity;
    metrics: StateMetrics;
  };
  districts: SerialisedDistrict[];
}

export interface SerialisedAlert {
  id: string;
  district: string;
  state_code: string;
  state_name: string;
  crop: string;
  threat: string;
  severity: Severity;
  outbreak_index: number;
  minutes_ago: number;
  farmers_at_risk: number;
  trigger: string;
}

export interface AlertsFeed {
  schema: string;
  generated: string;
  provenance: string;
  scope: string;
  count: number;
  alerts: SerialisedAlert[];
}

export interface SerialisedModel {
  $schema: string;
  id: string;
  version: string;
  title: string;
  publisher: { state: string; code: string; authority: string };
  scope: { crop: string; threat: string };
  summary: string;
  license: string;
  validation: { field_validations: number; reported_accuracy_pct: number };
  adoption: { subscribed_states: string[]; forks: number };
  updated_days_ago: number;
  interoperability: { profile: string; transport: string; auth: string };
}

export interface RegistryFeed {
  schema: string;
  generated: string;
  license: string;
  totals: {
    published_models: number;
    state_adoptions: number;
    forks: number;
    field_validations: number;
  };
  models: SerialisedModel[];
}

const PROVENANCE =
  "Simulated reference data. District names and agro-climatic zones are real; " +
  "metrics model the shape of the live feed and are not observations from " +
  "ICAR, ISRO or any government source.";

export function serialiseStates(): StatesFeed {
  return {
    schema: SIGNAL_SCHEMA,
    generated: new Date().toISOString(),
    provenance: PROVENANCE,
    license: "CC-BY 4.0",
    totals: {
      states: NATIONAL_TOTALS.states,
      districts: NATIONAL_TOTALS.districts,
      diagnoses_30d: NATIONAL_TOTALS.diagnoses,
      farmers_reached: NATIONAL_TOTALS.farmersReached,
      advisories_7d: NATIONAL_TOTALS.advisories7d,
      districts_at_risk: NATIONAL_TOTALS.districtsAtRisk,
      advisory_languages: NATIONAL_TOTALS.languages,
      agro_climatic_zones: NATIONAL_TOTALS.agroZones,
    },
    states: NATIONAL_SIGNAL.map((s): SerialisedState => ({
      code: s.node.code,
      name: s.node.name,
      agro_climatic_zone: s.node.zone,
      primary_crops: s.node.crops,
      advisory_language: s.node.language,
      farm_households_lakh: s.node.farmHouseholdsLakh,
      grid: { col: s.node.col, row: s.node.row },
      metrics: s.metrics,
      severity: s.severity,
      districts_monitored: s.districtsMonitored,
      districts_at_risk: s.districtsAtRisk,
      top_threat: s.topThreat,
      diagnoses_30d: s.diagnoses,
      farmers_reached: s.farmersReached,
      advisories_7d: s.advisories7d,
      week_delta_pct: s.weekDelta,
    })),
  };
}

export function serialiseDistricts(code: string): DistrictsFeed | null {
  const signal = SIGNAL_BY_CODE[code];
  if (!signal) return null;

  return {
    schema: SIGNAL_SCHEMA,
    generated: new Date().toISOString(),
    provenance: PROVENANCE,
    license: "CC-BY 4.0",
    state: {
      code: signal.node.code,
      name: signal.node.name,
      agro_climatic_zone: signal.node.zone,
      advisory_language: signal.node.language,
      farm_households_lakh: signal.node.farmHouseholdsLakh,
      primary_crops: signal.node.crops,
      districts_monitored: signal.districtsMonitored,
      districts_at_risk: signal.districtsAtRisk,
      top_threat: signal.topThreat,
      severity: signal.severity,
      metrics: signal.metrics,
    },
    districts: signal.districts.map((d): SerialisedDistrict => ({
      id: d.id,
      district: d.district,
      outbreak_index: d.outbreakIndex,
      severity: d.severity,
      top_crop: d.topCrop,
      top_threat: d.topThreat,
      threat_share_pct: d.threatShare,
      diagnoses_30d: d.diagnoses,
      farmers_reached: d.farmersReached,
      advisories_7d: d.advisories7d,
      soil_stress: d.soilStress,
      water_stress: d.waterStress,
      week_delta_pct: d.weekDelta,
      trend_14d: d.trend,
    })),
  };
}

export function serialiseAlerts(code?: string): AlertsFeed {
  const pool = code ? ALERTS.filter((a) => a.stateCode === code) : ALERTS;
  return {
    schema: ALERT_SCHEMA,
    generated: new Date().toISOString(),
    provenance: PROVENANCE,
    scope: code ?? "national",
    count: pool.length,
    alerts: pool.map((a): SerialisedAlert => ({
      id: a.id,
      district: a.district,
      state_code: a.stateCode,
      state_name: a.stateName,
      crop: a.crop,
      threat: a.threat,
      severity: a.severity,
      outbreak_index: a.outbreakIndex,
      minutes_ago: a.minutesAgo,
      farmers_at_risk: a.farmersAtRisk,
      trigger: a.trigger,
    })),
  };
}

/** The artefact a state publishes and another state consumes. */
export function serialiseModel(m: RegistryModel): SerialisedModel {
  return {
    $schema: `https://kisan.ai/schema/${m.schema}.json`,
    id: m.id,
    version: m.version,
    title: m.title,
    publisher: {
      state: m.originState,
      code: m.originCode,
      authority: "State Department of Agriculture",
    },
    scope: { crop: m.crop, threat: m.threat },
    summary: m.summary,
    license: m.license,
    validation: {
      field_validations: m.validations,
      reported_accuracy_pct: m.accuracy,
    },
    adoption: { subscribed_states: m.adoptedBy, forks: m.forks },
    updated_days_ago: m.updatedDaysAgo,
    interoperability: {
      profile: MODEL_SCHEMA,
      transport: "HTTPS + JSON",
      auth: "none (open data)",
    },
  };
}

export function serialiseRegistry(): RegistryFeed {
  return {
    schema: MODEL_SCHEMA,
    generated: new Date().toISOString(),
    license: "CC-BY 4.0",
    totals: {
      published_models: REGISTRY_TOTALS.models,
      state_adoptions: REGISTRY_TOTALS.adoptions,
      forks: REGISTRY_TOTALS.forks,
      field_validations: REGISTRY_TOTALS.validations,
    },
    models: MODEL_REGISTRY.map(serialiseModel),
  };
}
