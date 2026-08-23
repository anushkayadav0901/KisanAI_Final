# PRD — Kisan AI
**Build with AI: Code for Communities** · Google Cloud × GDG India · Food Security Track

---

## 1. The Problem

Small and marginal farmers across India lack access to data-driven agricultural guidance. Relying on traditional methods instead of satellite data, soil health analytics, and climate forecasting leads to crop failure and threatens food security. The absence of shared digital infrastructure also blocks cross-state collaboration on climate-resilient farming.

## 2. The Challenge

Build an interoperable digital agriculture network that delivers **real-time, localised agro-advisories using AI**. It must offer regenerative crop recommendations based on satellite data, soil health, and weather forecasting, plus a diagnostic tool for crop diseases — designed as a **scalable digital public good** enabling Indian states to share agricultural data models and strengthen cooperation on sustainable food production.

---

## 3. What We're Building

A two-sided network — farmers on one side, state agriculture departments on the other:

| Side | What it does |
|---|---|
| **Farmer** | Photo-based crop disease diagnosis, voice-first advisory in 20 Indian languages, field boundary drawing, mandi prices, regenerative farming guidance — works offline |
| **State** | Live district-level crop surveillance across 29 states, escalation queue, cross-state model exchange registry |
| **The bridge** | Every farmer diagnosis is anonymised, aggregated to district level, and published over an open `/v1` API (24 routes, CC-BY 4.0). No privileged path — the dashboard reads what anyone can read |

**Core principle:** retrieval-grounded generation. The advisory layer cites its sources or refuses to answer before any model call. A wrong crop advisory costs a farmer a season.

---

## 4. Build Requirements → Our Status

| Requirement | Status |
|---|---|
| Functioning end-to-end flow | ✅ Diagnosis → advisory → surveillance → model exchange, all wired live |
| Mandatory Google AI integration | ✅ Gemini 2.0 Flash (vision diagnosis), Gemini Live (speech-to-speech consult), Groq Whisper fallback; local LLaVA via Ollama as declared local-first vision |
| Real or realistic data | ✅ Real districts/agro-zones/crop-pest data; simulated metrics honestly labelled with stable API schemas |
| Built for India | ✅ All 29 states, 513 real districts, 15 NARP agro-climatic zones, 20 languages |
| Multilingual / voice | ✅ Voice-first home entry, Gemini Live spoken consults, 20-language support |

## 5. Submission Checklist

- [ ] Source code — public GitHub repo ✅ (`anushkayadav0901/KisanAI_Final`)
- [ ] Demo video (3–5 min) — end-to-end walkthrough — **TODO**
- [ ] Pitch deck (10–12 slides) — problem, solution, AI approach, users, deployability, India scale — **TODO**
- [ ] Brief description (2–3 lines) — **TODO**
- [ ] Deployed link — **TODO** (frontend is Vercel-ready; backend needs Cloud Run/Fly)

## 6. Evaluation Criteria → How We Score

| Weight | Criterion | Our answer |
|---|---|---|
| 25% | AI/Technical execution | Gemini vision + Live voice doing core work; BM25-grounded generation that refuses without sources; explainability chain; YOLO detection |
| 20% | Problem-solution fit | Direct hit: diagnosis + advisories + interoperable DPG network, per problem statement |
| 20% | Depth & reach across India | 29 states day one; open API means any state/department/researcher plugs in without us |
| 20% | Deployability & scalability | No keys needed for most features; free keyless tiles; Firestore/Earth Engine swap-in designed; pilot = one state publishing one model |
| 15% | Impact potential | 146M+ farm households; every diagnosis strengthens the national early-warning signal |

## 7. Timeline

| Date | Milestone |
|---|---|
| 11 Aug 2026 | Launch, registration opens |
| 11–30 Sep 2026 | Registrations, team formation, GDG skilling sprints |
| 11–30 Sep 2026 | **Build & submit deadline** |
| TBA | Evaluations → top 20 shortlist |
| Oct 2026 | In-person finale & winners |

## 8. Rules We Must Hold

1. Google AI integration is mandatory — we lead with it (Gemini vision, Live audio)
2. Built during the hackathon window — original commits Aug 2026 onward ✓
3. Original code / licensed OSS cited — hand-written BM25, cartogram, API console; cite Ultralytics YOLO, Leaflet, React ecosystem
4. Cross-border applicability — architecture is country-agnostic: swap the state grid, corpus, and language list
5. Respectful, inclusive conduct

---

*Working repo: `github.com/anushkayadav0901/KisanAI_Final` · Run everything with `./start.sh`*
