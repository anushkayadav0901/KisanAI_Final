/**
 * tests/critical.test.ts — the few tests that guard load-bearing behaviour.
 *
 * Deliberately small. These are not coverage theatre; each one protects a
 * failure that would matter in the field:
 *
 *  1. The advisory refusal gate      — a wrong crop advisory costs a season
 *  2. Consent enforcement on revoke  — consent is enforced, not recorded
 *  3. Field polygon area             — GeoJSON out is what Earth Engine takes
 *  4. Surveillance feed shape        — the stable public contract of /v1
 *  5. Ollama JSON parsing            — no fabricated output may enter the pipeline
 *
 * Run: npm test   (node:test + tsx, no extra framework)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { retrieveWithAssessment, CORPUS_STATS } from "../lib/groundedAdvisory.js";
import { createConsent, revokeConsent, authorise } from "../lib/consent.js";
import { polygonAreaHectares, createField } from "../lib/fields.js";
import { NATIONAL_SIGNAL, serialiseStates } from "../lib/surveillance.js";
import { parseLooseJson } from "../lib/ollama.js";

// ── 1. Grounding gate ─────────────────────────────────────────────────────────

describe("advisory grounding gate", () => {
  it("grounds an in-corpus question", () => {
    const { assessment } = retrieveWithAssessment(
      "yellow stripes and powdery pustules on wheat leaves",
    );
    assert.equal(assessment.grounded, true);
  });

  it("refuses an off-domain question BEFORE any model call", () => {
    const { assessment } = retrieveWithAssessment(
      "how do I fix my laptop keyboard",
    );
    assert.equal(assessment.grounded, false);
  });

  it("has a real corpus behind the gate", () => {
    assert.ok(CORPUS_STATS.documents > 0);
    assert.ok(CORPUS_STATS.passages >= CORPUS_STATS.documents);
  });
});

// ── 2. Consent enforcement ────────────────────────────────────────────────────

describe("consent is enforced, not recorded", () => {
  const consumer = { id: "test-dept", name: "Test Dept" };
  const read = (consentId: string) =>
    authorise({
      consentId,
      consumerId: "test-dept",
      purposeCode: "OUTBREAK_SURVEILLANCE",
      dataTypes: ["diagnosis.result"],
    });

  it("allows a read under an active grant", () => {
    const artefact = createConsent({
      principal: {
        id: "farmer-test",
        name: "Test Farmer",
        district: "Ludhiana",
        state: "PB",
      },
      consumer,
      purposeCode: "OUTBREAK_SURVEILLANCE",
      dataTypes: ["diagnosis.result"],
      durationDays: 7,
    });
    assert.equal(read(artefact.id).allowed, true);
  });

  it("DENIES the next read after revocation — with the reason", () => {
    const artefact = createConsent({
      principal: {
        id: "farmer-test-2",
        name: "Test Farmer 2",
        district: "Ludhiana",
        state: "PB",
      },
      consumer,
      purposeCode: "OUTBREAK_SURVEILLANCE",
      dataTypes: ["diagnosis.result"],
      durationDays: 7,
    });
    revokeConsent(artefact.id, "changed my mind");

    const decision = read(artefact.id);
    assert.equal(decision.allowed, false);
    assert.match(decision.reason ?? "", /revoked/i);
  });
});

// ── 3. Field geometry ────────────────────────────────────────────────────────

describe("field polygons", () => {
  it("computes a sane area for a known quad", () => {
    // ~111m x ~111m near the equator ≈ 1.2 ha
    const ha = polygonAreaHectares([
      [0, 0],
      [0.001, 0],
      [0.001, 0.001],
      [0, 0.001],
    ]);
    assert.ok(ha > 1 && ha < 1.5, `expected ~1.2ha, got ${ha}`);
  });

  it("stores a created field as GeoJSON-ready record", () => {
    const field = createField({
      name: "North plot",
      ring: [
        [75.8, 30.9],
        [75.81, 30.9],
        [75.81, 30.91],
        [75.8, 30.91],
      ],
    });
    assert.ok(field.id.length > 0);
    // Ring is closed automatically per GeoJSON spec: 4 corners + closing point
    assert.equal(field.geometry.coordinates[0]?.length, 5);
    assert.ok(field.areaHectares > 0);
  });
});

// ── 4. Surveillance contract ─────────────────────────────────────────────────

describe("surveillance public contract", () => {
  it("covers all 29 states with required fields", () => {
    assert.equal(NATIONAL_SIGNAL.length, 29);
    for (const s of NATIONAL_SIGNAL) {
      assert.ok(s.node?.code && s.node?.name);
      assert.ok(s.metrics.outbreak >= 0 && s.metrics.outbreak <= 100);
    }
  });

  it("serialises to the documented wire shape", () => {
    const feed = serialiseStates();
    assert.equal(feed.schema, "agri-signal/v1");
    assert.ok(Array.isArray(feed.states));
  });
});

// ── 5. Local model output hygiene ────────────────────────────────────────────

describe("ollama response parsing", () => {
  it("extracts JSON from fenced model output", () => {
    const parsed = parseLooseJson<{ observation: string }>(
      '```json\n{"observation":"wheat looks healthy","alert":false}\n```',
    );
    assert.equal(parsed.observation, "wheat looks healthy");
  });

  it("THROWS on garbage — nothing fabricated enters the pipeline", () => {
    assert.throws(() => parseLooseJson("sorry I cannot help with that"));
  });
});
