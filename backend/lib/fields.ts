/**
 * lib/fields.js — farmer field boundaries
 *
 * Until now "localised" in this app meant a city name from a dropdown. A plot
 * boundary is the unit that actually matters: two fields three kilometres apart
 * can be on different soil, different sowing dates and different irrigation,
 * and a district-level advisory is useless to both.
 *
 * A field is stored as a GeoJSON Polygon so it is portable by construction —
 * QGIS, Earth Engine, Bhuvan and any GIS pipeline read it without conversion.
 *
 * The NDVI series returned with each field is a PLACEHOLDER and is labelled as
 * such in the payload. It exists so the chart, the API shape and the frontend
 * are all finished before the satellite integration lands; connecting Earth
 * Engine replaces the contents of `ndviSeries` and nothing else.
 */

import crypto from "crypto";

export const FIELD_SCHEMA = "agri-field/v1";

// ── Domain types ──────────────────────────────────────────────────────────────

export type LatLng = [number, number];

export interface PolygonGeometry {
  type: "Polygon";
  coordinates: LatLng[][];
}

export interface NdviPoint {
  date: string;
  ndvi: number;
}

export interface FieldRecord {
  schema: string;
  id: string;
  name: string;
  owner: string;
  crop: string | null;
  sownOn: string | null;
  geometry: PolygonGeometry;
  centroid: LatLng;
  areaHectares: number;
  createdAt: string;
}

export interface CreateFieldInput {
  name?: string;
  ring: LatLng[];
  crop?: string | null;
  sownOn?: string | null;
  owner?: string;
}

export interface VegetationSource {
  status: "placeholder";
  producer: string;
  note: string;
  plannedProducer: string;
}

export interface VegetationReport {
  schema: string;
  fieldId: string;
  fieldName: string;
  areaHectares: number;
  centroid: LatLng;
  source: VegetationSource;
  cadenceDays: number;
  ndviSeries: NdviPoint[];
}

export interface FieldFeature {
  type: "Feature";
  id: string;
  geometry: PolygonGeometry;
  properties: {
    name: string;
    crop: string | null;
    sownOn: string | null;
    areaHectares: number;
    createdAt: string;
  };
}

export interface FieldFeatureCollection {
  type: "FeatureCollection";
  features: FieldFeature[];
}

const FIELDS = new Map<string, FieldRecord>();

const newId = (): string => `field-${crypto.randomBytes(5).toString("hex")}`;

// ── Geometry ──────────────────────────────────────────────────────────────────

/**
 * Area of a lat/lng ring in hectares.
 *
 * Uses the spherical excess formula rather than a planar shoelace: at Indian
 * latitudes a naive planar calculation on degrees is wrong by a large margin,
 * and a farmer checking the number against their own records would immediately
 * see it was nonsense.
 */
export function polygonAreaHectares(ring: LatLng[]): number {
  if (!ring || ring.length < 3) return 0;

  const R = 6378137; // WGS84 equatorial radius, metres
  const rad = (d: number): number => (d * Math.PI) / 180;

  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lon1, lat1] = ring[i]!;
    const [lon2, lat2] = ring[(i + 1) % ring.length]!;
    total += (rad(lon2) - rad(lon1)) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
  }

  const areaM2 = Math.abs((total * R * R) / 2);
  return Number((areaM2 / 10000).toFixed(3));
}

function centroid(ring: LatLng[]): LatLng {
  const lon = ring.reduce((a, p) => a + p[0], 0) / ring.length;
  const lat = ring.reduce((a, p) => a + p[1], 0) / ring.length;
  return [Number(lon.toFixed(6)), Number(lat.toFixed(6))];
}

// ── Placeholder vegetation series ─────────────────────────────────────────────

/**
 * Generates a plausible NDVI trajectory for a field.
 *
 * This is NOT satellite data and the payload says so. It is shaped like a real
 * Sentinel-2 series — fortnightly cadence, values rising through vegetative
 * growth and falling after senescence — so the chart, the axis scaling and the
 * frontend are all correct before Earth Engine is wired in.
 *
 * Seeded from the field id so a given field always shows the same curve.
 */
