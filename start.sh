#!/usr/bin/env bash
# =============================================================================
# Kisan AI — end-to-end startup script
#
# Works on macOS and Windows (Git Bash / WSL).
# Steps, in order:
#   1. Verify prerequisites (node, npm, python)
#   2. Install backend + frontend dependencies
#   3. Set up .env files
#   4. Ask whether you want the LOCAL LLM (LLaVA via Ollama)
#      -> checks Ollama, installs it hints if missing, pulls the model
#   5. Start the YOLO detection service        (:8000)
#   6. Start the Gemini Live voice proxy       (:8001)
#   7. Start the backend API                   (:3000)
#   8. Start the frontend                      (:5173)
#
# Ctrl-C stops every service this script started.
# =============================================================================

set -uo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
step() { printf "\n${CYAN}━━━ %s ━━━${NC}\n" "$*"; }
ok()   { printf "${GREEN}✔ %s${NC}\n" "$*"; }
warn() { printf "${YELLOW}⚠ %s${NC}\n" "$*"; }
fail() { printf "${RED}✘ %s${NC}\n" "$*"; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDS=()

cleanup() {
  printf "\n${YELLOW}Stopping services…${NC}\n"
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

# ── Step 1: Prerequisites ─────────────────────────────────────────────────────
step "Step 1/8 — Checking prerequisites"

if ! command -v node >/dev/null 2>&1; then
  fail "Node.js is not installed. Install it from https://nodejs.org (LTS)."
  exit 1
fi
ok "Node $(node --version)"

if ! command -v npm >/dev/null 2>&1; then
  fail "npm is not available."
  exit 1
fi
ok "npm $(npm --version)"

PYTHON_BIN=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
fi
if [ -z "$PYTHON_BIN" ]; then
  warn "Python not found — YOLO (:8000) and voice (:8001) services will be skipped."
else
  ok "Python $($PYTHON_BIN --version 2>&1 | cut -d' ' -f2)"
fi

# ── Step 2: Dependencies ──────────────────────────────────────────────────────
step "Step 2/8 — Installing dependencies"

(cd "$ROOT_DIR/backend" && npm install --silent && ok "backend dependencies") \
  || { fail "backend npm install failed"; exit 1; }
(cd "$ROOT_DIR/frontend" && npm install --silent && ok "frontend dependencies") \
  || { fail "frontend npm install failed"; exit 1; }

# ── Step 3: Environment files ─────────────────────────────────────────────────
step "Step 3/8 — Environment"

if [ ! -f "$ROOT_DIR/.env" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  warn "Created .env from .env.example — add your GEMINI_API_KEY / GROQ_API_KEY / WEATHER_API_KEY."
  warn "The app still runs without them (surveillance, consent, retrieval and local LLM need no keys)."
else
  ok ".env already present"
fi

# ── Step 4: Local LLM (Ollama + LLaVA) ────────────────────────────────────────
step "Step 4/8 — Local vision model (LLaVA via Ollama)"

printf "Do you want the local LLM running as well? [Y/n] "
read -r WANT_LLM </dev/tty 2>/dev/null || read -r WANT_LLM
WANT_LLM="${WANT_LLM:-Y}"

OLLAMA_MODEL="llava:7b"

if [[ ! "$WANT_LLM" =~ ^[Yy] ]]; then
  export LOCAL_VISION_FIRST=0
  ok "Local LLM disabled — vision endpoints will use Gemini only."
else
  export LOCAL_VISION_FIRST=${LOCAL_VISION_FIRST:-1}

  if ! command -v ollama >/dev/null 2>&1; then
    warn "Ollama is not installed."
    case "$(uname -s)" in
      Darwin) echo "    Install with:  brew install ollama   (or download https://ollama.com/download/mac)" ;;
      MINGW*|MSYS*|CYGWIN*) echo "    Download the installer: https://ollama.com/download/windows" ;;
      Linux) echo "    Install with:  curl -fsSL https://ollama.com/install.sh | sh" ;;
      *) echo "    See https://ollama.com/download" ;;
    esac
    echo "    Then re-run ./start.sh and answer Y again."
    export LOCAL_VISION_FIRST=0
    warn "Continuing WITHOUT the local LLM."
  else
    ok "Ollama CLI found"

    # Is the Ollama server reachable?
    if ! curl -s --max-time 3 http://localhost:11434/api/tags >/dev/null 2>&1; then
      warn "Ollama server not responding — starting it in the background…"
      ollama serve >/dev/null 2>&1 &
      PIDS+=($!)
      for _ in $(seq 1 15); do
        curl -s --max-time 2 http://localhost:11434/api/tags >/dev/null 2>&1 && break
        sleep 1
      done
    fi

    if curl -s --max-time 3 http://localhost:11434/api/tags >/dev/null 2>&1; then
      ok "Ollama server reachable at http://localhost:11434"
      if ollama list 2>/dev/null | grep -qi "^${OLLAMA_MODEL%%:*}"; then
        ok "Model ${OLLAMA_MODEL} already installed"
      else
        step "Pulling ${OLLAMA_MODEL} (~4.7 GB — one time only)"
        ollama pull "$OLLAMA_MODEL" || warn "Model pull failed — continuing without local LLM."
      fi
    else
      warn "Could not reach the Ollama server — continuing without local LLM."
      export LOCAL_VISION_FIRST=0
    fi
  fi
