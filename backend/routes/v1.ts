import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import {
  serialiseStates,
  serialiseDistricts,
  serialiseAlerts,
  serialiseRegistry,
  serialiseModel,
  MODEL_REGISTRY,
  SIGNAL_SCHEMA,
  ALERT_SCHEMA,
  MODEL_SCHEMA,
} from "../lib/surveillance.js";
import {
  retrieve,
  answerGrounded,
  CORPUS_STATS,
} from "../lib/groundedAdvisory.js";
import { CORPUS } from "../data/knowledge/corpus.js";
import { explainAdvisories, ruleCatalogue } from "../lib/explainability.js";
import {
  FIELD_SCHEMA,
  createField,
  listFields,
  getField,
  deleteField,
  fieldVegetation,
  asFeatureCollection,
} from "../lib/fields.js";
import {
  PURPOSES,
  DATA_TYPES,
  CONSENT_SCHEMA,
  DEMO_PRINCIPAL,
  createConsent,
  getConsent,
  listConsents,
  revokeConsent,
  authorise,
  auditTrail,
  seedDemo,
  CONSENT_STATS,
} from "../lib/consent.js";
import { renderDocs } from "../lib/apiDocs.js";
import { OPENAPI_SPEC } from "../lib/openapi.js";

interface AdvisoryBody {
  question?: unknown;
  limit?: number | string;
}

type Principal = typeof DEMO_PRINCIPAL;

interface ConsentCreateBody {
  principal?: Principal;
  consumer?: { id: string; name: string; type?: string };
  purposeCode?: string;
  dataTypes?: string[];
  durationDays?: number | string;
}

interface RevokeBody {
  reason?: string;
}

interface DataReadBody {
  consentId?: string;
  consumerId?: string;
  purposeCode?: string;
  dataTypes?: string[];
}

interface FieldCreateBody {
  name?: string;
  ring?: Array<[number, number]>;
  crop?: string;
  sownOn?: string;
  owner?: string;
}

interface ExplainBody {
  observations?: Record<string, unknown>;
}

