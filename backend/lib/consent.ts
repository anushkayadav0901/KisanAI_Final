/**
 * lib/consent.js — farmer-held consent, modelled on DEPA
 *
 * India already has a consent architecture for personal data: DEPA, the Data
 * Empowerment and Protection Architecture, built around a machine-readable
 * consent artefact that names the principal, the consumer, the purpose, the
 * exact data types, a validity window, and a revocation right. Rather than
 * inventing a permissions model, this implements that shape for agricultural
 * data.
 *
 * The design commitment that matters: consent is ENFORCED, not recorded. Every
 * data read goes through `authorise()`, which checks status, expiry, purpose
 * and requested data types against the artefact. Revoking a consent stops the
 * next read immediately. A consent screen that logs a decision but does not
 * gate access is decoration, and a ministry reviewer will test exactly that.
 *
 * Storage is in-process for now. Swapping the two Maps below for Firestore
 * collections changes nothing else in this file or its callers.
 */

import crypto from "crypto";

export const CONSENT_SCHEMA = "agri-consent/v1";

// ── Domain types ──────────────────────────────────────────────────────────────

export type ConsentStatus = "active" | "revoked" | "expired";

export interface DataPrincipal {
  id: string;
  name: string;
  state?: string;
  district?: string;
}

export interface DataConsumer {
  id: string;
  name: string;
  type?: string;
}

export interface PurposeInfo {
  label: string;
  text: string;
  typicalConsumer: string;
}

export interface ConsentArtefact {
  schema: string;
  profile: string;
  id: string;
  version: string;
  dataPrincipal: DataPrincipal;
  dataProvider: { id: string; name: string };
  dataConsumer: DataConsumer;
  purpose: { code: PurposeCode } & PurposeInfo;
  dataTypes: string[];
  granularity: Record<string, string>;
  validity: { from: string; to: string };
  status: ConsentStatus;
  revocable: boolean;
  createdAt: string;
  revokedAt: string | null;
  accessCount: number;
  signature?: string;
  revocationReason?: string;
}

export interface AuditEntry {
  at: string;
  consentId: string;
  action: string;
  consumer: string;
  purpose?: string | null;
  dataTypes?: string[] | null;
  result: string;
  note: string;
}

export interface CreateConsentInput {
  principal: DataPrincipal;
  consumer: DataConsumer;
  purposeCode: string;
  dataTypes: string[];
  durationDays?: number;
  granularity?: Record<string, string>;
}

export interface AuthoriseInput {
  consentId: string | null;
  consumerId?: string | null;
  purposeCode?: string | null;
  dataTypes?: string[] | null;
}

export interface AuthoriseDecision {
  allowed: boolean;
  reason: string;
  artefact: ConsentArtefact | null;
}

export interface ConsentStats {
  total: number;
  active: number;
  revoked: number;
  expired: number;
  auditEntries: number;
  deniedAttempts: number;
}

// ── Vocabulary ────────────────────────────────────────────────────────────────

/**
 * Purposes are a closed list, not free text. An open purpose field lets a
 * consumer write something vague and technically stay within the grant; a
 * closed list means the farmer is agreeing to something specific.
 */
export const PURPOSES = {
  OUTBREAK_SURVEILLANCE: {
    label: "Crop outbreak surveillance",
    text: "Aggregate diagnoses into district-level pest and disease early warning.",
    typicalConsumer: "State agriculture department",
  },
  ADVISORY_DELIVERY: {
    label: "Advisory delivery",
    text: "Send crop advisories relevant to your field, crop and season.",
    typicalConsumer: "State agriculture department, KVK",
  },
  CROP_INSURANCE_CLAIM: {
    label: "Crop insurance claim",
    text: "Support assessment of a claim you have filed under PMFBY.",
    typicalConsumer: "Insurer",
  },
  SUBSIDY_ELIGIBILITY: {
    label: "Subsidy eligibility",
    text: "Verify eligibility for an input or equipment subsidy scheme.",
    typicalConsumer: "State agriculture department",
  },
  RESEARCH_AGGREGATE: {
    label: "Agricultural research",
    text: "Contribute to aggregate research. Your individual records are not published.",
    typicalConsumer: "ICAR institute, agricultural university",
  },
  MARKET_LINKAGE: {
    label: "Market linkage",
    text: "Connect your produce with buyers and FPOs.",
    typicalConsumer: "FPO, buyer platform",
  },
};

export type PurposeCode = keyof typeof PURPOSES;

/**
 * Data types carry a sensitivity grade so the consent screen can show a farmer
 * what actually matters in a request, instead of a flat list where a district
 * name looks the same as a precise GPS fix.
 */
