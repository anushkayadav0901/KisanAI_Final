"""
Kisan-Saathi Voice Service — Gemini Live Audio Proxy

A standalone Python WebSocket server that bridges the browser
(LiveAgent frontend) to Google's Gemini Live API for real-time
speech-to-speech agricultural consultation.

Architecture:
  Browser ←→ WS (this server :8001/voice-live) ←→ WS (Gemini Live API)

Protocol (same as Gemini BidiGenerateContent):
  1. Client sends  { setup: { model, generation_config, system_instruction } }
  2. Server forwards to Gemini, waits for setupComplete, relays it back
  3. Client streams  { realtime_input: { media_chunks: [{data, mime_type}] } }
  4. Server forwards audio to Gemini
  5. Gemini sends  { serverContent: { modelTurn: { parts: [...] }, turnComplete } }
  6. Server relays responses back to browser
"""

import asyncio
import inspect
import json
import logging
import os
import signal
import sys
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# We use the low-level websockets library for the upstream Gemini connection
try:
    from websockets.asyncio.client import connect as ws_connect
except ImportError:
    from websockets.client import connect as ws_connect
from websockets.exceptions import ConnectionClosed

# ── Config ─────────────────────────────────────────────────────────────────────

# Load .env from voice-service/ dir, then fall back to project root
_here = Path(__file__).resolve().parent
load_dotenv(_here / ".env")
load_dotenv(_here.parent / ".env")          # root .env fills in missing vars
load_dotenv(_here.parent / "backend" / ".env")  # backend .env as another fallback

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_LIVE_MODEL = os.getenv(
    "GEMINI_LIVE_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025"
)
PORT = int(os.getenv("VOICE_SERVICE_PORT", "8001"))

GEMINI_WS_BASE = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
)

# Default system instruction for agricultural consultation
DEFAULT_SYSTEM_INSTRUCTION = {
    "parts": [
        {
            "text": (
                "You are an expert agricultural consultant for Kisan-Saathi, "
                "an app that helps Indian farmers. You help with crop diseases, "
                "market prices, weather impact, soil health, and farming advice. "
                "Keep answers concise, practical, and helpful. "
                "Respond in the language the user speaks — Hindi, Marathi, Tamil, "
                "Telugu, Kannada, Punjabi, or any Indian language. "
                "Default to Hindi if you cannot detect the language."
            )
        }
    ],
}


def _normalize_model_name(model_name: str) -> str:
    """Ensure model names are sent in Gemini's expected `models/...` format."""
    model = (model_name or "").strip()
    if not model:
        model = "gemini-2.5-flash-native-audio-preview-12-2025"

    alias_map = {
        "gemini-live-2.5-flash-native-audio": "gemini-2.5-flash-native-audio-preview-12-2025",
        "models/gemini-live-2.5-flash-native-audio": "gemini-2.5-flash-native-audio-preview-12-2025",
    }
    model = alias_map.get(model, model)

    if not model.startswith("models/"):
        model = f"models/{model}"
    return model

# ── Logging ────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("voice-service")


async def _connect_gemini_upstream(upstream_url: str):
    """Connect to Gemini using a headers kwarg compatible with installed websockets version."""
    common_kwargs = {
        "max_size": None,
        "ping_interval": 30,
        "ping_timeout": 10,
    }
    headers = {"Content-Type": "application/json"}

    try:
        parameters = inspect.signature(ws_connect).parameters
    except (TypeError, ValueError):
        parameters = {}

    if "additional_headers" in parameters:
        common_kwargs["additional_headers"] = headers
    elif "extra_headers" in parameters:
        common_kwargs["extra_headers"] = headers

    return await ws_connect(upstream_url, **common_kwargs)

# ── FastAPI App ────────────────────────────────────────────────────────────────

app = FastAPI(title="Kisan-Saathi Voice Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "voice-service",
        "gemini_key_configured": bool(GEMINI_API_KEY),
        "model": GEMINI_LIVE_MODEL,
    }


# ── WebSocket Proxy Endpoint ──────────────────────────────────────────────────

