import { Router, type Request, type Response } from "express";
import {
  GROQ_API_KEY,
  GROQ_CHAT_URL,
  GROQ_TRANSCRIBE_URL,
  LOCAL_VISION_FIRST,
} from "../config.js";
import {
  callGemini,
  parseGeminiJson,
  passthroughGemini,
} from "../lib/gemini.js";
import {
  isOllamaAvailable,
  ollamaStatus,
  ollamaVision,
  parseLooseJson,
} from "../lib/ollama.js";

const router = Router();

type VisionProvider = "ollama" | "gemini";
type ProviderChoice = "auto" | VisionProvider;

interface VisionRequestBody {
  image?: string;
  mode?: string;
  provider?: ProviderChoice;
}

class ProviderError extends Error {
  constructor(
    public readonly provider: VisionProvider,
    message: string,
    public readonly status = 502,
  ) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderError";
  }
}

function errStatus(err: unknown): number {
  if (err instanceof Error) {
    const status = (err as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return 500;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

router.post("/search", async (req: Request, res: Response) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY not configured" });
  }

  try {
    const { query, context } = req.body as { query?: string; context?: string };
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

    interface GroqChatResponse {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    }

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
      const errData = (await response.json().catch(() => ({
        error: { message: response.statusText },
      }))) as GroqChatResponse;
      return res.status(response.status).json(errData);
    }

    const data = (await response.json()) as GroqChatResponse;
    const text = data.choices?.[0]?.message?.content ?? "";

    try {
      let cleaned = text.trim().replace(/^```json\s*|\s*```$/gm, "").trim();
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
    res.status(500).json({ error: errMsg(err) });
  }
});

router.post("/chat", async (req: Request, res: Response) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY not configured" });
  }

  try {
    const body = { model: "llama-3.1-8b-instant", ...req.body } as Record<string, unknown> & {
      stream?: boolean;
    };

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

    if (body.stream === true && response.body) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const reader = response.body.getReader();
      const pump = async (): Promise<void> => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          res.write(value);
        }
      };
      pump().catch((err: unknown) => {
        console.error("[ai/chat] stream error:", err);
        res.end();
      });
    } else {
      res.json(await response.json());
    }
  } catch (err) {
    console.error("[ai/chat]", err);
    res.status(500).json({ error: errMsg(err) });
  }
});

router.post("/transcribe", async (req: Request, res: Response) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY not configured" });
  }

  try {
    const { audioData, model, language, prompt, response_format, temperature } =
      req.body as {
        audioData?: string;
        model?: string;
        language?: string;
        prompt?: string;
        response_format?: string;
        temperature?: number;
      };
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
    res.status(500).json({ error: errMsg(err) });
  }
});

router.post("/gemini", async (req: Request, res: Response) => {
  try {
    const model =
      (req.query.model !== undefined ? String(req.query.model) : undefined) ??
      (req.body as { _model?: string })._model;
    const body = { ...req.body } as Record<string, unknown>;
    delete body._model;
    const data = await passthroughGemini(body, model);
    res.json(data);
  } catch (err) {
    console.error("[ai/gemini]", err);
    res.status(errStatus(err)).json({ error: errMsg(err) });
  }
});

router.get("/local-vision/health", async (_req: Request, res: Response) => {
  await isOllamaAvailable(0);
  res.json({
    ...ollamaStatus(),
    fallback: "gemini",
    localFirst: LOCAL_VISION_FIRST,
  });
});

import { visionRouter } from "./aiVision.js";

router.use(visionRouter);

export default router;
