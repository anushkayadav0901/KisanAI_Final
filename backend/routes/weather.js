/**
 * routes/weather.js — /api/weather/* endpoints
 *
 *   GET /api/weather/coords?lat=&lon=   — weather by GPS coordinates
 *   GET /api/weather/:city              — weather by city name
 *
 * Both routes share the same fetch + normalise logic via lib/weather.js.
 * Note: /coords must be registered before /:city so Express doesn't
 * treat "coords" as a city name parameter.
 */

import { Router } from "express";
import { fetchWeather } from "../lib/weather.js";

const router = Router();

// GET /api/weather/coords?lat=19.07&lon=72.87
router.get("/coords", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: "lat and lon query params are required" });
    }

    const data = await fetchWeather(`lat=${lat}&lon=${lon}`);
    res.json(data);
  } catch (err) {
    console.error("[weather/coords]", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/weather/Mumbai
router.get("/:city", async (req, res) => {
  try {
    const { city } = req.params;
    const data = await fetchWeather(`q=${encodeURIComponent(city)}`);
    res.json(data);
  } catch (err) {
    console.error("[weather/city]", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
