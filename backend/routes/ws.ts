/**
 * routes/ws.ts — WebSocket /gemini-live endpoint
 *
 * Sets up the Gemini Live crop-health WebSocket server.
 * Call setupGeminiLive(httpServer) from index.js after the HTTP
 * server is created.
 *
 * Protocol:
 *   Client → Server:  { type: "frame", data: "<base64-JPEG>" }
 *   Server → Client:  { type: "ready",    message: "..." }
 *                     { type: "analysis", data: { serverContent: { modelTurn: { parts: [{ text: "<JSON>" }] } } } }
 *                     { type: "error",    message: "..." }
 */

import type { Server as HttpServer } from "node:http";
import WebSocket, { WebSocketServer } from "ws";
import { GEMINI_API_KEY, GEMINI_REST_URL } from "../config.js";
import { parseGeminiJson } from "../lib/gemini.js";

const GEMINI_LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL || "models/gemini-live-2.5-flash-native-audio";
const GEMINI_LIVE_WS_BASE =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

// ── Prompt ────────────────────────────────────────────────────────────────────

const GEMINI_LIVE_PROMPT = `You are an expert agricultural AI vision system analyzing live camera frames.

Analyze the image and return ONLY valid JSON with this exact structure:
{
  "health_score": number (0-100),
  "disease": {
    "name": "disease name or null",
    "severity": number (0-10, 0 = none),
    "confidence": number (0-100, must be >90 to report),
    "appearance": "Short visual description: leaf/stem/fruit + spot color, shape, size, pattern",
    "affected_parts": ["leaf", "stem", "fruit"],
    "progression_stage": "early|moderate|advanced"
  },
  "crop_type": "crop name or unknown",
  "pests": [
    { "type": "pest name", "count": number, "description": "short damage description" }
  ],
  "recommendations": ["action 1", "action 2"],
  "summary": "Short 1-line: [crop type] [part] showing [what you see] e.g. 'Tomato leaf with brown circular spots (~3mm), yellow halo, lower canopy'"
}

Rules:
- summary MUST be short and visual: describe EXACTLY what the image shows — crop/leaf/fruit, spots/rashes/wilting/holes, their color, shape, location
- Example summaries: "Rice leaf with reddish-brown elongated lesions on tips", "Cotton boll with white fungal growth and brown rot", "Healthy wheat canopy, no visible issues"
- Only report disease if confidence >90%
- Focus on SINGLE most prominent issue
- If no disease: disease.name = null, severity = 0
- If no pests: empty array
- Return ONLY JSON, no markdown`;

const ANALYSIS_FALLBACK = {
  health_score: 75,
  disease: { name: null, severity: 0, confidence: 0 },
  pests: [],
  recommendations: ["Continue monitoring", "Maintain current care routine"],
  summary: "Analysing crop health…",
};

// Rate limiting — one Gemini call per client per N milliseconds
const RATE_LIMIT_MS = 2000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface FrameMessage {
  type: string;
  data?: string;
}

interface GeminiRestResponse {
  error?: { message?: string };
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGeminiRestResponse(value: unknown): value is GeminiRestResponse {
  return isRecord(value);
}

function asFrameMessage(parsed: unknown): FrameMessage | null {
  if (!isRecord(parsed) || typeof parsed.type !== "string") return null;
  return parsed as unknown as FrameMessage;
}

// ── Gemini call ───────────────────────────────────────────────────────────────

async function analyseFrame(imageB64: string): Promise<unknown> {
  const body = {
    contents: [
      {
        parts: [
          { text: GEMINI_LIVE_PROMPT },
          { inline_data: { mime_type: "image/jpeg", data: imageB64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topK: 32,
      topP: 1,
      maxOutputTokens: 512,
    },
  };

  const response = await fetch(`${GEMINI_REST_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data: unknown = await response.json();

  if (!isGeminiRestResponse(data)) {
    throw new Error("Gemini returned an unexpected response shape");
  }

  if (data.error) {
    throw new Error(`Gemini API error: ${data.error.message}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text");

  return parseGeminiJson(text);
}

// ── Wire up WebSocket server ──────────────────────────────────────────────────

function wrapAnalysis(analysis: unknown): string {
  return JSON.stringify({
    type: "analysis",
    data: {
      serverContent: {
        modelTurn: { parts: [{ text: JSON.stringify(analysis) }] },
      },
    },
  });
}

export function setupGeminiLive(httpServer: HttpServer): WebSocketServer {
  void httpServer;
  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
  });

  wss.on("connection", (ws: WebSocket) => {
    ws.send(JSON.stringify({ type: "ready", message: "Kisan AI ready" }));

    let lastAnalysisAt = 0;
    let frameCount = 0;
    let analysisCount = 0;

    ws.on("message", async (raw: WebSocket.RawData): Promise<void> => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString()) as unknown;
      } catch {
        return;
      }

      const message = asFrameMessage(parsed);
      if (!message || message.type !== "frame" || !message.data) return;
      frameCount++;

      // Per-client rate limit
      const now = Date.now();
      if (now - lastAnalysisAt < RATE_LIMIT_MS) return;
      lastAnalysisAt = now;
      analysisCount++;

      if (!GEMINI_API_KEY) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "GEMINI_API_KEY not configured",
          }),
        );
        return;
      }

      try {
        const analysis = await analyseFrame(message.data);
        ws.send(wrapAnalysis(analysis));
      } catch {
        ws.send(wrapAnalysis(ANALYSIS_FALLBACK));
      }
    });

    ws.on("close", () => {});
    ws.on("error", () => {});
  });

  return wss;
}

