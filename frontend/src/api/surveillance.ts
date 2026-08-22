/**
 * api/surveillance.ts — client for the public Agricultural Signal API
 *
 * The dashboard reads the same open endpoints any state department or third
 * party would call. There is no privileged path: if these requests work for the
 * dashboard, they work for anyone with curl.
 *
 * The API speaks snake_case (the convention Indian open-data portals publish
 * in). Mapping to the camelCase the components expect happens here and nowhere
 * else, so the wire format stays a contract rather than leaking through the UI.
 */

import type {
  DistrictSignal,
  ModelCard,
  NationalTotals,
  OutbreakAlert,
  RegistryTotals,
  StateDetail,
  StateSignal,
} from "../data/surveillance";

/** In dev, Vite proxies /v1 to the backend; in production nginx does. */
export const API_ROOT = "/v1";

/** Shown on the page so a reader can see exactly what is being called. */
export function endpointFor(metric: string, state: string | null): string {
  return state
    ? `GET /v1/surveillance/districts?state=${state}`
    : `GET /v1/surveillance/states?metric=${metric}`;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_ROOT}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.message ?? body.error ?? detail;
    } catch {
      /* non-JSON error body — fall back to the status text */
    }
    throw new Error(`${res.status} — ${detail}`);
  }
  return res.json() as Promise<T>;
}

// ── Raw wire shapes ───────────────────────────────────────────────────────────

interface WireState {
  code: string;
  name: string;
  agro_climatic_zone: string;
  primary_crops: string[];
  advisory_language: string;
  farm_households_lakh: number;
  grid: { col: number; row: number };
  metrics: Record<string, number>;
  severity: string;
  districts_monitored: number;
  districts_at_risk: number;
  top_threat: string;
  diagnoses_30d: number;
  farmers_reached: number;
  advisories_7d: number;
  week_delta_pct: number;
}

interface WireDistrict {
  id: string;
  district: string;
  outbreak_index: number;
  severity: string;
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

// ── Mappers ───────────────────────────────────────────────────────────────────

const toState = (s: WireState): StateSignal => ({
  code: s.code,
  name: s.name,
  zone: s.agro_climatic_zone,
  crops: s.primary_crops,
  language: s.advisory_language,
  farmHouseholdsLakh: s.farm_households_lakh,
  grid: s.grid,
  metrics: s.metrics as StateSignal["metrics"],
  severity: s.severity as StateSignal["severity"],
  districtsMonitored: s.districts_monitored,
  districtsAtRisk: s.districts_at_risk,
  topThreat: s.top_threat,
  diagnoses: s.diagnoses_30d,
  farmersReached: s.farmers_reached,
  advisories7d: s.advisories_7d,
  weekDelta: s.week_delta_pct,
});

const toDistrict = (d: WireDistrict): DistrictSignal => ({
  id: d.id,
  district: d.district,
  outbreakIndex: d.outbreak_index,
  severity: d.severity as DistrictSignal["severity"],
  topCrop: d.top_crop,
  topThreat: d.top_threat,
  threatShare: d.threat_share_pct,
  diagnoses: d.diagnoses_30d,
  farmersReached: d.farmers_reached,
  advisories7d: d.advisories_7d,
  soilStress: d.soil_stress,
  waterStress: d.water_stress,
  weekDelta: d.week_delta_pct,
  trend: d.trend_14d,
});

// ── Calls ─────────────────────────────────────────────────────────────────────

export interface NationalResponse {
  totals: NationalTotals;
  states: StateSignal[];
  provenance: string;
}

export async function fetchNational(): Promise<NationalResponse> {
  const raw = await getJson<{
    totals: Record<string, number>;
    states: WireState[];
    provenance: string;
  }>("/surveillance/states");

  return {
    provenance: raw.provenance,
    totals: {
      states: raw.totals.states,
      districts: raw.totals.districts,
      diagnoses: raw.totals.diagnoses_30d,
      farmersReached: raw.totals.farmers_reached,
      advisories7d: raw.totals.advisories_7d,
      districtsAtRisk: raw.totals.districts_at_risk,
      languages: raw.totals.advisory_languages,
      agroZones: raw.totals.agro_climatic_zones,
    },
    states: raw.states.map(toState),
  };
}

export interface DistrictsResponse {
  state: StateDetail;
  districts: DistrictSignal[];
}

export async function fetchDistricts(code: string): Promise<DistrictsResponse> {
  const raw = await getJson<{
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
      severity: string;
      metrics: Record<string, number>;
    };
    districts: WireDistrict[];
  }>(`/surveillance/districts?state=${encodeURIComponent(code)}`);

  return {
    state: {
      code: raw.state.code,
      name: raw.state.name,
      zone: raw.state.agro_climatic_zone,
      language: raw.state.advisory_language,
      farmHouseholdsLakh: raw.state.farm_households_lakh,
      crops: raw.state.primary_crops,
      districtsMonitored: raw.state.districts_monitored,
      districtsAtRisk: raw.state.districts_at_risk,
      topThreat: raw.state.top_threat,
      severity: raw.state.severity as StateDetail["severity"],
      metrics: raw.state.metrics as StateDetail["metrics"],
    },
    districts: raw.districts.map(toDistrict),
  };
}

export async function fetchAlerts(state?: string | null): Promise<OutbreakAlert[]> {
  const qs = state ? `?state=${encodeURIComponent(state)}` : "";
  const raw = await getJson<{
    alerts: Array<{
      id: string;
      district: string;
      state_code: string;
      state_name: string;
      crop: string;
      threat: string;
      severity: string;
      outbreak_index: number;
      minutes_ago: number;
      farmers_at_risk: number;
      trigger: string;
    }>;
  }>(`/surveillance/alerts${qs}`);

  return raw.alerts.map((a) => ({
    id: a.id,
    district: a.district,
    stateCode: a.state_code,
    stateName: a.state_name,
    crop: a.crop,
    threat: a.threat,
    severity: a.severity as OutbreakAlert["severity"],
    outbreakIndex: a.outbreak_index,
    minutesAgo: a.minutes_ago,
    farmersAtRisk: a.farmers_at_risk,
    trigger: a.trigger,
  }));
}

export interface RegistryResponse {
  totals: RegistryTotals;
  models: ModelCard[];
}

export async function fetchRegistry(): Promise<RegistryResponse> {
  const raw = await getJson<{
    totals: Record<string, number>;
    models: Array<{
      id: string;
      title: string;
      version: string;
      publisher: { state: string; code: string };
      scope: { crop: string; threat: string };
      summary: string;
      license: string;
      validation: { field_validations: number; reported_accuracy_pct: number };
      adoption: { subscribed_states: string[]; forks: number };
      interoperability: { profile: string };
    }>;
  }>("/models");

  return {
    totals: {
      models: raw.totals.published_models,
      adoptions: raw.totals.state_adoptions,
      forks: raw.totals.forks,
      validations: raw.totals.field_validations,
    },
    models: raw.models.map((m) => ({
      id: m.id,
      title: m.title,
      version: m.version,
      originState: m.publisher.state,
      originCode: m.publisher.code,
      crop: m.scope.crop,
      threat: m.scope.threat,
      summary: m.summary,
      license: m.license,
      accuracy: m.validation.reported_accuracy_pct,
      validations: m.validation.field_validations,
      adoptedBy: m.adoption.subscribed_states,
      forks: m.adoption.forks,
      profile: m.interoperability.profile,
      raw: m,
    })),
  };
}
