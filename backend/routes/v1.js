/**
 * routes/v1.js — the public Agricultural Signal API
 *
 * Open data, no authentication. Any state department, researcher or third-party
 * application can call these endpoints directly. The Command Centre dashboard
 * is simply one client among them — it has no privileged access path.
 *
 *   GET /v1/                            service discovery document
 *   GET /v1/openapi.json                OpenAPI 3.0 specification
 *   GET /v1/docs                        interactive console
 *   GET /v1/surveillance/states         national signal, one row per state
 *   GET /v1/surveillance/districts      district signal for one state
 *   GET /v1/surveillance/alerts         open escalations, national or by state
 *   GET /v1/models                      cross-state advisory model registry
 *   GET /v1/models/:id                  a single model card artefact
 *   GET /v1/knowledge                   corpus manifest and provenance
 *   GET /v1/knowledge/search            retrieval over the advisory corpus
 *   POST /v1/advisory                   retrieval-grounded advisory with citations
 *   GET  /v1/consent/vocabulary         purposes and data types with sensitivity
 *   GET  /v1/consent                    a farmer's consent artefacts
 *   POST /v1/consent                    grant a consent
 *   POST /v1/consent/:id/revoke         withdraw a consent
 *   GET  /v1/consent/:id/audit          access trail for one consent
 *   POST /v1/data/read                  consent-gated data read
 *   GET  /v1/fields                     field boundaries (JSON or GeoJSON)
 *   POST /v1/fields                     save a drawn boundary
 *   GET  /v1/fields/:id/vegetation      NDVI series for one field
 *   DELETE /v1/fields/:id               remove a field
 */

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

const router = Router();

// Open, non-personal data is cacheable and publicly readable.
router.use((_req, res, next) => {
  res.set("Cache-Control", "public, max-age=300");
  res.set("X-Data-Licence", "CC-BY-4.0");
  next();
});

/**
 * Consent state must never be cached.
 *
 * The open-data cache header above is right for surveillance and model data,
 * and wrong for anything personal: a farmer who revokes access and then sees a
 * five-minute-old "still active" list has been told something false about their
 * own rights. "public" would also permit an intermediary cache to hold personal
 * consent records. Both are unacceptable here, so these routes opt out.
 */
function noStore(_req, res, next) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
}

// ── Discovery ─────────────────────────────────────────────────────────────────

router.get("/", (req, res) => {
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
    },
  });
});

router.get("/openapi.json", (req, res) => {
  res.json(OPENAPI_SPEC(`${req.protocol}://${req.get("host")}`));
});

router.get("/docs", (req, res) => {
  res.type("html").send(renderDocs(`${req.protocol}://${req.get("host")}`));
});

// ── Surveillance ──────────────────────────────────────────────────────────────

router.get("/surveillance/states", (_req, res) => {
  res.json(serialiseStates());
});

router.get("/surveillance/districts", (req, res) => {
  const code = String(req.query.state ?? "").toUpperCase();
  if (!code) {
    return res.status(400).json({
      error: "missing_parameter",
      message: "Query parameter 'state' is required, e.g. ?state=PB",
    });
  }

  const payload = serialiseDistricts(code);
  if (!payload) {
    return res.status(404).json({
      error: "unknown_state",
      message: `No state with code '${code}'. Call /v1/surveillance/states for valid codes.`,
    });
  }

  res.json(payload);
});

router.get("/surveillance/alerts", (req, res) => {
  const code = req.query.state
    ? String(req.query.state).toUpperCase()
    : undefined;
  res.json(serialiseAlerts(code));
});

// ── Model exchange ────────────────────────────────────────────────────────────

router.get("/models", (_req, res) => {
  res.json(serialiseRegistry());
});

router.get("/models/:id", (req, res) => {
  const model = MODEL_REGISTRY.find((m) => m.id === req.params.id);
  if (!model) {
    return res.status(404).json({
      error: "unknown_model",
      message: `No model with id '${req.params.id}'. Call /v1/models for the registry.`,
    });
  }
  res.json(serialiseModel(model));
});

// -- Knowledge corpus ---------------------------------------------------------