@app.websocket("/voice-live")
async def voice_live_proxy(client_ws: WebSocket):
    """
    Transparent bidirectional proxy between the browser and Gemini Live API.

    Flow:
      1. Accept browser WebSocket
      2. Open upstream WebSocket to Gemini (API key injected server-side)
      3. Browser sends `setup` → we optionally inject system_instruction, forward to Gemini
      4. Gemini replies `setupComplete` → forwarded to browser
      5. Browser streams audio chunks → forwarded to Gemini
      6. Gemini streams audio/text back → forwarded to browser
    """
    await client_ws.accept()

    if not GEMINI_API_KEY:
        await client_ws.send_json({
            "error": {"message": "GEMINI_API_KEY not configured on voice service"}
        })
        await client_ws.close(code=1011, reason="Server misconfigured")
        return

    upstream_url = f"{GEMINI_WS_BASE}?key={GEMINI_API_KEY}"
    upstream_ws = None

    try:
        # Connect to Gemini Live API
        upstream_ws = await _connect_gemini_upstream(upstream_url)
        log.info("Connected to Gemini Live API upstream")

        # ── Task: Client → Gemini ──────────────────────────────────────────
        async def client_to_gemini():
            """Read from browser, forward to Gemini."""
            try:
                while True:
                    raw = await client_ws.receive_text()
                    try:
                        msg = json.loads(raw)
                    except json.JSONDecodeError:
                        # Forward raw if it's not JSON
                        await upstream_ws.send(raw)
                        continue

                    # If this is the setup message, ensure system_instruction exists
                    if "setup" in msg:
                        setup = msg["setup"]
                        configured_model = _normalize_model_name(GEMINI_LIVE_MODEL)
                        requested_model = setup.get("model")

                        # Force configured model server-side to avoid unsupported client model strings.
                        setup["model"] = configured_model

                        if "system_instruction" not in setup:
                            setup["system_instruction"] = DEFAULT_SYSTEM_INSTRUCTION

                        if requested_model and requested_model != configured_model:
                            log.warning(
                                "Overriding client model %s -> %s",
                                requested_model,
                                configured_model,
                            )
                        log.info(
                            "Forwarding setup message (model=%s)",
                            setup.get("model", "unknown"),
                        )

                    await upstream_ws.send(json.dumps(msg))

            except WebSocketDisconnect:
                log.info("Client disconnected")
            except Exception as e:
                log.error("client_to_gemini error: %s", e)

        # ── Task: Gemini → Client ──────────────────────────────────────────
        async def gemini_to_client():
            """Read from Gemini upstream, forward to browser."""
            try:
                async for raw_msg in upstream_ws:
                    # raw_msg can be str or bytes
                    if isinstance(raw_msg, bytes):
                        await client_ws.send_bytes(raw_msg)
                    else:
                        # Log setup completion
                        try:
                            parsed = json.loads(raw_msg)
                            if "setupComplete" in parsed:
                                log.info("Gemini setupComplete received — streaming ready")
                        except (json.JSONDecodeError, TypeError):
                            pass
                        await client_ws.send_text(raw_msg)

            except ConnectionClosed as e:
                log.info("Gemini upstream closed: code=%s reason=%s", e.code, e.reason)
                if e.code == 1008 and e.reason:
                    try:
                        await client_ws.send_json({
                            "error": {
                                "message": (
                                    "Gemini rejected setup/model: "
                                    f"{e.reason}. "
                                    "Set GEMINI_LIVE_MODEL to a supported Live model."
                                )
                            }
                        })
                    except Exception:
                        pass
            except WebSocketDisconnect:
                log.info("Client disconnected while reading upstream")
            except Exception as e:
                log.error("gemini_to_client error: %s", e)

        # Run both directions concurrently
        tasks = [
            asyncio.create_task(client_to_gemini(), name="c2g"),
            asyncio.create_task(gemini_to_client(), name="g2c"),
        ]

        # Wait for either task to finish (one side disconnected)
        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)

        # Cancel remaining tasks
        for task in pending:
            task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass

        # Check for exceptions in completed tasks
        for task in done:
            if task.exception():
                log.error("Task %s raised: %s", task.get_name(), task.exception())

    except Exception as e:
        log.error("Failed to connect to Gemini upstream: %s", e)
        try:
            await client_ws.send_json({
                "error": {"message": f"Failed to connect to Gemini: {str(e)}"}
            })
        except Exception:
            pass
    finally:
        # Clean up upstream
        if upstream_ws:
            try:
                await upstream_ws.close()
            except Exception:
                pass
        # Clean up client
        try:
            await client_ws.close()
        except Exception:
            pass
        log.info("Voice session ended")


# ── Entry Point ────────────────────────────────────────────────────────────────

def main():
    if not GEMINI_API_KEY:
        log.warning("⚠  GEMINI_API_KEY not set — voice service will reject connections")

    log.info("🎙  Kisan-Saathi Voice Service starting on port %d", PORT)
    log.info("   Model: %s", GEMINI_LIVE_MODEL)
    log.info("   Endpoint: ws://localhost:%d/voice-live", PORT)
    log.info("   Health: http://localhost:%d/health", PORT)

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=PORT,
        log_level="info",
        ws_max_size=None,
    )


if __name__ == "__main__":
    main()
