/**
 * index.js — Kisaan Saathi Backend entry point
 *
 * Responsibilities:
 *  1. Bootstrap Express + middleware
 *  2. Mount route modules
 *  3. Create HTTP server
 *  4. Attach WebSocket handler
 *  5. Start listening
 *
 * All business logic lives in routes/ and lib/.
 */

import express from "express";
import cors from "cors";
import { createServer } from "http";

import { PORT } from "./config.js";
import aiRouter from "./routes/ai.js";
import weatherRouter from "./routes/weather.js";
import paymentRouter from "./routes/payment.js";
import farmingRouter from "./routes/farming.js";
import { setupGeminiLive, setupGeminiVoiceLiveProxy } from "./routes/ws.js";

// ── App ───────────────────────────────────────────────────────────────────────

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// ── Health check ──────────────────────────────────────────────────────────────

const healthHandler = (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};

app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

// ── REST routes ───────────────────────────────────────────────────────────────

app.use("/api/ai", aiRouter);
app.use("/api/weather", weatherRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/farming", farmingRouter);

// ── 404 catch-all ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── HTTP + WebSocket server ───────────────────────────────────────────────────

const httpServer = createServer(app);

const geminiLiveWss = setupGeminiLive(httpServer);
const voiceLiveWss = setupGeminiVoiceLiveProxy(httpServer);

// Route WebSocket upgrades manually to avoid conflicts between multiple
// WebSocketServer instances on the same httpServer (causes RSV1 frame errors).
httpServer.on("upgrade", (request, socket, head) => {
  const { pathname } = new URL(request.url, "ws://localhost");

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

httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌ Port ${PORT} is already in use.`);
    console.error(`   Kill the process using it first:\n`);
    console.error(`     npx kill-port ${PORT}\n`);
    process.exit(1);
  }
  throw err;
});

httpServer.listen(PORT, () => {
  console.log(`\n🌱 Kisaan Saathi Backend  →  http://localhost:${PORT}\n`);
  console.log("  REST");
  console.log("    GET  /health");
  console.log("    POST /api/ai/chat               (Groq LLM, SSE streaming)");
  console.log("    POST /api/ai/transcribe         (Groq Whisper)");
  console.log("    POST /api/ai/gemini             (Gemini passthrough)");
  console.log(
    "    POST /api/ai/vision-commentary  (Gemini live/detailed vision)",
  );
  console.log("    POST /api/ai/analyze-frame      (Gemini crop health)");
  console.log("    POST /api/farming/subsidies      (govt subsidy data)");
  console.log("    POST /api/farming/videos         (success story videos)");
  console.log("    POST /api/farming/insights       (AI farming guide)");
  console.log("    GET  /api/weather/coords        (by lat/lon)");
  console.log("    GET  /api/weather/:city         (by city name)");
  console.log("    POST /api/payment/create-order  (Razorpay)");
  console.log("    POST /api/payment/verify        (Razorpay HMAC)");
  console.log("    GET  /api/payment/key           (Razorpay publishable key)");
  console.log("\n  WebSocket");
  console.log(
    "    WS   /gemini-live               (Gemini crop analysis frames)\n",
  );
  console.log(
    "    WS   /voice-live                (Gemini native audio proxy)\n",
  );
});
