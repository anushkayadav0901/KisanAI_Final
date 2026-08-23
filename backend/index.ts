/**
 * index.ts — Kisaan Saathi Backend entry point
 *
 * Responsibilities:
 *  1. Bootstrap Express + middleware
 *  2. Mount route modules
 *  3. Create HTTP server
 *  4. Attach WebSocket handler
 *  5. Verify local vision (Ollama) availability at boot — loudly, never silently
 *
 * All business logic lives in routes/ and lib/.
 */

import express from "express";
import cors from "cors";
import { createServer } from "http";
import type { Request, Response } from "express";

import {
  PORT,
  LOCAL_VISION_FIRST,
  OLLAMA_URL,
  OLLAMA_VISION_MODEL,
} from "./config.js";
import aiRouter from "./routes/ai.js";
import weatherRouter from "./routes/weather.js";
import paymentRouter from "./routes/payment.js";
import farmingRouter from "./routes/farming.js";
import v1Router from "./routes/v1.js";
import { setupGeminiLive, setupGeminiVoiceLiveProxy } from "./routes/ws.js";
import { isOllamaAvailable, ollamaStatus } from "./lib/ollama.js";

// ── App ───────────────────────────────────────────────────────────────────────

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ── Health check ──────────────────────────────────────────────────────────────

const healthHandler = (_req: Request, res: Response): void => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

// ── REST routes ───────────────────────────────────────────────────────────────

app.use("/api/ai", aiRouter);
app.use("/api/weather", weatherRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/farming", farmingRouter);

// ── Public open-data API ──────────────────────────────────────────────────────
// Unauthenticated by design: this is published as a digital public good.
app.use("/v1", v1Router);

// ── 404 catch-all ─────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ── HTTP + WebSocket server ───────────────────────────────────────────────────

const httpServer = createServer(app);

const geminiLiveWss = setupGeminiLive(httpServer);
const voiceLiveWss = setupGeminiVoiceLiveProxy(httpServer);

// Route WebSocket upgrades manually to avoid conflicts between multiple
// WebSocketServer instances on the same httpServer (causes RSV1 frame errors).
httpServer.on("upgrade", (request, socket, head) => {
  const { pathname } = new URL(request.url ?? "/", "ws://localhost");

  if (pathname === "/gemini-live") {
    geminiLiveWss.handleUpgrade(request, socket, head, (ws) => {
      geminiLiveWss.emit("connection", ws, request);
    });
  } else if (pathname === "/voice-live") {
    voiceLiveWss.handleUpgrade(request, socket, head, (ws) => {
      voiceLiveWss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   Kill the process using it first:\n`);
    console.error(`     npx kill-port ${PORT}\n`);
    process.exit(1);
  }
  throw err;
});

// ── Local vision check at boot — reported loudly, never silently skipped ─────

async function reportLocalVisionStatus(): Promise<void> {
  if (!LOCAL_VISION_FIRST) {
    console.log("  Local vision: DISABLED (LOCAL_VISION_FIRST=0) — Gemini only");
    return;
  }
  const available = await isOllamaAvailable(0);
  const status = ollamaStatus();
  if (available && status.resolvedModel) {
    console.log(
      `  Local vision: READY (${status.resolvedModel} @ ${OLLAMA_URL})`,
    );
    return;
  }
  if (!status.models.length) {
    console.warn(
      `  ⚠ Local vision: Ollama is NOT REACHABLE at ${OLLAMA_URL}.\n` +
        `     Vision requests will fail or degrade to Gemini (declared in every response).\n` +
        `     Install/start it: https://ollama.com/download, then re-run ./start.sh`,
    );
    return;
  }
  console.warn(
    `  ⚠ Local vision: Ollama reachable but model "${OLLAMA_VISION_MODEL}" is not installed.\n` +
      `     Installed: ${status.models.join(", ")}\n` +
      `     Run: ollama pull ${OLLAMA_VISION_MODEL}`,
  );
}

void reportLocalVisionStatus().finally(() => {
  httpServer.listen(PORT, () => {
    console.log(`\n🌱 Kisaan Saathi Backend  →  http://localhost:${PORT}\n`);
    console.log("  REST");
    console.log("    GET  /health");
    console.log("    POST /api/ai/chat               (Groq LLM, SSE streaming)");
    console.log("    POST /api/ai/transcribe         (Groq Whisper)");
    console.log("    POST /api/ai/gemini             (Gemini passthrough)");
    console.log("    GET  /api/ai/local-vision/health (Ollama local vision status)");
    console.log("    POST /api/ai/vision-commentary  (local LLaVA → Gemini, declared)");
    console.log("    POST /api/ai/analyze-frame      (crop health, same policy)");
    console.log("    POST /api/farming/subsidies      (govt subsidy data)");
    console.log("    POST /api/farming/videos         (success story videos)");
    console.log("    POST /api/farming/insights       (AI farming guide)");
    console.log("    GET  /api/weather/coords        (by lat/lon)");
    console.log("    GET  /api/weather/:city         (by city name)");
    console.log("");
    console.log("  Public API (open data, no auth)");
    console.log("    GET  /v1/                       (service discovery)");
    console.log("    GET  /v1/docs                   (interactive console)");
    console.log("    GET  /v1/openapi.json           (OpenAPI 3.0 spec)");
    console.log("    GET  /v1/surveillance/states    (national signal)");
    console.log("    GET  /v1/surveillance/districts (?state=PB)");
    console.log("    GET  /v1/surveillance/alerts    (?state=PB)");
    console.log("    GET  /v1/models                 (model registry)");
    console.log("    GET  /v1/models/:id             (model card)");
    console.log("");
    console.log("  Payments");
    console.log("    POST /api/payment/create-order  (Razorpay)");
    console.log("    POST /api/payment/verify        (Razorpay HMAC)");
    console.log("    GET  /api/payment/key           (Razorpay publishable key)");
    console.log("\n  WebSocket");
    console.log("    WS   /gemini-live               (Gemini crop analysis frames)\n");
    console.log("    WS   /voice-live                (Gemini native audio proxy)\n");
  });
});
