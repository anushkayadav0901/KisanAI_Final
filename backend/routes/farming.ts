/**
 * routes/farming.ts — /api/farming/* REST endpoints
 *
 * Endpoints:
 *   POST /api/farming/subsidies  — Government subsidy data (scraped + curated)
 *   POST /api/farming/videos     — Success story videos with summaries
 *   POST /api/farming/insights   — AI-generated detailed farming guide
 *   POST /api/farming/scrape     — Manual re-scrape trigger
 */

import type { Request, Response } from "express";
import { Router } from "express";
import {
  getSubsidies,
  manualScrape,
  getGovtSchemes,
} from "../lib/farmingScraper.js";
import { getSuccessVideos } from "../lib/farmingVideos.js";
import { generateFarmingInsights } from "../lib/farmingAi.js";
import { cacheGet, cacheSet } from "../lib/farmingCache.js";

// ── Request body shapes ──────────────────────────────────────────────────────

interface SubsidiesBody {
  technique?: string;
  state?: string;
  budget?: string;
}

interface VideosBody {
  technique?: string;
}

interface InsightsBody {
  technique?: string;
  farmSize?: string;
  budget?: string;
}

interface GovtSchemesBody {
  cropIssue?: string;
  cropName?: string;
  state?: string;
}

interface ScrapeBody {
  technique?: string;
}

// ── Error helpers ────────────────────────────────────────────────────────────

function errStatus(err: unknown): number {
  if (typeof err === "object" && err !== null && "status" in err) {
    const status = (err as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return 500;
}

function errMessage(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

const router = Router();

// ── Subsidies ─────────────────────────────────────────────────────────────────

router.post(
  "/subsidies",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { technique, state, budget } = req.body as SubsidiesBody;
      if (!technique) {
        res.status(400).json({ error: "technique is required" });
        return;
      }

      const result = await getSubsidies(technique, state, budget);
      res.json(result);
    } catch (err: unknown) {
      console.error("[farming/subsidies]", err);
      res.status(errStatus(err)).json({ error: errMessage(err) });
    }
  },
);

// ── Success Story Videos ──────────────────────────────────────────────────────

router.post("/videos", async (req: Request, res: Response): Promise<void> => {
  try {
    const { technique } = req.body as VideosBody;
    if (!technique) {
      res.status(400).json({ error: "technique is required" });
      return;
    }

    const result = await getSuccessVideos(technique);
    res.json(result);
  } catch (err: unknown) {
    console.error("[farming/videos]", err);
    res.status(errStatus(err)).json({ error: errMessage(err) });
  }
});

// ── Detailed Farming Insights ─────────────────────────────────────────────────

router.post(
  "/insights",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { technique, farmSize, budget } = req.body as InsightsBody;
      if (!technique) {
        res.status(400).json({ error: "technique is required" });
        return;
      }

      // Cache key based on all parameters
      const cacheKey = `insights:${technique}:${farmSize || "5"}:${budget || "medium"}`;
      const cached = cacheGet(cacheKey);
      if (cached) {
        res.json({ guide: cached, cacheHit: true });
        return;
      }

      const guide = await generateFarmingInsights({
        technique,
        farmSize: farmSize || "5",
        budget: budget || "medium",
      });

      // Cache for 30 minutes
      cacheSet(cacheKey, guide, 1800);

      res.json({ guide, cacheHit: false });
    } catch (err: unknown) {
      console.error("[farming/insights]", err);
      res.status(errStatus(err)).json({ error: errMessage(err) });
    }
  },
);

// ── Government Schemes (for monitoring) ──────────────────────────────────────

router.post(
  "/govt-schemes",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { cropIssue = "", cropName = "", state = "" } = (req.body ?? {}) as Partial<GovtSchemesBody>;
      const result = await getGovtSchemes(cropIssue, cropName, state);
      res.json(result);
    } catch (err: unknown) {
      console.error("[farming/govt-schemes]", err);
      res.status(errStatus(err)).json({ error: errMessage(err) });
    }
  },
);

// ── Manual Re-Scrape ──────────────────────────────────────────────────────────

router.post("/scrape", async (req: Request, res: Response): Promise<void> => {
  try {
    const { technique } = req.body as ScrapeBody;
    if (!technique) {
      res.status(400).json({ error: "technique is required" });
      return;
    }

    const result = await manualScrape(technique);
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    console.error("[farming/scrape]", err);
    res.status(errStatus(err)).json({ error: errMessage(err) });
  }
});

export default router;
