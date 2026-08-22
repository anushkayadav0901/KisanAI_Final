/**
 * lib/openapi.js — OpenAPI 3.0 specification for the Agricultural Signal API
 *
 * Served at /v1/openapi.json. Any standards-compliant tool — Postman, Swagger
 * UI, an SDK generator — can consume this and produce a working client without
 * anyone at this end being involved. That is the point of publishing it.
 */

export const OPENAPI_SPEC = (origin) => ({
  openapi: "3.0.3",
  info: {
    title: "Kisan AI — Agricultural Signal API",
    version: "1.0.0",
    description:
      "Open crop-health surveillance and cross-state advisory model exchange " +
      "for India. No authentication: this is published as a digital public " +
      "good under CC-BY 4.0.\n\n" +
      "**Data provenance.** District names and agro-climatic zones are real. " +
      "The metrics are currently simulated reference data modelling the shape " +
      "of the live feed — they are not observations from ICAR, ISRO or any " +
      "government source. The response schemas are the stable contract and do " +
      "not change when the live feed is connected.",
    license: {
      name: "CC-BY 4.0",
      url: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
  servers: [{ url: `${origin}/v1`, description: "Current deployment" }],
  tags: [
    { name: "surveillance", description: "District and state crop-health signal" },
    { name: "models", description: "Cross-state advisory model registry" },
  ],
  paths: {
    "/surveillance/states": {
      get: {
        tags: ["surveillance"],
        summary: "National signal, one row per state",
        description:
          "Every monitored state with its outbreak, reach, soil and water metrics, " +
          "plus national totals. This is the entry point for a new consumer.",
        responses: {
          200: {
            description: "National signal",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/StatesResponse" },
              },
            },
          },
        },
      },
    },
    "/surveillance/districts": {
      get: {
        tags: ["surveillance"],
        summary: "District signal for one state",
        parameters: [
          {
            name: "state",
            in: "query",
            required: true,
            schema: { type: "string", example: "PB" },
            description: "Two-letter state code from /surveillance/states",
          },
        ],
        responses: {
          200: { description: "District signal for the requested state" },
          400: { description: "The 'state' parameter was not supplied" },
          404: { description: "No state matches the supplied code" },
        },
      },
    },
    "/surveillance/alerts": {
      get: {
        tags: ["surveillance"],
        summary: "Open escalations",
        description:
          "Districts that crossed an escalation rule. Every alert carries the " +
          "rule that fired it in its `trigger` field, so a consuming system can " +
          "explain the alert to an officer rather than presenting it as opaque.",
        parameters: [
          {
            name: "state",
            in: "query",
            required: false,
            schema: { type: "string", example: "PB" },
            description: "Optional state filter; omit for the national queue",
          },
        ],
        responses: { 200: { description: "Open escalation queue" } },
      },
    },
    "/models": {
      get: {
        tags: ["models"],
        summary: "Advisory model registry",
        description:
          "Every advisory model published by a state, with its adoption and " +
          "validation record.",
        responses: { 200: { description: "The registry" } },
      },
    },
    "/models/{id}": {
      get: {
        tags: ["models"],
        summary: "A single model card artefact",
        description:
          "The artefact another state consumes in order to adopt this model.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", example: "kai.pb.wheat-yellow-rust" },
          },
        ],
        responses: {
          200: { description: "Model card" },
          404: { description: "No model matches the supplied id" },
        },
      },
    },
  },
  components: {
    schemas: {
      StatesResponse: {
        type: "object",
        properties: {
          schema: { type: "string", example: "agri-signal/v1" },
          generated: { type: "string", format: "date-time" },
          provenance: { type: "string" },
          licence: { type: "string", example: "CC-BY 4.0" },
          totals: { $ref: "#/components/schemas/NationalTotals" },
          states: {
            type: "array",
            items: { $ref: "#/components/schemas/StateSignal" },
          },
        },
      },
      NationalTotals: {
        type: "object",
        properties: {
          states: { type: "integer", example: 29 },
          districts: { type: "integer", example: 513 },
          diagnoses_30d: { type: "integer" },
          farmers_reached: { type: "integer" },
          advisories_7d: { type: "integer" },
          districts_at_risk: { type: "integer" },
          advisory_languages: { type: "integer", example: 15 },
          agro_climatic_zones: { type: "integer", example: 14 },
        },
      },
      StateSignal: {
        type: "object",
        properties: {
          code: { type: "string", example: "PB" },
          name: { type: "string", example: "Punjab" },
          agro_climatic_zone: { type: "string", example: "Trans-Gangetic Plains" },
          primary_crops: { type: "array", items: { type: "string" } },
          advisory_language: { type: "string", example: "Punjabi" },
          farm_households_lakh: { type: "number" },
          grid: {
            type: "object",
            description: "Hex cartogram position, for map rendering",
            properties: { col: { type: "integer" }, row: { type: "integer" } },
          },
          metrics: {
            type: "object",
            properties: {
              outbreak: { type: "integer" },
              reach: { type: "integer" },
              soil: { type: "integer" },
              water: { type: "integer" },
            },
          },
          severity: {
            type: "string",
            enum: ["low", "guarded", "elevated", "high", "severe"],
          },
          districts_monitored: { type: "integer" },
          districts_at_risk: { type: "integer" },
          top_threat: { type: "string", example: "Yellow Rust" },
        },
      },
    },
  },
});
