import { Router, type Request, type Response } from "express";
import { LOCAL_VISION_FIRST } from "../config.js";
import { callGemini, parseGeminiJson } from "../lib/gemini.js";
import {
  isOllamaAvailable,
  ollamaStatus,
  ollamaVision,
  parseLooseJson,
} from "../lib/ollama.js";

export const visionRouter = Router();

type VisionProvider = "ollama" | "gemini";
type ProviderChoice = "auto" | VisionProvider;

interface VisionRequestBody {
  image?: string;
  mode?: string;
  provider?: ProviderChoice;
}

interface VisionSuccess {
  provider: VisionProvider;
  degraded?: boolean;
  fallbackReason?: string;
  [key: string]: unknown;
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
} as const;

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

interface RunOptions {
  prompt: string;
  imageB64: string;
  temperature: number;
  maxOutputTokens: number;
}

async function runOllama(opts: RunOptions): Promise<Record<string, unknown>> {
  if (!(await isOllamaAvailable())) {
    throw new ProviderError("ollama", "local model unavailable");
  }
  try {
    const text = await ollamaVision({
      prompt: opts.prompt,
      imageB64: opts.imageB64,
      temperature: opts.temperature,
      numPredict: opts.maxOutputTokens,
    });
    return parseLooseJson(text);
  } catch (err) {
    throw new ProviderError(
      "ollama",
      err instanceof Error ? err.message : String(err),
    );
  }
}

async function runGemini(opts: RunOptions): Promise<Record<string, unknown>> {
  try {
    const text = await callGemini({
      prompt: opts.prompt,
      imageB64: opts.imageB64,
      generationConfig: {
        temperature: opts.temperature,
        maxOutputTokens: opts.maxOutputTokens,
      },
    });
    return parseGeminiJson(text);
  } catch (err) {
    throw new ProviderError(
      "gemini",
      err instanceof Error ? err.message : String(err),
    );
  }
}

interface VisionOutcome {
  data: Record<string, unknown>;
  provider: VisionProvider;
  degraded?: boolean;
  fallbackReason?: string;
  errors: ProviderError[];
}

async function runVision(
  choice: ProviderChoice,
  opts: RunOptions,
): Promise<VisionOutcome> {
  const errors: ProviderError[] = [];
  let lastData: Record<string, unknown> = {};

  async function attempt(provider: VisionProvider): Promise<ProviderError | null> {
    try {
      lastData =
        provider === "ollama" ? await runOllama(opts) : await runGemini(opts);
      return null;
    } catch (err) {
      const pe =
        err instanceof ProviderError
          ? err
          : new ProviderError(provider, String(err));
      console.error(`[ai/vision] ${pe.message}`);
      errors.push(pe);
      return pe;
    }
  }

  if (choice === "ollama") {
    const err = await attempt("ollama");
    if (err) throw errors;
    return { data: lastData, provider: "ollama", errors };
  }

  if (choice === "gemini") {
    const err = await attempt("gemini");
    if (err) throw errors;
    return { data: lastData, provider: "gemini", errors };
  }

  if (!LOCAL_VISION_FIRST) {
    const err = await attempt("gemini");
    if (err) throw errors;
    return { data: lastData, provider: "gemini", errors };
  }

  const localErr = await attempt("ollama");
  if (!localErr) {
    return { data: lastData, provider: "ollama", errors };
  }

  const geminiErr = await attempt("gemini");
  if (!geminiErr) {
    return {
      data: lastData,
      provider: "gemini",
      degraded: true,
      fallbackReason: `local vision failed: ${localErr.message}`,
      errors,
    };
  }

  throw errors;
}

visionRouter.get("/local-vision/health", async (_req: Request, res: Response) => {
  await isOllamaAvailable(0);
  res.json({
    ...ollamaStatus(),
    fallback: "gemini",
    localFirst: LOCAL_VISION_FIRST,
  });
});

visionRouter.post("/vision-commentary", async (req: Request, res: Response) => {
  const body = req.body as VisionRequestBody;
  if (!body.image) return res.status(400).json({ error: "No image provided" });

  const mode: keyof typeof VISION_PROMPTS = body.mode === "detailed" ? "detailed" : "live";

  try {
    const outcome = await runVision(body.provider ?? "auto", {
      prompt: VISION_PROMPTS[mode],
      imageB64: body.image,
      temperature: 0.4,
      maxOutputTokens: mode === "detailed" ? 1024 : 256,
    });
    const payload: VisionSuccess = {
      ...outcome.data,
      provider: outcome.provider,
    };
    if (outcome.degraded) {
      payload.degraded = true;
      payload.fallbackReason = outcome.fallbackReason;
    }
    res.json(payload);
  } catch (err) {
    res.status(502).json({ error: describeFailure(err) });
  }
});

visionRouter.post("/analyze-frame", async (req: Request, res: Response) => {
  const body = req.body as VisionRequestBody;
  if (!body.image) return res.status(400).json({ error: "No image provided" });

  const imageB64 = body.image.includes(",") ? body.image.split(",")[1] ?? "" : body.image;

  try {
    const outcome = await runVision(body.provider ?? "auto", {
      prompt: FRAME_ANALYSIS_PROMPT,
      imageB64,
      temperature: 0.2,
      maxOutputTokens: 1024,
    });
    const payload: VisionSuccess = {
      ...outcome.data,
      provider: outcome.provider,
    };
    if (outcome.degraded) {
      payload.degraded = true;
      payload.fallbackReason = outcome.fallbackReason;
    }
    res.json(payload);
  } catch (err) {
    res.status(502).json({ error: describeFailure(err) });
  }
});

function describeFailure(err: unknown): string {
  if (Array.isArray(err)) {
    return `all vision providers failed: ${(err as ProviderError[])
      .map((e) => e.message)
      .join("; ")}`;
  }
  return err instanceof Error ? err.message : String(err);
}