/**
 * Transparent bidirectional proxy for Gemini Live voice.
 *
 * Flow:
 *   1. Client connects to /voice-live
 *   2. Backend opens upstream WS to Gemini (API key injected here)
 *   3. Client messages are buffered until upstream opens, then forwarded
 *   4. All upstream messages are forwarded verbatim to client
 *   5. Client sends the `setup` message (with model, config, system_instruction)
 *   6. Gemini replies with `setupComplete` → forwarded to client
 *   7. Client then streams audio; Gemini streams audio back
 */
export function setupGeminiVoiceLiveProxy(
  httpServer: HttpServer,
): WebSocketServer {
  void httpServer;
  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
  });

  wss.on("connection", (clientSocket: WebSocket) => {
    if (!GEMINI_API_KEY) {
      clientSocket.send(
        JSON.stringify({
          error: {
            message: "GEMINI_API_KEY not configured on backend",
          },
        }),
      );
      clientSocket.close(1011, "Server misconfigured");
      return;
    }

    const upstreamUrl = `${GEMINI_LIVE_WS_BASE}?key=${GEMINI_API_KEY}`;
    const upstreamSocket = new WebSocket(upstreamUrl);

    // Buffer client messages until Gemini upstream is open
    const pendingClientMessages: Array<{
      data: WebSocket.RawData;
      isBinary: boolean;
    }> = [];
    let upstreamOpen = false;

    upstreamSocket.on("open", () => {
      upstreamOpen = true;
      // Flush any messages the client sent while we were connecting
      // (the very first one is typically the setup message)
      for (const msg of pendingClientMessages) {
        upstreamSocket.send(msg.data, { binary: msg.isBinary });
      }
      pendingClientMessages.length = 0;
    });

    upstreamSocket.on("message", (data: WebSocket.RawData, isBinary: boolean) => {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(data, { binary: isBinary });
      }
    });

    upstreamSocket.on("error", (err: Error) => {
      console.error("[voice-live] upstream error", err.message || err);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(
          JSON.stringify({
            error: {
              message: "Upstream Gemini Live connection error",
            },
          }),
        );
        clientSocket.close(1011, "Upstream error");
      }
    });

    upstreamSocket.on("close", (code: number, reasonBuffer: Buffer) => {
      const reason = reasonBuffer?.toString() || "Upstream closed";
      console.log(`[voice-live] upstream closed ${code} ${reason}`);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close(code || 1011, reason.slice(0, 100));
      }
    });

    // --- Client → Upstream (with buffering) ---

    clientSocket.on("message", (data: WebSocket.RawData, isBinary: boolean) => {
      if (upstreamOpen && upstreamSocket.readyState === WebSocket.OPEN) {
        upstreamSocket.send(data, { binary: isBinary });
      } else {
        pendingClientMessages.push({ data, isBinary });
      }
    });

    clientSocket.on("close", () => {
      if (
        upstreamSocket.readyState === WebSocket.OPEN ||
        upstreamSocket.readyState === WebSocket.CONNECTING
      ) {
        upstreamSocket.close(1000, "Client disconnected");
      }
    });

    clientSocket.on("error", () => {
      if (
        upstreamSocket.readyState === WebSocket.OPEN ||
        upstreamSocket.readyState === WebSocket.CONNECTING
      ) {
        upstreamSocket.close(1011, "Client socket error");
      }
    });
  });

  return wss;
}
