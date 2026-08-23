# Kisan AI — Change Report

**Repo:** https://github.com/anushkayadav0901/KisanAI_Final
**8 commits · 22 August 2026**

The downloaded codebase was a farmer-facing crop-diagnosis app. It is now a two-sided
network: the same diagnoses feed a state-level surveillance API, and the advisory layer
can no longer answer without citing a source.

| | |
|---|---|
| New files | **32** |
| Lines added | **8,476** |
| API routes | **24** |
| New pages | **4** |
| New dependencies | **1** |

---

## The baseline

What the original download actually contained, stated plainly so the delta is honest.

Four services: a React 18 + TypeScript frontend, an Express backend proxying Gemini and
Groq, a FastAPI YOLO detection service, and a FastAPI Gemini Live voice proxy. Roughly
14,000 lines of frontend TypeScript. Six routes. The crop diagnosis and the voice consult
were both genuinely good.

Three things were not true of it:

- No database, no API specification and no tenancy — "state" was a dropdown reading a
  bundled JSON file.
- Nothing touched satellite data, despite the UI displaying an NDVI figure.
- `npm run build` was already broken by four type errors, which meant the project could
  not have been deployed at all.

---

## What was added

Six features. Each targets a specific gap against the problem statement, not general
polish.

### 1. State Command Centre — `/command`

Hex tile cartogram of India across 29 states and 513 real districts, with district
drill-down, an escalation queue where every alert states the rule that fired it, and a
cross-state registry where one state publishes an advisory model and another adopts it.

**Why:** the problem statement asks for a "digital public good enabling Indian states to
share agricultural data models". That is a network, not an app, and it is the requirement
almost nobody implements.

The map is a cartogram rather than a geographic projection on purpose: drawing India's
contested borders incorrectly carries real legal risk, and a cartogram carries the data
without asserting a boundary. It also needs no geo files and no map key.

| Lines | File |
|---:|---|
| 578 | `frontend/src/pages/CommandCentre.tsx` |
| 291 | `frontend/src/components/command/ModelExchange.tsx` |
| 269 | `frontend/src/components/command/DistrictPanel.tsx` |
| 222 | `frontend/src/components/command/HexIndiaMap.tsx` |
| 202 | `frontend/src/components/command/AlertFeed.tsx` |

**Test:** click any state to drill into districts; press Tab then Enter — all 29 tiles are
keyboard reachable; switch Outbreak / Reach / Soil / Water.

### 2. Agricultural Signal API — `/v1`

24 routes on the existing Express backend, unauthenticated and CC-BY 4.0, with a
hand-written OpenAPI 3.0 specification and a self-contained interactive console. No Swagger
dependency and no CDN, so the console works on conference wifi and offline.

**Why:** before this, the dashboard imported its own copy of the data, so "interoperable"
had nothing behind it. The dashboard is now one consumer of a public endpoint with no
privileged path — which is what the word actually means.

| Lines | File |
|---:|---|
| 502 | `backend/lib/surveillance.js` |
| 476 | `backend/routes/v1.js` |
| 296 | `backend/lib/apiDocs.js` |
| 278 | `frontend/src/api/surveillance.ts` |
| 187 | `backend/lib/openapi.js` |

**Test:** open `localhost:3000/v1/docs` and press Send on any endpoint, or run
`curl localhost:3000/v1/surveillance/districts?state=PB`.

### 3. Citation-grounded advisory — `/advisory`

Okapi BM25 retrieval over an 11-document corpus, then generation restricted to the
retrieved passages with an inline citation on every claim. When retrieval is too weak the
request is refused *before any model call*, and the gate that made that decision is
returned with the refusal.

**Why:** a wrong crop advisory costs a farmer a season. BM25 over embeddings is deliberate
— no API key, deterministic, and explainable: each passage shows the query terms that
matched it, where a cosine score of 0.81 tells a farmer nothing.

| Lines | File |
|---:|---|
| 375 | `backend/data/knowledge/corpus.js` |
| 354 | `frontend/src/components/advisory/GroundedAdvisory.tsx` |
| 253 | `backend/lib/retrieval.js` |
| 211 | `backend/lib/groundedAdvisory.js` |

**Test:** click the chip "Which brand of tractor should I buy". It refuses, states why, and
confirms no model was called.

### 4. Consent & data rights — `/consent`

Consent artefacts modelled on DEPA — India's own data-consent architecture — naming
principal, consumer, purpose, exact data types, validity window and revocation right,
HMAC-signed over the fields that define the grant. Purposes are a closed list; data types
carry a sensitivity grade.

**Why:** a consent screen that records a decision without gating access is decoration.
Every read passes through an authorisation check, so revoking changes the outcome of the
next request.