function errStatus(err: unknown, fallback = 500): number {
  if (typeof err === "object" && err !== null && "status" in err) {
    const status = (err as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return fallback;
}

function errMessage(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const router = Router();

router.use((_req: Request, res: Response, next: NextFunction) => {
  res.set("Cache-Control", "public, max-age=300");
  res.set("X-Data-Licence", "CC-BY-4.0");
  next();
});

function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
}

router.get("/", (req: Request, res: Response): void => {
  const base = `${req.protocol}://${req.get("host")}/v1`;
  res.json({
    service: "Kisan AI — Agricultural Signal API",
    description:
      "Open crop-health surveillance and cross-state advisory model exchange for India.",
    version: "1.0.0",
    licence: "CC-BY 4.0",
    authentication: "none",
    schemas: [SIGNAL_SCHEMA, ALERT_SCHEMA, MODEL_SCHEMA],
    endpoints: {
      docs: `${base}/docs`,
      openapi: `${base}/openapi.json`,
      states: `${base}/surveillance/states`,
      districts: `${base}/surveillance/districts?state=PB`,
      alerts: `${base}/surveillance/alerts`,
      models: `${base}/models`,
      model: `${base}/models/kai.pb.wheat-yellow-rust`,
      knowledge: `${base}/knowledge`,
      knowledgeSearch: `${base}/knowledge/search?q=yellow+rust+wheat`,
      advisory: `${base}/advisory  (POST {"question": "..."})`,
      consentVocabulary: `${base}/consent/vocabulary`,
      consent: `${base}/consent?principal=${DEMO_PRINCIPAL.id}`,
      dataRead: `${base}/data/read  (POST {"consentId": "...", "dataTypes": [...]})`,
      fields: `${base}/fields`,
      fieldsGeoJson: `${base}/fields?format=geojson`,
      explainRules: `${base}/explain/rules`,
      explain: `${base}/explain  (POST {observations})`,
    },
  });
});

router.get("/openapi.json", (req: Request, res: Response): void => {
  res.json(OPENAPI_SPEC(`${req.protocol}://${req.get("host")}`));
});

router.get("/docs", (req: Request, res: Response): void => {
  res.type("html").send(renderDocs(`${req.protocol}://${req.get("host")}`));
});

router.get("/surveillance/states", (_req: Request, res: Response): void => {
  res.json(serialiseStates());
});

router.get("/surveillance/districts", (req: Request, res: Response): void => {
  const code = String(req.query.state ?? "").toUpperCase();
  if (!code) {
    res.status(400).json({
      error: "missing_parameter",
      message: "Query parameter 'state' is required, e.g. ?state=PB",
    });
    return;
  }

  const payload = serialiseDistricts(code);
  if (!payload) {
    res.status(404).json({
      error: "unknown_state",
      message: `No state with code '${code}'. Call /v1/surveillance/states for valid codes.`,
    });
    return;
  }

  res.json(payload);
});

router.get("/surveillance/alerts", (req: Request, res: Response): void => {
  const code = req.query.state
    ? String(req.query.state).toUpperCase()
    : undefined;
  res.json(serialiseAlerts(code));
});

router.get("/models", (_req: Request, res: Response): void => {
  res.json(serialiseRegistry());
});

router.get("/models/:id", (req: Request, res: Response): void => {
  const id = String(req.params.id ?? "");
  const model = MODEL_REGISTRY.find((m) => m.id === id);
  if (!model) {
    res.status(404).json({
      error: "unknown_model",
      message: `No model with id '${id}'. Call /v1/models for the registry.`,
    });
    return;
  }
  res.json(serialiseModel(model));
});

router.get("/knowledge", (_req: Request, res: Response): void => {
  res.json({
    schema: "agri-knowledge/v1",
    generated: new Date().toISOString(),
    retrieval: "BM25 (Okapi), lexical, deterministic",
    ...CORPUS_STATS,
    documents_list: CORPUS.map((d) => ({
      id: d.id,
      title: d.title,
      crop: d.crop,
      topic: d.topic,
      sections: d.sections.length,
      source: d.source,
    })),
  });
});

router.get("/knowledge/search", (req: Request, res: Response): void => {
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    res.status(400).json({
      error: "missing_parameter",
      message: "Query parameter 'q' is required, e.g. ?q=yellow rust wheat",
    });
    return;
  }

  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const results = retrieve(q, { limit });

  res.json({
    schema: "agri-knowledge/v1",
    query: q,
    count: results.length,
    results,
  });
});

router.post(
  "/advisory",
  async (req: Request, res: Response): Promise<void> => {
    const body = isRecord(req.body) ? req.body : {};
    const question = String(body.question ?? "").trim();
    if (!question) {
      res.status(400).json({
        error: "missing_parameter",
        message: 'Body must contain {"question": "..."}',
      });
      return;
    }

    try {
      const result = await answerGrounded(question, {
        limit: Math.min(Number(body.limit) || 5, 10),
      });
      res.json({ schema: "agri-advisory/v1", ...result });
    } catch (err: unknown) {
      console.error("[v1/advisory]", err);
      res.status(errStatus(err)).json({
        error: "advisory_failed",
        message: errMessage(err),
      });
    }
  },
);

seedDemo();

router.get(
  "/consent/vocabulary",
  noStore,
  (_req: Request, res: Response): void => {
    res.json({
      schema: CONSENT_SCHEMA,
      profile: "DEPA-aligned",
      purposes: Object.entries(PURPOSES).map(([code, p]) => ({ code, ...p })),
      dataTypes: Object.entries(DATA_TYPES).map(([code, d]) => ({
        code,
        ...d,
      })),
    });
  },
);

router.get("/consent", noStore, (req: Request, res: Response): void => {
  const principal = String(req.query.principal ?? DEMO_PRINCIPAL.id);
  res.json({
    schema: CONSENT_SCHEMA,
    principal,
    stats: CONSENT_STATS(),
    consents: listConsents(principal),
  });
});

router.post(
  "/consent",
  noStore,
  (req: Request, res: Response): void => {
    const body = (isRecord(req.body) ? req.body : {}) as ConsentCreateBody;
    try {
      const artefact = createConsent({
        principal: body.principal ?? DEMO_PRINCIPAL,
        consumer: body.consumer ?? { id: "anonymous-consumer", name: "Unnamed consumer" },
        purposeCode: body.purposeCode ?? "",
        dataTypes: body.dataTypes ?? [],
        durationDays: Number(body.durationDays) || 90,
      });
      res.status(201).json(artefact);
    } catch (err: unknown) {
      res.status(errStatus(err, 400)).json({
        error: "consent_invalid",
        message: errMessage(err),
      });
    }
  },
);

router.post(
  "/consent/:id/revoke",
  noStore,
  (req: Request, res: Response): void => {
    const body = (isRecord(req.body) ? req.body : {}) as RevokeBody;
    const id = String(req.params.id ?? "");
    const artefact = revokeConsent(id, body.reason || "Revoked by the farmer");
    if (!artefact) {
      res.status(404).json({
        error: "unknown_consent",
        message: `No consent artefact with id '${id}'`,
      });
      return;
    }
    res.json(artefact);
  },
);

router.get(
  "/consent/:id/audit",
  noStore,
  (req: Request, res: Response): void => {
    const id = String(req.params.id ?? "");
    if (!getConsent(id)) {
      res.status(404).json({
        error: "unknown_consent",
        message: `No consent artefact with id '${id}'`,
      });
      return;
    }
    res.json({
      schema: CONSENT_SCHEMA,
      consentId: id,
      entries: auditTrail(id),
    });
  },
);

router.get("/consent/audit", noStore, (_req: Request, res: Response): void => {
  res.json({ schema: CONSENT_SCHEMA, entries: auditTrail() });
});

router.post("/data/read", noStore, (req: Request, res: Response): void => {
  const body = (isRecord(req.body) ? req.body : {}) as DataReadBody;
  const { consentId, consumerId, purposeCode, dataTypes } = body;

  if (!consentId) {
    res.status(400).json({
      error: "missing_parameter",
      message: 'Body must contain {"consentId": "..."}',
    });
    return;
  }

  const decision = authorise({ consentId, consumerId, purposeCode, dataTypes });

  if (!decision.allowed || !decision.artefact) {
    res.status(403).json({
      error: "consent_denied",
      message: decision.reason,
      consentId,
      authority: "data principal",
    });
    return;
  }

  const artefact = decision.artefact;
  const granted = dataTypes ?? artefact.dataTypes;

  const payload: Record<string, unknown> = {};
  if (granted.includes("identity.anonymous_id"))
    payload.anonymous_id = "anon-7f3c91";
  if (granted.includes("identity.name"))
    payload.name = artefact.dataPrincipal.name;
  if (granted.includes("location.district"))
    payload.district = artefact.dataPrincipal.district;
  if (granted.includes("location.precise"))
    payload.coordinates = { lat: 30.901, lon: 75.857 };
  if (granted.includes("diagnosis.result")) {
    payload.diagnoses = [
      { date: "2026-08-14", crop: "Wheat", finding: "Yellow Rust", healthScore: 62 },
      { date: "2026-07-29", crop: "Wheat", finding: "No issue detected", healthScore: 88 },
    ];
  }
  if (granted.includes("farm.profile")) {
    payload.farm = { sizeHectares: 2.4, crops: ["Wheat", "Rice"] };
  }
  if (granted.includes("diagnosis.image")) {
    payload.images = ["(image payload withheld in this demo response)"];
  }
  if (granted.includes("advisory.history")) {
    payload.advisories = [
      { date: "2026-08-15", topic: "Yellow rust spray window" },
    ];
  }

  res.json({
    schema: CONSENT_SCHEMA,
    consentId,
    purpose: artefact.purpose.code,
    dataTypes: granted,
    accessCount: artefact.accessCount,
    data: payload,
  });
});

router.get("/fields", noStore, (req: Request, res: Response): void => {
  const owner = req.query.owner ? String(req.query.owner) : undefined;

  if (String(req.query.format).toLowerCase() === "geojson") {
    res.json(asFeatureCollection(owner));
    return;
  }

  const fields = listFields(owner);
  res.json({
    schema: FIELD_SCHEMA,
    count: fields.length,
    totalHectares: Number(
      fields.reduce((a, f) => a + f.areaHectares, 0).toFixed(3),
    ),
    fields,
  });
});

router.post("/fields", noStore, (req: Request, res: Response): void => {
  const body = (isRecord(req.body) ? req.body : {}) as FieldCreateBody;
  try {
    const field = createField({
      name: body.name,
      ring: body.ring ?? [],
      crop: body.crop,
      sownOn: body.sownOn,
      owner: body.owner,
    });
    res.status(201).json(field);
  } catch (err: unknown) {
    res.status(errStatus(err, 400)).json({
      error: "invalid_field",
      message: errMessage(err),
    });
  }
});

router.get(
  "/fields/:id/vegetation",
  noStore,
  (req: Request, res: Response): void => {
    const id = String(req.params.id ?? "");
    const data = fieldVegetation(id);
    if (!data) {
      res.status(404).json({
        error: "unknown_field",
        message: `No field with id '${id}'`,
      });
      return;
    }
    res.json(data);
  },
);

router.delete("/fields/:id", noStore, (req: Request, res: Response): void => {
  const id = String(req.params.id ?? "");
  if (!getField(id)) {
    res.status(404).json({
      error: "unknown_field",
      message: `No field with id '${id}'`,
    });
    return;
  }
  deleteField(id);
  res.json({ deleted: id });
});

router.get("/explain/rules", (_req: Request, res: Response): void => {
  res.json(ruleCatalogue());
});

router.post("/explain", (req: Request, res: Response): void => {
  const body = (isRecord(req.body) ? req.body : {}) as ExplainBody;
  const facts: Record<string, unknown> = body.observations ?? (body as unknown as Record<string, unknown>);
  res.json(explainAdvisories(facts));
});

export default router;
