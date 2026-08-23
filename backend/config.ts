import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

function required(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export const PORT: number = Number(process.env.PORT) || 3000;

export const GROQ_API_KEY = required("GROQ_API_KEY");
export const GEMINI_API_KEY = required("GEMINI_API_KEY");
export const WEATHER_API_KEY = required("WEATHER_API_KEY");
export const RAZORPAY_KEY_ID = required("RAZORPAY_KEY_ID");
export const RAZORPAY_KEY_SECRET = required("RAZORPAY_KEY_SECRET");

export const OLLAMA_URL: string =
  process.env.OLLAMA_URL ?? "http://localhost:11434";
export const OLLAMA_VISION_MODEL: string =
  process.env.OLLAMA_VISION_MODEL ?? "llava:7b";
export const LOCAL_VISION_FIRST: boolean = process.env.LOCAL_VISION_FIRST !== "0";

export const GEMINI_REST_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_TRANSCRIBE_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";

const REQUIRED_KEYS: Readonly<Record<string, string | undefined>> = {
  GROQ_API_KEY,
  GEMINI_API_KEY,
  WEATHER_API_KEY,
};

const missing = Object.entries(REQUIRED_KEYS)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length > 0) {
  console.warn(
    `⚠  Missing env vars: ${missing.join(", ")} — some endpoints will return 500.`,
  );
}

export interface AppConfig {
  readonly PORT: number;
  readonly GROQ_API_KEY: string | undefined;
  readonly GEMINI_API_KEY: string | undefined;
  readonly WEATHER_API_KEY: string | undefined;
  readonly RAZORPAY_KEY_ID: string | undefined;
  readonly RAZORPAY_KEY_SECRET: string | undefined;
  readonly OLLAMA_URL: string;
  readonly OLLAMA_VISION_MODEL: string;
  readonly LOCAL_VISION_FIRST: boolean;
  readonly GEMINI_REST_URL: string;
  readonly GEMINI_API_BASE: string;
  readonly GROQ_CHAT_URL: string;
  readonly GROQ_TRANSCRIBE_URL: string;
}

export default {
  PORT,
  GROQ_API_KEY,
  GEMINI_API_KEY,
  WEATHER_API_KEY,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  OLLAMA_URL,
  OLLAMA_VISION_MODEL,
  LOCAL_VISION_FIRST,
  GEMINI_REST_URL,
  GEMINI_API_BASE,
  GROQ_CHAT_URL,
  GROQ_TRANSCRIBE_URL,
} satisfies AppConfig;
