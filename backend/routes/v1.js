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
import { renderDocs } from "../lib/apiDocs.js";
import { OPENAPI_SPEC } from "../lib/openapi.js";

const router = Router();

// Open data: explicitly cacheable and publicly readable.
router.use((_req, res, next) => {
  res.set("Cache-Control", "public, max-age=300");
  res.set("X-Data-Licence", "CC-BY-4.0");
  next();
});

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

export default router;
