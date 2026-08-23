import { OLLAMA_URL, OLLAMA_VISION_MODEL } from "../config.js";

export interface OllamaVisionOptions {
  prompt: string;
  imageB64: string;
  system?: string;
  temperature?: number;
  numPredict?: number;
}

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
}

interface OllamaTagModel {
  name: string;
}

interface OllamaTagsResponse {
  models?: OllamaTagModel[];
}

interface OllamaChatResponse {
  message?: { content?: string };
  error?: string;
}

export interface OllamaStatus {
  readonly url: string;
  readonly configuredModel: string;
  readonly resolvedModel: string | null;
  readonly available: boolean;
  readonly models: readonly string[];
}

const AVAILABILITY_TTL_MS = 30_000;

let availabilityCache: {
  checkedAt: number;
  status: OllamaStatus;
} = {
  checkedAt: 0,
  status: {
    url: OLLAMA_URL,
    configuredModel: OLLAMA_VISION_MODEL,
    resolvedModel: null,
    available: false,
    models: [],
  },
};

function baseName(model: string): string {
  return model.split(":")[0] ?? model;
}

export function resolvedModel(): string | null {
  return availabilityCache.status.resolvedModel;
}

export async function isOllamaAvailable(maxAgeMs = AVAILABILITY_TTL_MS): Promise<boolean> {
  const now = Date.now();
  if (now - availabilityCache.checkedAt < maxAgeMs) {
    return availabilityCache.status.available;
  }

  let status: OllamaStatus;
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as OllamaTagsResponse;
    const models = (data.models ?? []).map((m) => m.name);
    const resolved =
      models.find((n) => n === OLLAMA_VISION_MODEL) ??
      models.find((n) => baseName(n) === baseName(OLLAMA_VISION_MODEL)) ??
      null;
    status = {
      url: OLLAMA_URL,
      configuredModel: OLLAMA_VISION_MODEL,
      resolvedModel: resolved,
      available: resolved !== null,
      models,
    };
  } catch {
    status = {
      url: OLLAMA_URL,
      configuredModel: OLLAMA_VISION_MODEL,
      resolvedModel: null,
      available: false,
      models: [],
    };
  }

  availabilityCache = { checkedAt: now, status };
  return status.available;
}

export function ollamaStatus(): OllamaStatus {
  return availabilityCache.status;
}

export async function ollamaVision({
  prompt,
  imageB64,
  system,
  temperature = 0.4,
  numPredict = 512,
}: OllamaVisionOptions): Promise<string> {
  const model = resolvedModel() ?? OLLAMA_VISION_MODEL;

  const messages: OllamaChatMessage[] = [
    ...(system
      ? [{ role: "system" as const, content: system }]
      : []),
    { role: "user", content: prompt, images: [imageB64] },
  ];

  const body = {
    model,
    messages,
    stream: false as const,
    format: "json" as const,
    options: { temperature, num_predict: numPredict },
  };

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Ollama ${model} request failed (${res.status}): ${detail.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as OllamaChatResponse;
  if (data.error) {
    throw new Error(`Ollama error: ${data.error}`);
  }
  const text = data.message?.content ?? "";
  if (!text.trim()) {
    throw new Error(`Ollama ${model} returned an empty response`);
  }
  return text;
}

export function parseLooseJson<T = Record<string, unknown>>(text: string): T {
  const cleaned = String(text)
    .trim()
    .replace(/^```json\s*|\s*```$/gm, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  const candidate =
    first !== -1 && last !== -1 ? cleaned.slice(first, last + 1) : cleaned;
  return JSON.parse(candidate) as T;
}
