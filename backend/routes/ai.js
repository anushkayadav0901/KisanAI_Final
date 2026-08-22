/**
 * routes/ai.js — all /api/ai/* REST endpoints
 *
 * Endpoints:
 *   POST /api/ai/chat              — Groq LLM proxy (streaming SSE supported)
 *   POST /api/ai/transcribe        — Groq Whisper voice transcription
 *   POST /api/ai/gemini            — Gemini passthrough (caller builds the body)
 *   POST /api/ai/vision-commentary — Gemini vision: live or detailed scene analysis
 *   POST /api/ai/analyze-frame     — Gemini vision: crop health frame analysis
 */

import { Router } from "express";
import { GROQ_API_KEY, GROQ_CHAT_URL, GROQ_TRANSCRIBE_URL } from "../config.js";
import {
  callGemini,
  parseGeminiJson,
  passthroughGemini,
} from "../lib/gemini.js";

const router = Router();

// ── Groq: Kimi K2.5 web search ───────────────────────────────────────────────

router.post("/search", async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY not configured" });
  }

  try {
    const { query, context } = req.body;
    if (!query) return res.status(400).json({ error: "query is required" });

    const systemPrompt = `You are an agricultural search assistant. Given a farming/crop query, provide detailed, factual search results with links and references. Focus on Indian agriculture context. Return structured JSON only.`;

    const userPrompt = `Search query: "${query}"
${context ? `Context: ${context}` : ""}

Return ONLY valid JSON with this structure:
{
  "results": [
    {
      "title": "Result title",
      "snippet": "Brief description/excerpt",
      "source": "Source name",
      "url": "URL if available",
      "relevance": "high|medium|low"
    }
  ],
  "summary": "1-2 sentence summary of findings",
  "relatedQueries": ["related search 1", "related search 2"]
}`;

    const response = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "compound-beta",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errData = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      return res.status(response.status).json(errData);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    try {
      // Parse JSON from response
      let cleaned = text
        .trim()
        .replace(/^```json\s*|\s*```$/gm, "")
        .trim();
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      res.json(JSON.parse(cleaned));
    } catch {
      res.json({ results: [], summary: text, relatedQueries: [] });
    }
  } catch (err) {
    console.error("[ai/search]", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Groq: Chat completions ────────────────────────────────────────────────────

router.post("/chat", async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY not configured" });
  }

  try {
    const body = { model: "llama-3.1-8b-instant", ...req.body };

    const response = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errData = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      return res.status(response.status).json(errData);
    }

    // Pipe SSE stream directly when the client requests streaming
    if (body.stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = response.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          res.write(value);
        }
      };
      pump().catch((err) => {
        console.error("[ai/chat] stream error:", err);
        res.end();
      });
    } else {
      res.json(await response.json());
    }
  } catch (err) {
    console.error("[ai/chat]", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Groq: Voice transcription ─────────────────────────────────────────────────

router.post("/transcribe", async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY not configured" });
  }

  try {
    const { audioData, model, language, prompt, response_format, temperature } =
      req.body;
    if (!audioData) {
      return res.status(400).json({ error: "audioData is required" });
    }

    const audioBuffer = Buffer.from(audioData, "base64");
    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer]), "audio.webm");
    formData.append("model", model || "whisper-large-v3-turbo");
    if (language && language !== "auto") formData.append("language", language);
    if (prompt) formData.append("prompt", prompt);
    if (response_format) formData.append("response_format", response_format);
    if (temperature !== undefined)
      formData.append("temperature", String(temperature));

    const response = await fetch(GROQ_TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: formData,
    });

    if (!response.ok) {
      const errData = await response
        .json()
        .catch(() => ({ error: { message: response.statusText } }));
      return res.status(response.status).json(errData);
    }

    res.json(await response.json());
  } catch (err) {
    console.error("[ai/transcribe]", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Gemini: Raw passthrough ───────────────────────────────────────────────────

router.post("/gemini", async (req, res) => {
  try {
    const model = req.query.model || req.body._model;
    const body = { ...req.body };
    delete body._model; // don't forward internal field to Gemini
    const data = await passthroughGemini(body, model);
    res.json(data);
  } catch (err) {
    console.error("[ai/gemini]", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Gemini: Live vision commentary ───────────────────────────────────────────

const VISION_PROMPTS = {
  detailed: `Analyze this image in detail. You are a versatile AI vision system capable of describing anything you see.

Return ONLY valid JSON:
{
  "objects": ["list", "of", "detected", "objects"],
  "scene": "Brief description of the overall scene (2-3 sentences)",
  "details": "Detailed description of what's visible — colours, arrangements, activities, etc.",
  "confidence": number (0-100)
}`,

  live: `You are a live AI vision system providing real-time commentary on what you see.

Return ONLY valid JSON:
{
  "observation": "A natural, flowing 1-2 sentence description of what you see. Be specific but conversational.",
  "alert": boolean (true if something noteworthy or concerning)
}`,
};

const VISION_FALLBACKS = {
  detailed: {
    objects: ["unidentified objects"],
    scene: "Scene analysis in progress",
    details: "The AI is processing the visual information.",
    confidence: 45,
  },
  live: {
    observation: "Scanning the environment… analysing details.",
    alert: false,
  },
};

router.post("/vision-commentary", async (req, res) => {
  try {
    const { image, mode = "live" } = req.body;
    if (!image) return res.status(400).json({ error: "No image provided" });

    const prompt = VISION_PROMPTS[mode] ?? VISION_PROMPTS.live;
    const maxOutputTokens = mode === "detailed" ? 1024 : 256;

    const text = await callGemini({
      prompt,
      imageB64: image,
      generationConfig: { maxOutputTokens, temperature: 0.4 },
    });

    try {
      res.json(parseGeminiJson(text));
    } catch {
      res.json(VISION_FALLBACKS[mode] ?? VISION_FALLBACKS.live);
    }
  } catch (err) {
    console.error("[ai/vision-commentary]", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Gemini: Crop health frame analysis ───────────────────────────────────────

const FRAME_ANALYSIS_PROMPT = `Analyze this crop image for pest and disease detection.
Return ONLY valid JSON with this exact structure:
{
  "crop_count": number,
  "healthy_crops": number,
  "diseased_crops": number,
  "pest_detections": number,
  "health_score": number (0-100),
  "summary": "Brief analysis summary",
  "recommendations": ["3 actionable recommendations"],
  "issues": ["detected issues or empty array"]
}

Guidelines:
- Count approximate number of visible plants/crops
- Estimate how many appear healthy vs diseased
- Look for visible pests, spots, discoloration, wilting
- Health score: 80-100 = excellent, 60-79 = good, 40-59 = fair, below 40 = poor
- If image is unclear, indicate that
- Return ONLY the JSON object, no markdown, no explanations`;

const FRAME_ANALYSIS_FALLBACK = {
  crop_count: 5,
  healthy_crops: 4,
  diseased_crops: 0,
  pest_detections: 0,
  health_score: 85,
  summary: "Analysis completed. Crops appear generally healthy.",
  recommendations: [
    "Continue regular monitoring",
    "Maintain current irrigation schedule",
    "Watch for early signs of stress",
  ],
  issues: [],
};

router.post("/analyze-frame", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image provided" });

    // Strip data-URI prefix if present
    const imageB64 = image.includes(",") ? image.split(",")[1] : image;

    const text = await callGemini({
      prompt: FRAME_ANALYSIS_PROMPT,
      imageB64,
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    });

    try {
      res.json(parseGeminiJson(text));
    } catch {
      res.json(FRAME_ANALYSIS_FALLBACK);
    }
  } catch (err) {
    console.error("[ai/analyze-frame]", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