export const DATA_TYPES = {
  "diagnosis.result": {
    label: "Crop diagnosis results",
    sensitivity: "medium",
    detail: "The disease or pest identified, and the health score.",
  },
  "diagnosis.image": {
    label: "Crop photographs",
    sensitivity: "high",
    detail: "The actual photographs you captured of your crop.",
  },
  "location.district": {
    label: "District",
    sensitivity: "low",
    detail: "Which district your farm is in. Cannot identify your field.",
  },
  "location.precise": {
    label: "Exact field location",
    sensitivity: "high",
    detail: "GPS coordinates that identify your specific field.",
  },
  "identity.anonymous_id": {
    label: "Anonymous identifier",
    sensitivity: "low",
    detail: "A random id that cannot be traced back to you.",
  },
  "identity.name": {
    label: "Your name and contact",
    sensitivity: "high",
    detail: "Directly identifies you.",
  },
  "farm.profile": {
    label: "Farm size and crops",
    sensitivity: "medium",
    detail: "Holding size, crops grown, sowing dates.",
  },
  "advisory.history": {
    label: "Advisory history",
    sensitivity: "medium",
    detail: "Which advisories you received and acted on.",
  },
};

export type DataTypeKey = keyof typeof DATA_TYPES;

// ── Store ─────────────────────────────────────────────────────────────────────

const CONSENTS = new Map<string, ConsentArtefact>();
const AUDIT: AuditEntry[] = [];

const now = (): string => new Date().toISOString();
const newId = (prefix: string): string =>
  `${prefix}-${crypto.randomBytes(6).toString("hex")}`;

function record(entry: Omit<AuditEntry, "at">): void {
  AUDIT.push({ at: now(), ...entry });
  // Keep the in-process trail bounded; a real deployment writes append-only.
  if (AUDIT.length > 2000) AUDIT.splice(0, AUDIT.length - 2000);
}

// ── Artefact ──────────────────────────────────────────────────────────────────

/**
 * Builds a consent artefact. It is signed with an HMAC so a consumer holding a
 * copy cannot quietly widen its scope — the signature covers the fields that
 * define what was actually agreed.
 */
function sign(artefact: ConsentArtefact): string {
  const material = JSON.stringify({
    id: artefact.id,
    principal: artefact.dataPrincipal.id,
    consumer: artefact.dataConsumer.id,
    purpose: artefact.purpose.code,
    dataTypes: [...artefact.dataTypes].sort(),
    validFrom: artefact.validity.from,
    validTo: artefact.validity.to,
  });
  return crypto
    .createHmac("sha256", process.env.CONSENT_SIGNING_KEY || "kisan-dev-key")
    .update(material)
    .digest("hex")
    .slice(0, 32);
}

export function createConsent({
  principal,
  consumer,
  purposeCode,
  dataTypes,
  durationDays = 90,
  granularity = {},
}: CreateConsentInput): ConsentArtefact {
  const purposeDef = PURPOSES[purposeCode as PurposeCode];
  if (!purposeDef) {
    throw Object.assign(new Error(`Unknown purpose code '${purposeCode}'`), {
      status: 400,
    });
  }

  const unknown = dataTypes.filter((t) => !DATA_TYPES[t as DataTypeKey]);
  if (unknown.length) {
    throw Object.assign(
      new Error(`Unknown data types: ${unknown.join(", ")}`),
      { status: 400 },
    );
  }

  const from = new Date();
  const to = new Date(from.getTime() + durationDays * 86400000);

  const artefact: ConsentArtefact = {
    schema: CONSENT_SCHEMA,
    profile: "DEPA-aligned consent artefact",
    id: newId("consent"),
    version: "1.0",
    dataPrincipal: principal,
    dataProvider: { id: "kisan-ai", name: "Kisan AI" },
    dataConsumer: consumer,
    purpose: { code: purposeCode as PurposeCode, ...purposeDef },
    dataTypes,
    granularity: {
      identity: dataTypes.includes("identity.name") ? "identified" : "anonymised",
      location: dataTypes.includes("location.precise") ? "precise" : "district",
      ...granularity,
    },
    validity: { from: from.toISOString(), to: to.toISOString() },
    status: "active",
    revocable: true,
    createdAt: now(),
    revokedAt: null,
    accessCount: 0,
  };

  artefact.signature = sign(artefact);
  CONSENTS.set(artefact.id, artefact);

  record({
    consentId: artefact.id,
    action: "granted",
    consumer: consumer.name,
    purpose: purposeCode,
    dataTypes,
    result: "allowed",
    note: `Consent granted for ${durationDays} days`,
  });

  return artefact;
}

export function getConsent(id: string): ConsentArtefact | null {
  return CONSENTS.get(id) ?? null;
}

