/**
 * routes/weather.ts — /api/weather/* endpoints
 *
 *   GET /api/weather/coords?lat=&lon=   — weather by GPS coordinates
 *   GET /api/weather/:city              — weather by city name
 *
 * Both routes share the same fetch + normalise logic via lib/weather.js.
 * Note: /coords must be registered before /:city so Express doesn't
 * treat "coords" as a city name parameter.
 */

import type { Request, Response } from "express";
import { Router } from "express";
import { fetchWeather } from "../lib/weather.js";

const router = Router();

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

// GET /api/weather/coords?lat=19.07&lon=72.87
router.get("/coords", async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      res
        .status(400)
        .json({ error: "lat and lon query params are required" });
      return;
    }

    const data = await fetchWeather(`lat=${String(lat)}&lon=${String(lon)}`);
    res.json(data);
  } catch (err: unknown) {
    console.error("[weather/coords]", err);
    res.status(errStatus(err)).json({ error: errMessage(err) });
  }
});

// GET /api/weather/Mumbai
router.get("/:city", async (req: Request, res: Response): Promise<void> => {
  try {
    const city = req.params.city;
    if (!city || Array.isArray(city)) {
      res.status(400).json({ error: "city parameter is required" });
      return;
    }
    const data = await fetchWeather(`q=${encodeURIComponent(city)}`);
    res.json(data);
  } catch (err: unknown) {
    console.error("[weather/city]", err);
    res.status(errStatus(err)).json({ error: errMessage(err) });
  }
});

export default router;