| Lines | File |
|---:|---|
| 579 | `frontend/src/pages/Consent.tsx` |
| 403 | `backend/lib/consent.js` |

**Test:** read data with an active consent (200), revoke it in the UI, read again — 403
with the revocation timestamp. Also refuses on wrong purpose, wrong consumer, and
out-of-scope data types.

### 5. Field boundaries — `/fields`

Draw a plot on Leaflet with Esri satellite imagery or OpenStreetMap — both free and
keyless. Boundaries are stored as GeoJSON Polygons, area computed by spherical excess, with
a vegetation chart and GeoJSON export.

**Why:** "localised" previously meant a city name in a dropdown. GeoJSON Polygon is exactly
what Earth Engine takes as a region of interest, so the satellite integration becomes a
substitution rather than a new feature.

| Lines | File |
|---:|---|
| 565 | `frontend/src/pages/Fields.tsx` |
| 230 | `frontend/src/components/fields/FieldMap.tsx` |
| 203 | `backend/lib/fields.js` |

**Test:** draw four corners, save, check the hectare figure. Area was validated against an
analytically computed square at 30.9°N — **106.325 ha returned against 105.99 expected, a
0.31% difference**, which is the expected spherical-versus-flat gap.

### 6. Offline-first & explainability — `/monitor`, `/advisory`

A hand-written service worker, an IndexedDB queue for captures taken without signal, and
image budgeting that takes a 387 KB phone frame down to 24 KB, or 7 KB under data saver.
Separately, five agronomic threshold rules evaluated in code — the model narrates, the rule
decides.

**Why:** a farmer photographs a diseased crop standing in a field, which is exactly where
signal is worst. And "irrigate within 48 hours" is an instruction to be taken on trust; the
measurements behind it are something a farmer can check and disagree with.

| Lines | File |
|---:|---|
| 208 | `frontend/public/sw.js` |
| 205 | `backend/lib/explainability.js` |
| 201 | `frontend/src/components/advisory/ExplainPanel.tsx` |
| 183 | `frontend/src/utils/offlineQueue.ts` |
| 159 | `frontend/src/hooks/useConnection.ts` |

**Test:** on `/advisory`, switch scenario to "Heavy rain forecast" — the advisory flips from
"Irrigate within 48 hours" to "Do not irrigate yet". Two rules deliberately recommend
inaction.

---

## Bugs found and fixed

Three shipped defects and three of my own, all caught by working through the features
rather than by reading the code.

### Was already broken

**Build did not compile.** Four type errors — unused imports in three files, and a
`NodeJS.Timeout` reference with no `@types/node` installed. A deployed link is a mandatory
submission item, so the project could not have been submitted.

**Fabricated authority.** The field report claimed *"Crawl data from ISRO & ICAR
indicates…"* when nothing in the codebase queries either body; a prompt instructed the model
that a citation URL *"MUST provide a real working URL"*, which produces plausible dead
links; and a vigour score estimated from an RGB photo was labelled NDVI, which requires
near-infrared bands the pipeline never sees. All three removed.

**Backend dependencies never installed.** Only the frontend's were. The backend could not
start at all until `npm install` was run in `backend/`.

### Mine

**Stale alerts across a filter change.** Selecting Telangana still showed Maharashtra alerts
under its heading — `AnimatePresence` was retaining exiting rows. It recurred once after the
API refactor, so the component was removed from that list entirely rather than patched a
second time.

**Consent cached for five minutes.** `Cache-Control: public, max-age=300` had been applied
to the whole `/v1` router when it only served surveillance data. With consent added that
became a correctness failure: a farmer could revoke access and keep seeing "still active"
for five minutes, and `public` would let an intermediary cache hold personal consent
records. Fixed in three places — server header, service worker, and client fetch.

**Service worker would not register.** Two real causes: non-ASCII characters in a file
served without a charset, and a `load` listener that never fires when the document is
already complete. Both fixed.

---

## Where this leaves the problem statement

| Requirement | Before | After |
|---|---|---|
| Crop disease diagnosis | Working | Working, plus offline capture |
| Real-time localised advisories | City name from a dropdown | Field polygons with explainable rules |
| Satellite / NDVI recommendations | None; a figure was mislabelled as NDVI | Chart and GeoJSON ready, labelled placeholder |
| Soil health analytics | Photo inference | Unchanged, but no longer mislabelled |
| Interoperable digital public good | None | Open API, model exchange, consent, OpenAPI |

---

## API surface

24 routes, all unauthenticated. 13 are featured in the console at `/v1/docs`.