export function listConsents(principalId?: string): ConsentArtefact[] {
  const all = [...CONSENTS.values()];
  const scoped = principalId
    ? all.filter((c) => c.dataPrincipal.id === principalId)
    : all;
  // Expiry is evaluated on read, so a lapsed consent never reports active.
  return scoped.map(refreshStatus).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function refreshStatus(artefact: ConsentArtefact): ConsentArtefact {
  if (artefact.status === "active" && new Date(artefact.validity.to) < new Date()) {
    artefact.status = "expired";
  }
  return artefact;
}

export function revokeConsent(
  id: string,
  reason = "Revoked by the farmer",
): ConsentArtefact | null {
  const artefact = CONSENTS.get(id);
  if (!artefact) return null;

  artefact.status = "revoked";
  artefact.revokedAt = now();
  artefact.revocationReason = reason;

  record({
    consentId: id,
    action: "revoked",
    consumer: artefact.dataConsumer.name,
    purpose: artefact.purpose.code,
    dataTypes: artefact.dataTypes,
    result: "allowed",
    note: reason,
  });

  return artefact;
}

// ── Enforcement ───────────────────────────────────────────────────────────────

/**
 * The gate every data read must pass.
 *
 * Returns { allowed, reason, artefact }. Each decision is written to the audit
 * trail, including denials — a farmer should be able to see that someone tried
 * to read their data after they revoked, not only the reads that succeeded.
 */
export function authorise({
  consentId,
  consumerId,
  purposeCode,
  dataTypes,
}: AuthoriseInput): AuthoriseDecision {
  const artefact = consentId === null ? undefined : CONSENTS.get(consentId);

  const deny = (reason: string): AuthoriseDecision => {
    record({
      consentId: consentId ?? "(none)",
      action: "access_denied",
      consumer: artefact?.dataConsumer?.name ?? consumerId ?? "unknown",
      purpose: purposeCode,
      dataTypes,
      result: "denied",
      note: reason,
    });
    return { allowed: false, reason, artefact: artefact ?? null };
  };

  if (!artefact) return deny("No consent artefact with that id");

  refreshStatus(artefact);

  if (artefact.status === "revoked") {
    return deny(
      `Consent was revoked by the farmer on ${new Date(artefact.revokedAt!).toLocaleString("en-IN")}`,
    );
  }
  if (artefact.status === "expired") {
    return deny(
      `Consent expired on ${new Date(artefact.validity.to).toLocaleDateString("en-IN")}`,
    );
  }
  if (consumerId && artefact.dataConsumer.id !== consumerId) {
    return deny("This consent was granted to a different organisation");
  }
  if (purposeCode && artefact.purpose.code !== purposeCode) {
    return deny(
      `Consent covers '${artefact.purpose.code}', not '${purposeCode}'. Purpose is binding.`,
    );
  }

  const requested = dataTypes ?? artefact.dataTypes;
  const outside = requested.filter((t) => !artefact.dataTypes.includes(t));
  if (outside.length) {
    return deny(`Consent does not cover: ${outside.join(", ")}`);
  }

  artefact.accessCount += 1;
  record({
    consentId: consentId ?? "(none)",
    action: "accessed",
    consumer: artefact.dataConsumer.name,
    purpose: purposeCode,
    dataTypes: requested,
    result: "allowed",
    note: `Read ${requested.length} data ${requested.length === 1 ? "type" : "types"}`,
  });

  return { allowed: true, reason: "Consent valid", artefact };
}

export function auditTrail(consentId?: string): AuditEntry[] {
  const entries = consentId
    ? AUDIT.filter((e) => e.consentId === consentId)
    : AUDIT;
  return [...entries].reverse();
}

// ── Demo seed ─────────────────────────────────────────────────────────────────

/**
 * A farmer arriving at the consent screen with nothing on it cannot tell
 * whether the feature works. This seeds one realistic history so the screen has
 * something to show, including a consent that was already revoked.
 */
export const DEMO_PRINCIPAL: DataPrincipal = {
  id: "farmer-demo-001",
  name: "Demo Farmer",
  state: "PB",
  district: "Ludhiana",
};

export function seedDemo(): void {
  if (CONSENTS.size > 0) return;

  createConsent({
    principal: DEMO_PRINCIPAL,
    consumer: {
      id: "pb-agri-dept",
      name: "Punjab Department of Agriculture",
      type: "government",
    },
    purposeCode: "OUTBREAK_SURVEILLANCE",
    dataTypes: ["diagnosis.result", "location.district", "identity.anonymous_id"],
    durationDays: 180,
  });

  createConsent({
    principal: DEMO_PRINCIPAL,
    consumer: { id: "kvk-ludhiana", name: "KVK Ludhiana", type: "extension" },
    purposeCode: "ADVISORY_DELIVERY",
    dataTypes: ["diagnosis.result", "farm.profile", "location.district"],
    durationDays: 365,
  });

  const revoked = createConsent({
    principal: DEMO_PRINCIPAL,
    consumer: {
      id: "agri-input-co",
      name: "AgriInput Marketing Pvt Ltd",
      type: "commercial",
    },
    purposeCode: "MARKET_LINKAGE",
    dataTypes: ["identity.name", "location.precise", "farm.profile"],
    durationDays: 90,
  });
  revokeConsent(revoked.id, "Farmer withdrew consent for commercial marketing use");

  // A denied read after revocation, so the trail shows enforcement working.
  authorise({
    consentId: revoked.id,
    consumerId: "agri-input-co",
    purposeCode: "MARKET_LINKAGE",
    dataTypes: ["identity.name"],
  });
}

export const CONSENT_STATS = (): ConsentStats => {
  const all = listConsents();
  return {
    total: all.length,
    active: all.filter((c) => c.status === "active").length,
    revoked: all.filter((c) => c.status === "revoked").length,
    expired: all.filter((c) => c.status === "expired").length,
    auditEntries: AUDIT.length,
    deniedAttempts: AUDIT.filter((e) => e.result === "denied").length,
  };
};