fi

# ── Step 5: YOLO detection service ────────────────────────────────────────────
step "Step 5/8 — YOLO detection service (:8000)"

if [ -n "$PYTHON_BIN" ]; then
  (
    cd "$ROOT_DIR/yolo" \
      && "$PYTHON_BIN" -m pip install --quiet -r requirements.txt \
      && "$PYTHON_BIN" -m uvicorn main:app --host 0.0.0.0 --port 8000
  ) >"$ROOT_DIR/yolo/service.log" 2>&1 &
  PIDS+=($!)
  ok "YOLO starting in background (log: yolo/service.log)"
else
  warn "Skipped — Python unavailable."
fi

# ── Step 6: Voice proxy ───────────────────────────────────────────────────────
step "Step 6/8 — Gemini Live voice proxy (:8001)"

if [ -n "$PYTHON_BIN" ]; then
  (
    cd "$ROOT_DIR/voice-service" \
      && "$PYTHON_BIN" -m pip install --quiet -r requirements.txt \
      && "$PYTHON_BIN" -m uvicorn main:app --host 0.0.0.0 --port 8001
  ) >"$ROOT_DIR/voice-service/service.log" 2>&1 &
  PIDS+=($!)
  ok "Voice proxy starting in background (log: voice-service/service.log)"
else
  warn "Skipped — Python unavailable."
fi

# ── Step 7: Backend ───────────────────────────────────────────────────────────
step "Step 7/8 — Backend API (:3000)"

(cd "$ROOT_DIR/backend" && npm run dev) >"$ROOT_DIR/backend/service.log" 2>&1 &
PIDS+=($!)
ok "Backend starting in background (log: backend/service.log)"

for _ in $(seq 1 20); do
  curl -s --max-time 2 http://localhost:3000/health >/dev/null 2>&1 && break
  sleep 1
done
if curl -s --max-time 2 http://localhost:3000/health >/dev/null 2>&1; then
  ok "Backend healthy — http://localhost:3000/health"
  if [[ "${LOCAL_VISION_FIRST:-0}" == "1" ]]; then
    curl -s --max-time 5 http://localhost:3000/api/ai/local-vision/health | tee /tmp/kisan-lv.json | head -c 200 >/dev/null
    if grep -q '"available":true' /tmp/kisan-lv.json 2>/dev/null; then
      ok "Local vision READY (LLaVA via Ollama)"
    else
      warn "Local vision NOT available — check backend/service.log. Vision degrades to Gemini (declared in responses)."
    fi
  fi
else
  fail "Backend did not become healthy — see backend/service.log"
fi

# ── Step 8: Frontend ──────────────────────────────────────────────────────────
step "Step 8/8 — Frontend (:5173)"

(cd "$ROOT_DIR/frontend" && npm run dev) >"$ROOT_DIR/frontend/service.log" 2>&1 &
PIDS+=($!)
ok "Frontend starting in background (log: frontend/service.log)"

sleep 3

printf "\n"
printf "${GREEN}══════════════════════════════════════════════════${NC}\n"
printf "${GREEN}  Kisan AI is up${NC}\n"
printf "    Frontend     → http://localhost:5173\n"
printf "    API console  → http://localhost:3000/v1/docs\n"
printf "    Local vision → http://localhost:3000/api/ai/local-vision/health\n"
printf "    YOLO         → http://localhost:8000/health\n"
printf "    Voice proxy  → http://localhost:8001/health\n"
printf "\n"
printf "  Press Ctrl-C to stop everything.\n"
printf "${GREEN}══════════════════════════════════════════════════${NC}\n\n"

wait