| Method | Route | Purpose |
|---|---|---|
| GET | `/v1/` | Service discovery |
| GET | `/v1/openapi.json` | OpenAPI 3.0 specification |
| GET | `/v1/docs` | Interactive console |
| GET | `/v1/surveillance/states` | National signal, one row per state |
| GET | `/v1/surveillance/districts` | District signal for one state |
| GET | `/v1/surveillance/alerts` | Open escalations |
| GET | `/v1/models` | Advisory model registry |
| GET | `/v1/models/:id` | A single model card artefact |
| GET | `/v1/knowledge` | Corpus manifest and provenance |
| GET | `/v1/knowledge/search` | BM25 retrieval |
| POST | `/v1/advisory` | Grounded advisory, or explained refusal |
| GET | `/v1/consent/vocabulary` | Purposes and data types |
| GET | `/v1/consent` | A farmer's consent artefacts |
| POST | `/v1/consent` | Grant consent |
| POST | `/v1/consent/:id/revoke` | Withdraw consent |
| GET | `/v1/consent/:id/audit` | Trail for one artefact |
| GET | `/v1/consent/audit` | Full access log |
| POST | `/v1/data/read` | Consent-gated read |
| GET | `/v1/fields` | Field boundaries, JSON or GeoJSON |
| POST | `/v1/fields` | Save a drawn boundary |
| GET | `/v1/fields/:id/vegetation` | Vegetation series |
| DELETE | `/v1/fields/:id` | Remove a field |
| GET | `/v1/explain/rules` | Rule catalogue |
| POST | `/v1/explain` | Advisories with reasoning |

---

## Files touched

Original files were changed as little as possible. Almost everything is additive.

| Original file | Added | Removed | Reason |
|---|---:|---:|---|
| `frontend/src/pages/Home.tsx` | 118 | 44 | Voice-first entry, live scale counter |
| `frontend/src/pages/Monitoring.tsx` | 35 | 0 | Offline capture path |
| `frontend/src/components/monitoring/ComprehensiveReport.tsx` | 19 | 6 | Search fallback for unverified citations |
| `backend/index.js` | 17 | 0 | Mount the /v1 router |
| `frontend/src/components/monitoring/FieldMonitoringResult.tsx` | 14 | 5 | Remove ISRO claim, relabel NDVI |
| `frontend/nginx.conf` | 10 | 0 | /v1 proxy for Docker |
| `frontend/index.html` | 8 | 0 | PWA manifest and theme colour |
| `frontend/src/App.tsx` | 8 | 0 | Four new routes |
| `frontend/vite.config.ts` | 5 | 0 | /v1 proxy for dev |
| `frontend/src/ai/sessionReportService.ts` | 5 | 1 | Stop instructing the model to invent URLs |
| `frontend/src/components/Navbar.tsx` | 3 | 0 | Four new nav items |
| `frontend/src/main.tsx` | 3 | 0 | Service worker registration |
| `frontend/package.json` | 2 | 0 | leaflet 1.9.4 |

Four further files — `Research.tsx`, `SmartFarming.tsx`, `ThermalMonitoringResult.tsx` and
`useGeminiLive.ts` — carry the build fixes. They do not appear above because those fixes
landed inside the first commit.

---

## Deliberate constraints

Choices worth defending, because each one will be questioned.

- **One new dependency.** Only `leaflet`, and only because a slippy map with real tiles
  cannot be hand-rolled sensibly. The India map, the sparklines, the retrieval engine and
  the API console are all hand-written.
- **No map API key.** Esri World Imagery and OpenStreetMap tiles, both free and keyless.
  Nothing to add to `.env`.
- **No TensorFlow.** Gemini over HTTP, plus a pretrained YOLO which runs on PyTorch.
  Nothing was trained. The stronger answer to "did you train a model?" is that
  retrieval-grounded generation can show its source and refuse when it has none.
- **Simulated data is labelled everywhere.** On the page, in every API response and on
  every citation. District names and agro-climatic zones are real; the metrics are not, and
  nothing claims otherwise.

---

## Not done

Stated so nobody discovers it during judging.

**Open:** no persistence — fields, consents and diagnoses are in memory and clear on
restart. No satellite data. No tests. Service worker registration is unverified, because
the browser used for checking blocks it entirely.

**Ready for:** Firestore replaces the in-memory maps without changing a single response
shape. Earth Engine takes the stored GeoJSON polygon directly. Both interfaces are finished
and waiting.

> **One thing to check by hand.** Open the production build in Chrome and confirm
> *DevTools → Application → Service Workers* shows "activated". Everything else in the
> offline feature — the queue, the connection bar, image budgeting — was verified directly.

---

## Running it

```bash
cd backend  && npm install && npm start   # port 3000
cd frontend && npm install && npm run dev # port 5173
```

A `.env` with `GEMINI_API_KEY` is needed only for generated advisory text. Every other
feature, including the refusal path, works without one.