function placeholderNdvi(fieldId: string, points = 12): NdviPoint[] {
  let seed = 0;
  for (const ch of fieldId) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const peak = 0.68 + rnd() * 0.16;
  const series: NdviPoint[] = [];
  const today = Date.now();

  for (let i = points - 1; i >= 0; i--) {
    // A crop-cycle arc: low at sowing, peak mid-season, declining at maturity.
    const t = (points - 1 - i) / (points - 1);
    const arc = Math.sin(Math.PI * Math.min(t * 1.15, 1));
    const value = Math.max(0.12, Math.min(0.92, peak * arc + 0.14 + (rnd() - 0.5) * 0.06));
    series.push({
      date: new Date(today - i * 15 * 86400000).toISOString().slice(0, 10),
      ndvi: Number(value.toFixed(3)),
    });
  }
  return series;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function createField({ name, ring, crop, sownOn, owner }: CreateFieldInput): FieldRecord {
  if (!Array.isArray(ring) || ring.length < 3) {
    throw Object.assign(new Error("A field needs at least 3 boundary points"), {
      status: 400,
    });
  }

  const bad = ring.find(
    (p) =>
      !Array.isArray(p) ||
      p.length !== 2 ||
      Math.abs(p[0]) > 180 ||
      Math.abs(p[1]) > 90,
  );
  if (bad) {
    throw Object.assign(
      new Error("Boundary points must be [longitude, latitude] pairs"),
      { status: 400 },
    );
  }

  const id = newId();
  // GeoJSON rings must close: first point repeated at the end.
  const closed = [...ring, ring[0]!];

  const field: FieldRecord = {
    schema: FIELD_SCHEMA,
    id,
    name: name || "Unnamed field",
    owner: owner || "farmer-demo-001",
    crop: crop || null,
    sownOn: sownOn || null,
    geometry: { type: "Polygon", coordinates: [closed] },
    centroid: centroid(ring),
    areaHectares: polygonAreaHectares(ring),
    createdAt: new Date().toISOString(),
  };

  FIELDS.set(id, field);
  return field;
}

export function listFields(owner?: string): FieldRecord[] {
  const all = [...FIELDS.values()];
  return (owner ? all.filter((f) => f.owner === owner) : all).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getField(id: string): FieldRecord | null {
  return FIELDS.get(id) ?? null;
}

export function deleteField(id: string): boolean {
  return FIELDS.delete(id);
}

/**
 * Vegetation series for a field.
 *
 * The `source` block is the honest part: it names what produced these numbers
 * and what would replace it. A consumer can branch on `source.status` rather
 * than having to trust the values.
 */
export function fieldVegetation(id: string): VegetationReport | null {
  const field = FIELDS.get(id);
  if (!field) return null;

  return {
    schema: FIELD_SCHEMA,
    fieldId: id,
    fieldName: field.name,
    areaHectares: field.areaHectares,
    centroid: field.centroid,
    source: {
      status: "placeholder",
      producer: "Kisan AI synthetic series",
      note:
        "Not satellite data. Shaped like a Sentinel-2 fortnightly NDVI series so " +
        "the interface is complete ahead of the Earth Engine integration.",
      plannedProducer: "Sentinel-2 L2A via Google Earth Engine",
    },
    cadenceDays: 15,
    ndviSeries: placeholderNdvi(id),
  };
}

/** As GeoJSON FeatureCollection — the format every GIS tool already reads. */
export function asFeatureCollection(owner?: string): FieldFeatureCollection {
  return {
    type: "FeatureCollection",
    features: listFields(owner).map((f): FieldFeature => ({
      type: "Feature",
      id: f.id,
      geometry: f.geometry,
      properties: {
        name: f.name,
        crop: f.crop,
        sownOn: f.sownOn,
        areaHectares: f.areaHectares,
        createdAt: f.createdAt,
      },
    })),
  };
}
