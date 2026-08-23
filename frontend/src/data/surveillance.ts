export type Severity = "low" | "guarded" | "elevated" | "high" | "severe";
export type MetricKey = "outbreak" | "reach" | "soil" | "water";

export interface StateSignal {
  code: string;
  name: string;
  zone: string;
  crops: string[];
  language: string;
  farmHouseholdsLakh: number;
  grid: { col: number; row: number };
  metrics: Record<MetricKey, number>;
  severity: Severity;
  districtsMonitored: number;
  districtsAtRisk: number;
  topThreat: string;
  diagnoses: number;
  farmersReached: number;
  advisories7d: number;
  weekDelta: number;
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

export interface DistrictSignal {
  id: string;
  district: string;
  outbreakIndex: number;
  severity: Severity;
  topCrop: string;
  topThreat: string;
  threatShare: number;
  diagnoses: number;
  farmersReached: number;
  advisories7d: number;
  soilStress: number;
  waterStress: number;
  weekDelta: number;
  trend: number[];
}

export interface StateDetail {
  code: string;
  name: string;
  zone: string;
  language: string;
  farmHouseholdsLakh: number;
  crops: string[];
  districtsMonitored: number;
  districtsAtRisk: number;
  topThreat: string;
  severity: Severity;
  metrics: Record<MetricKey, number>;
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
  minutesAgo: number;
  farmersAtRisk: number;
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
  summary: string;
  license: string;
  accuracy: number;
  validations: number;
  adoptedBy: string[];
  forks: number;
  profile: string;
  raw: unknown;
}

export interface RegistryTotals {
  models: number;
  adoptions: number;
  forks: number;
  validations: number;
}

export const SEVERITY_META: Record<
  Severity,
  { label: string; color: string; text: string; soft: string }
> = {
  low: { label: "Low", color: "#63A361", text: "#4A8A4D", soft: "rgba(99,163,97,0.12)" },
  guarded: { label: "Guarded", color: "#9CBF4F", text: "#6E8C2F", soft: "rgba(156,191,79,0.14)" },
  elevated: { label: "Elevated", color: "#FFC50F", text: "#A57D00", soft: "rgba(255,197,15,0.16)" },
  high: { label: "High", color: "#EF8A3C", text: "#C2661F", soft: "rgba(239,138,60,0.14)" },
  severe: { label: "Severe", color: "#D64545", text: "#B3332E", soft: "rgba(214,69,69,0.12)" },
};

export function severityOf(index: number): Severity {
  if (index >= 78) return "severe";
  if (index >= 60) return "high";
  if (index >= 42) return "elevated";
  if (index >= 24) return "guarded";
  return "low";
}

export const METRIC_META: Record<
  MetricKey,
  { label: string; short: string; description: string }
> = {
  outbreak: {
    label: "Outbreak pressure",
    short: "Outbreak",
    description: "Composite pest and disease pressure from farmer diagnoses",
  },
  reach: {
    label: "Advisory reach",
    short: "Reach",
    description: "Share of the farm-household base receiving advisories",
  },
  soil: {
    label: "Soil stress",
    short: "Soil",
    description: "Nutrient depletion and organic-carbon stress signal",
  },
  water: {
    label: "Water stress",
    short: "Water",
    description: "Irrigation deficit against crop-stage requirement",
  },
};

export function districtMetricValue(d: DistrictSignal, metric: MetricKey): number {
  switch (metric) {
    case "outbreak":
      return d.outbreakIndex;
    case "reach":
      return Math.max(
        3,
        Math.min(100, Math.round((d.advisories7d / Math.max(d.farmersReached, 1)) * 100)),
      );
    case "soil":
      return d.soilStress;
    case "water":
      return d.waterStress;
  }
}

export function compact(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1)} L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function inr(n: number): string {
  return n.toLocaleString("en-IN");
}
