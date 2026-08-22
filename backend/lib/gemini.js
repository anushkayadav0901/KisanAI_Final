/**
 * lib/gemini.js — shared Gemini REST API helper
 *
 * Centralises the repetitive fetch → parse → extract pipeline that
 * was previously copy-pasted across four route handlers.
 *
 * Usage:
 *   import { callGemini, extractGeminiText } from "../lib/gemini.js";
 *
 *   const text = await callGemini({ prompt, imageB64 });
 *   const result = parseGeminiJson(text);           // when expecting JSON back
 */

import { GEMINI_API_KEY, GEMINI_REST_URL, GEMINI_API_BASE } from "../config.js";

// ── Core fetch helper ─────────────────────────────────────────────────────────

/**
 * Call the Gemini generateContent REST API.
 *
 * @param {object} opts
 * @param {string}   opts.prompt              - System/user text prompt
 * @param {string}   [opts.imageB64]          - Base64-encoded JPEG/PNG (no data-URI prefix)
 * @param {string}   [opts.mimeType]          - Image MIME type (default: "image/jpeg")
 * @param {object}   [opts.generationConfig]  - Override generation settings
 * @returns {Promise<string>}                 - The raw text from Gemini's first candidate
 * @throws  Will throw if the API key is missing, the HTTP request fails,
 *          or Gemini returns an error or empty response.
 */
export async function callGemini({
  prompt,
  imageB64,
  mimeType = "image/jpeg",
  generationConfig = {},
}) {
  if (!GEMINI_API_KEY) {
    throw Object.assign(new Error("GEMINI_API_KEY not configured"), {
      status: 500,
    });
  }

  const parts = [{ text: prompt }];
  if (imageB64) {
    parts.push({ inline_data: { mime_type: mimeType, data: imageB64 } });
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 1024,
      ...generationConfig,
    },
  };

  const response = await fetch(`${GEMINI_REST_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (data.error) {
    throw Object.assign(new Error(`Gemini API error: ${data.error.message}`), {
      status: 502,
      geminiError: data.error,
    });
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw Object.assign(new Error("Gemini returned no text content"), {
      status: 502,
    });
  }

  return text;
}

// ── JSON extraction helper ────────────────────────────────────────────────────

/**
 * Strip markdown fences and extract the first JSON object from a Gemini response.
 *
 * @param {string} text - Raw text from Gemini (may contain ```json ... ```)
 * @returns {object}    - Parsed JSON object
 * @throws  SyntaxError if no valid JSON object can be extracted
 */
export function parseGeminiJson(text) {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : cleaned;
  return JSON.parse(jsonStr);
}

// ── Passthrough helper ────────────────────────────────────────────────────────

/**
 * Thin passthrough: forward an arbitrary request body to Gemini and return
 * the raw response JSON.  Used by the /api/ai/gemini endpoint which lets the
 * frontend craft the full Gemini request.
 *
 * @param {object} body  - Full Gemini request body
 * @param {string} [model] - Optional model name override (e.g. "gemini-2.5-pro")
 */
export async function passthroughGemini(body, model) {
  if (!GEMINI_API_KEY) {
    throw Object.assign(new Error("GEMINI_API_KEY not configured"), {
      status: 500,
    });
  }

  const url = model
    ? `${GEMINI_API_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`
    : `${GEMINI_REST_URL}?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return response.json();
}