router.get("/knowledge", (_req, res) => {
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

router.get("/knowledge/search", (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (!q) {
    return res.status(400).json({
      error: "missing_parameter",
      message: "Query parameter 'q' is required, e.g. ?q=yellow rust wheat",
    });
  }

  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const results = retrieve(q, { limit });

  res.json({
    schema: "agri-knowledge/v1",
    query: q,
    count: results.length,
    // Surfacing the matched terms is the point: a consumer can see why a
    // passage was retrieved rather than trusting an opaque similarity score.
    results,
  });
});

// -- Grounded advisory --------------------------------------------------------

router.post("/advisory", async (req, res) => {
  const question = String(req.body?.question ?? "").trim();
  if (!question) {
    return res.status(400).json({
      error: "missing_parameter",
      message: 'Body must contain {"question": "..."}',
    });
  }

  try {
    const result = await answerGrounded(question, {
      limit: Math.min(Number(req.body?.limit) || 5, 10),
    });
    res.json({ schema: "agri-advisory/v1", ...result });
  } catch (err) {
    console.error("[v1/advisory]", err);
    res.status(err.status || 500).json({
      error: "advisory_failed",
      message: err.message,
    });
  }
});

// -- Consent and data rights --------------------------------------------------
// Seeded on first use so the consent screen has a realistic history to show.

seedDemo();

router.get("/consent/vocabulary", noStore, (_req, res) => {
  res.json({
    schema: CONSENT_SCHEMA,
    profile: "DEPA-aligned",
    // Purposes are a closed list. Free-text purpose lets a consumer stay
    // technically within a grant while doing something the farmer never agreed
    // to, so the vocabulary is published and fixed.
    purposes: Object.entries(PURPOSES).map(([code, p]) => ({ code, ...p })),
    dataTypes: Object.entries(DATA_TYPES).map(([code, d]) => ({ code, ...d })),
  });
});

router.get("/consent", noStore, (req, res) => {
  const principal = String(req.query.principal ?? DEMO_PRINCIPAL.id);
  res.json({
    schema: CONSENT_SCHEMA,
    principal,
    stats: CONSENT_STATS(),
    consents: listConsents(principal),
  });
});

router.post("/consent", noStore, (req, res) => {
  try {
    const artefact = createConsent({
      principal: req.body?.principal ?? DEMO_PRINCIPAL,
      consumer: req.body?.consumer,
      purposeCode: req.body?.purposeCode,
      dataTypes: req.body?.dataTypes ?? [],
      durationDays: Number(req.body?.durationDays) || 90,
    });
    res.status(201).json(artefact);
  } catch (err) {
    res.status(err.status || 400).json({
      error: "consent_invalid",
      message: err.message,
    });
  }
});

router.post("/consent/:id/revoke", noStore, (req, res) => {
  const artefact = revokeConsent(
    req.params.id,
    req.body?.reason || "Revoked by the farmer",
  );
  if (!artefact) {
    return res.status(404).json({
      error: "unknown_consent",
      message: `No consent artefact with id '${req.params.id}'`,
    });
  }
  res.json(artefact);
});

router.get("/consent/:id/audit", noStore, (req, res) => {
  if (!getConsent(req.params.id)) {
    return res.status(404).json({
      error: "unknown_consent",
      message: `No consent artefact with id '${req.params.id}'`,
    });
  }
  res.json({
    schema: CONSENT_SCHEMA,
    consentId: req.params.id,
    entries: auditTrail(req.params.id),
  });
});

router.get("/consent/audit", noStore, (_req, res) => {
  res.json({ schema: CONSENT_SCHEMA, entries: auditTrail() });
});

// -- Consent-gated data read --------------------------------------------------

/**
 * The endpoint that proves consent is enforced rather than merely recorded.
 * Revoke a consent, call this again with the same artefact, and it returns 403
 * with the reason. Nothing else in the system can bypass this check.
 */
router.post("/data/read", noStore, (req, res) => {
  const { consentId, consumerId, purposeCode, dataTypes } = req.body ?? {};

  if (!consentId) {
    return res.status(400).json({
      error: "missing_parameter",
      message: 'Body must contain {"consentId": "..."}',
    });
  }

  const decision = authorise({ consentId, consumerId, purposeCode, dataTypes });

  if (!decision.allowed) {
    return res.status(403).json({
      error: "consent_denied",
      message: decision.reason,
      consentId,
      // The farmer's decision is the authority here, and the consumer is told
      // exactly that rather than being left to guess at a generic 403.
      authority: "data principal",
    });
  }

  const artefact = decision.artefact;
  const granted = dataTypes ?? artefact.dataTypes;

  // Representative payload shaped by what the artefact actually permits.
  const payload = {};
  if (granted.includes("identity.anonymous_id")) payload.anonymous_id = "anon-7f3c91";
  if (granted.includes("identity.name")) payload.name = artefact.dataPrincipal.name;
  if (granted.includes("location.district")) payload.district = artefact.dataPrincipal.district;
  if (granted.includes("location.precise")) payload.coordinates = { lat: 30.901, lon: 75.857 };
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
    payload.advisories = [{ date: "2026-08-15", topic: "Yellow rust spray window" }];
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

// -- Field boundaries ---------------------------------------------------------

router.get("/fields", noStore, (req, res) => {
  const owner = req.query.owner ? String(req.query.owner) : undefined;

  // GeoJSON on request: every GIS tool, Earth Engine included, reads it
  // directly, with no conversion step on the consumer's side.
  if (String(req.query.format).toLowerCase() === "geojson") {
    return res.json(asFeatureCollection(owner));
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

router.post("/fields", noStore, (req, res) => {
  try {
    const field = createField({
      name: req.body?.name,
      ring: req.body?.ring,
      crop: req.body?.crop,
      sownOn: req.body?.sownOn,
      owner: req.body?.owner,
    });
    res.status(201).json(field);
  } catch (err) {
    res.status(err.status || 400).json({
      error: "invalid_field",
      message: err.message,
    });
  }
});

router.get("/fields/:id/vegetation", noStore, (req, res) => {
  const data = fieldVegetation(req.params.id);
  if (!data) {
    return res.status(404).json({
      error: "unknown_field",
      message: `No field with id '${req.params.id}'`,
    });
  }
  res.json(data);
});

router.delete("/fields/:id", noStore, (req, res) => {
  if (!getField(req.params.id)) {
    return res.status(404).json({
      error: "unknown_field",
      message: `No field with id '${req.params.id}'`,
    });
  }
  deleteField(req.params.id);
  res.json({ deleted: req.params.id });
});

export default router;
