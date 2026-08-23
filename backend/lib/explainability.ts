export const EXPLAIN_SCHEMA = "agri-explain/v1";

export type Urgency = "high" | "medium" | "low";

export interface AdvisoryFacts {
  soilMoisturePct?: number;
  rainForecastMm3d?: number;
  cropStage?: string;
  crop?: string;
  pest?: string;
  lastSprayClass?: string;
  zincStatus?: string;
  minTempC?: number;
  humidityPct?: number;
  [key: string]: unknown;
}

export interface ExplainInput {
  label: string;
  value: string;
  threshold: string;
  met: boolean;
}

export interface RuleDetail {
  inputs: ExplainInput[];
  rule: string;
  because: string;
}

export interface Rule {
  id: string;
  title: string;
  urgency: Urgency;
  needs: string[];
  criticalStages?: string[];
  when: (f: AdvisoryFacts) => boolean;
  explain: (f: AdvisoryFacts) => RuleDetail;
}

export interface FiredAdvisory {
  id: string;
  title: string;
  urgency: Urgency;
  inputs: ExplainInput[];
  rule: string;
  because: string;
  chain: string[];
}

export interface SkippedRule {
  id: string;
  title: string;
  missingInputs: string[];
  reason: string;
}

export interface ExplanationReport {
  schema: string;
  generated: string;
  method: string;
  observations: AdvisoryFacts;
  advisories: FiredAdvisory[];
  notEvaluated: SkippedRule[];
  summary: {
    rulesTotal: number;
    rulesFired: number;
    rulesSkipped: number;
  };
}

export interface RuleCatalogueEntry {
  id: string;
  title: string;
  urgency: Urgency;
  requiredInputs: string[];
}

export interface RuleCatalogue {
  schema: string;
  method: string;
  rules: RuleCatalogueEntry[];
}

const RULES: Rule[] = [
  {
    id: "irrigate.critical-stage-deficit",
    title: "Irrigate within 48 hours",
    urgency: "high",
    needs: ["soilMoisturePct", "rainForecastMm3d", "cropStage"],
    criticalStages: ["crown root initiation", "tillering", "flowering", "grain filling", "panicle initiation"],
    when: (f) =>
      f.soilMoisturePct! < 25 &&
      f.rainForecastMm3d! < 5 &&
      RULES[0]!.criticalStages!.includes(String(f.cropStage).toLowerCase()),
    explain: (f) => ({
      inputs: [
        { label: "Soil moisture", value: `${f.soilMoisturePct}%`, threshold: "below 25%", met: true },
        { label: "Rain forecast, 3 days", value: `${f.rainForecastMm3d} mm`, threshold: "below 5 mm", met: true },
        { label: "Crop stage", value: String(f.cropStage), threshold: "a critical stage", met: true },
      ],
      rule: "Moisture below 25% with no meaningful rain due, at a stage where water stress causes disproportionate yield loss.",
      because:
        "Missing water at this stage costs more than at any other point in the season. Later irrigation does not recover it.",
    }),
  },
  {
    id: "irrigate.hold",
    title: "Do not irrigate yet",
    urgency: "low",
    needs: ["soilMoisturePct", "rainForecastMm3d"],
    when: (f) => f.rainForecastMm3d! >= 15 && f.soilMoisturePct! >= 20,
    explain: (f) => ({
      inputs: [
        { label: "Rain forecast, 3 days", value: `${f.rainForecastMm3d} mm`, threshold: "15 mm or more", met: true },
        { label: "Soil moisture", value: `${f.soilMoisturePct}%`, threshold: "20% or above", met: true },
      ],
      rule: "Substantial rain is due and the soil is not yet at deficit.",
      because:
        "Irrigating now wastes water and power, and waterlogging after the rain would set the crop back further than the delay would.",
    }),
  },
  {
    id: "disease.rust-risk-window",
    title: "Scout for yellow rust in the next 3 days",
    urgency: "high",
    needs: ["crop", "minTempC", "humidityPct"],
    when: (f) =>
      String(f.crop).toLowerCase() === "wheat" &&
      f.minTempC! >= 8 &&
      f.minTempC! <= 15 &&
      f.humidityPct! >= 80,
    explain: (f) => ({
      inputs: [
        { label: "Crop", value: String(f.crop), threshold: "wheat", met: true },
        { label: "Night temperature", value: `${f.minTempC}°C`, threshold: "8–15°C", met: true },
        { label: "Humidity", value: `${f.humidityPct}%`, threshold: "80% or above", met: true },
      ],
      rule: "Cool nights with high humidity are the conditions under which yellow rust pustules form.",
      because:
        "Rust is controllable when caught at one focus and very hard to control once it is across the field. Scouting now is cheap; a late spray is not.",
    }),
  },
  {
    id: "pest.bph-resurgence-warning",
    title: "Do not spray pyrethroid for planthopper",
    urgency: "high",
    needs: ["crop", "pest", "lastSprayClass"],
    when: (f) =>
      String(f.crop).toLowerCase() === "rice" &&
      String(f.pest).toLowerCase().includes("planthopper") &&
      String(f.lastSprayClass).toLowerCase() === "pyrethroid",
    explain: (f) => ({
      inputs: [
        { label: "Crop", value: String(f.crop), threshold: "rice", met: true },
        { label: "Pest reported", value: String(f.pest), threshold: "brown planthopper", met: true },
        { label: "Previous spray class", value: String(f.lastSprayClass), threshold: "pyrethroid", met: true },
      ],
      rule: "Pyrethroids kill planthopper predators more effectively than the planthopper, which drives resurgence.",
      because:
        "A repeat spray of the same class typically makes the infestation worse, not better. The population returns higher than before treatment.",
    }),
  },
  {
    id: "nutrient.zinc-correction",
    title: "Apply zinc before the next irrigation",
    urgency: "medium",
    needs: ["crop", "zincStatus"],
    when: (f) =>
      ["rice", "wheat"].includes(String(f.crop).toLowerCase()) &&
      String(f.zincStatus).toLowerCase() === "low",
    explain: (f) => ({
      inputs: [
        { label: "Crop", value: String(f.crop), threshold: "rice or wheat", met: true },
        { label: "Soil zinc", value: String(f.zincStatus), threshold: "low", met: true },
      ],
      rule: "Zinc-responsive crop on a soil card reading low zinc.",
      because:
        "Zinc correction is one of the cheapest interventions with a visible yield response in these two crops, and the deficiency will not correct itself.",
    }),
  },
];

