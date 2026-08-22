/**
 * config.js — centralised environment configuration
 *
 * All process.env access lives here. Every other module imports
 * from this file, never from process.env directly.
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend/ first, then fall back to project root
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") }); // root .env fills in any missing vars

// ── Exports ───────────────────────────────────────────────────────────────────

export const PORT = process.env.PORT || 3000;

export const GROQ_API_KEY = process.env.GROQ_API_KEY;
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Gemini REST base URL (model pinned here so it's easy to upgrade)
export const GEMINI_REST_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Gemini API base (for dynamic model selection)
export const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Groq REST base URL
export const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_TRANSCRIBE_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";

// ── Startup validation ────────────────────────────────────────────────────────

const REQUIRED_KEYS = {
  GROQ_API_KEY,
  GEMINI_API_KEY,
  WEATHER_API_KEY,
};

const missing = Object.entries(REQUIRED_KEYS)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  console.warn(
    `⚠  Missing env vars: ${missing.join(", ")} — some endpoints will return 500.`,
  );
}

export default {
  PORT,
  GROQ_API_KEY,
  GEMINI_API_KEY,
  WEATHER_API_KEY,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  GEMINI_REST_URL,
  GEMINI_API_BASE,
  GROQ_CHAT_URL,
  GROQ_TRANSCRIBE_URL,
};
