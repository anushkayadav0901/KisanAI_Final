import {
  GEMINI_API_KEY,
  GEMINI_REST_URL,
  GEMINI_API_BASE,
} from "../config.js";

export interface GeminiGenerationConfig {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
}

export interface GeminiCallOptions {
  prompt: string;
  imageB64?: string;
  mimeType?: string;
  generationConfig?: GeminiGenerationConfig;
}

export interface GeminiApiError {
  code?: number;
  message?: string;
  status?: string;
}

interface GeminiErrorResponse {
  error?: GeminiApiError;
}

interface GeminiSuccessResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  promptFeedback?: { blockReason?: string };
}

type GeminiResponse = GeminiErrorResponse & GeminiSuccessResponse;

export interface HttpError extends Error {
  status?: number;
  geminiError?: GeminiApiError;
}

function httpError(message: string, status: number, extra?: Partial<HttpError>): HttpError {
  const err = new Error(message) as HttpError;
  err.status = status;
  if (extra?.geminiError) err.geminiError = extra.geminiError;
  return err;
}

export async function callGemini({
  prompt,
  imageB64,
  mimeType = "image/jpeg",
  generationConfig = {},
}: GeminiCallOptions): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw httpError("GEMINI_API_KEY not configured", 500);
  }

  const parts: Array<
    { text: string } | { inline_data: { mime_type: string; data: string } }
  > = [{ text: prompt }];
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

  const data = (await response.json()) as GeminiResponse;

  if (data.error) {
    throw httpError(`Gemini API error: ${data.error.message ?? "unknown"}`, 502, {
      geminiError: data.error,
    });
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const reason = data.promptFeedback?.blockReason;
    throw httpError(
      reason
        ? `Gemini returned no content (blocked: ${reason})`
        : "Gemini returned no text content",
      502,
    );
  }

  return text;
}

export function parseGeminiJson<T = Record<string, unknown>>(text: string): T {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const jsonStr = match ? (match[0] as string) : cleaned;
  return JSON.parse(jsonStr) as T;
}

export async function passthroughGemini(
  body: unknown,
  model?: string,
): Promise<unknown> {
  if (!GEMINI_API_KEY) {
    throw httpError("GEMINI_API_KEY not configured", 500);
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