const URGENCY_ORDER: Record<Urgency, number> = { high: 0, medium: 1, low: 2 };

export function explainAdvisories(facts: AdvisoryFacts = {}): ExplanationReport {
  const fired: FiredAdvisory[] = [];
  const notEvaluated: SkippedRule[] = [];

  for (const rule of RULES) {
    const missing = rule.needs.filter(
      (k) => facts[k] === undefined || facts[k] === null || facts[k] === "",
    );

    if (missing.length) {
      notEvaluated.push({
        id: rule.id,
        title: rule.title,
        missingInputs: missing,
        reason: `Not checked — no value for ${missing.join(", ")}`,
      });
      continue;
    }

    let matched = false;
    try {
      matched = rule.when(facts);
    } catch {
      matched = false;
    }
    if (!matched) continue;

    const detail = rule.explain(facts);
    fired.push({
      id: rule.id,
      title: rule.title,
      urgency: rule.urgency,
      ...detail,
      chain: detail.inputs.map((i) => `${i.label} ${i.value} (${i.threshold})`),
    });
  }

  fired.sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]);

  return {
    schema: EXPLAIN_SCHEMA,
    generated: new Date().toISOString(),
    method: "deterministic threshold rules evaluated in code, not model output",
    observations: facts,
    advisories: fired,
    notEvaluated,
    summary: {
      rulesTotal: RULES.length,
      rulesFired: fired.length,
      rulesSkipped: notEvaluated.length,
    },
  };
}

export function ruleCatalogue(): RuleCatalogue {
  return {
    schema: EXPLAIN_SCHEMA,
    method: "deterministic threshold rules evaluated in code, not model output",
    rules: RULES.map((r): RuleCatalogueEntry => ({
      id: r.id,
      title: r.title,
      urgency: r.urgency,
      requiredInputs: r.needs,
    })),
  };
}
