/**
 * lib/weather.js — shared OpenWeather fetch + normalisation helper
 *
 * The two weather routes (by-city and by-coords) previously duplicated
 * ~40 lines of identical fetch + shape logic. This module extracts it.
 */

import { WEATHER_API_KEY } from "../config.js";

const OWM_BASE = "https://api.openweathermap.org/data/2.5/weather";

// ── Fetch ─────────────────────────────────────────────────────────────────────

/**
 * Fetch current weather from OpenWeatherMap and return a normalised object.
 *
 * @param {string|URLSearchParams} queryParams - Pre-built query string params
 * @returns {Promise<NormalisedWeather>}
 * @throws  When the API key is missing or OWM returns a non-200 cod.
 */
export async function fetchWeather(queryParams) {
  if (!WEATHER_API_KEY) {
    throw Object.assign(new Error("WEATHER_API_KEY not configured"), { status: 500 });
  }

  const url = `${OWM_BASE}?${queryParams}&units=metric&appid=${WEATHER_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.cod !== 200) {
    throw Object.assign(
      new Error(data.message || "Weather API error"),
      { status: 400 }
    );
  }

  return normalise(data);
}

// ── Normalisation ─────────────────────────────────────────────────────────────

/**
 * Round all numeric fields and enforce a consistent shape.
 * Kept here so both routes always return identical bodies.
 */
function normalise(data) {
  return {
    coord: data.coord,
    weather: data.weather,
    main: {
      temp:       Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      temp_min:   Math.round(data.main.temp_min),
      temp_max:   Math.round(data.main.temp_max),
      pressure:   Math.round(data.main.pressure),
      humidity:   Math.round(data.main.humidity),
    },
    wind: data.wind
      ? {
          speed: Math.round(data.wind.speed),
          deg:   Math.round(data.wind.deg ?? 0),
          ...(data.wind.gust !== undefined && { gust: Math.round(data.wind.gust) }),
        }
      : { speed: 0, deg: 0 },
    clouds:     { all: Math.round(data.clouds?.all ?? 0) },
    visibility: Math.round(data.visibility || 0),
    name: data.name,
  };
}
