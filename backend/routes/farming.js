/**
 * routes/farming.js — /api/farming/* REST endpoints
 *
 * Endpoints:
 *   POST /api/farming/subsidies  — Government subsidy data (scraped + curated)
 *   POST /api/farming/videos     — Success story videos with summaries
 *   POST /api/farming/insights   — AI-generated detailed farming guide
 *   POST /api/farming/scrape     — Manual re-scrape trigger
 */

import { Router } from "express";
import {
  getSubsidies,
  manualScrape,
  getGovtSchemes,
} from "../lib/farmingScraper.js";
import { getSuccessVideos } from "../lib/farmingVideos.js";
import { generateFarmingInsights } from "../lib/farmingAi.js";
import { cacheGet, cacheSet } from "../lib/farmingCache.js";

const router = Router();

// ── Subsidies ─────────────────────────────────────────────────────────────────

router.post("/subsidies", async (req, res) => {
  try {
    const { technique, state, budget } = req.body;
    if (!technique)
      return res.status(400).json({ error: "technique is required" });

    const result = await getSubsidies(technique, state, budget);
    res.json(result);
  } catch (err) {
    console.error("[farming/subsidies]", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Success Story Videos ──────────────────────────────────────────────────────

router.post("/videos", async (req, res) => {
  try {
    const { technique } = req.body;
    if (!technique)
      return res.status(400).json({ error: "technique is required" });

    const result = await getSuccessVideos(technique);
    res.json(result);
  } catch (err) {
    console.error("[farming/videos]", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Detailed Farming Insights ─────────────────────────────────────────────────

router.post("/insights", async (req, res) => {
  try {
    const { technique, farmSize, budget } = req.body;
    if (!technique)
      return res.status(400).json({ error: "technique is required" });

    // Cache key based on all parameters
    const cacheKey = `insights:${technique}:${farmSize || "5"}:${budget || "medium"}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      return res.json({ guide: cached, cacheHit: true });
    }

    const guide = await generateFarmingInsights({
      technique,
      farmSize: farmSize || "5",
      budget: budget || "medium",
    });

    // Cache for 30 minutes
    cacheSet(cacheKey, guide, 1800);

    res.json({ guide, cacheHit: false });
  } catch (err) {
    console.error("[farming/insights]", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Government Schemes (for monitoring) ──────────────────────────────────────

router.post("/govt-schemes", async (req, res) => {
  try {
    const { cropIssue, cropName, state } = req.body;
    const result = await getGovtSchemes(cropIssue, cropName, state);
    res.json(result);
  } catch (err) {
    console.error("[farming/govt-schemes]", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Manual Re-Scrape ──────────────────────────────────────────────────────────

router.post("/scrape", async (req, res) => {
  try {
    const { technique } = req.body;
    if (!technique)
      return res.status(400).json({ error: "technique is required" });

    const result = await manualScrape(technique);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[farming/scrape]", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
