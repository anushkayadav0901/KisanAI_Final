import { GROQ_API_KEY, GROQ_CHAT_URL } from "../config.js";

export interface FarmingInsightSection {
    heading: string;
    icon: string;
    content: string;
    tips: string[];
}

export interface FarmingInsights {
    title: string;
    introduction: string;
    sections: FarmingInsightSection[];
    expertAdvice?: string;
}

export interface GenerateFarmingInsightsParams {
    technique: string;
    farmSize: number | string;
    budget: number | string;
}

interface CallGroqOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

interface GroqChatResponse {
    choices?: Array<{
        message?: { content?: string };
    }>;
}

async function callGroq(
    systemPrompt: string,
    userPrompt: string,
    options: CallGroqOptions = {},
): Promise<string> {
    if (!GROQ_API_KEY)
        throw Object.assign(new Error("GROQ_API_KEY not set"), { status: 500 });

    const response = await fetch(GROQ_CHAT_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: options.model || "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: options.temperature ?? 0.4,
            max_tokens: options.maxTokens ?? 3000,
        }),
    });

    if (!response.ok) {
        const err = (await response
            .json()
            .catch(() => ({ error: { message: response.statusText } }))) as {
            error?: { message?: string };
        };
        throw Object.assign(new Error(err.error?.message || "Groq API error"), {
            status: response.status,
        });
    }

    const data = (await response.json()) as GroqChatResponse;
    return data.choices?.[0]?.message?.content?.trim() || "";
}

function parseJson<T>(text: string): T {
    let clean = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    const first = clean.indexOf("{");
    const last = clean.lastIndexOf("}");
    if (first !== -1 && last !== -1) clean = clean.substring(first, last + 1);
    return JSON.parse(clean) as T;
}

export async function generateFarmingInsights({
    technique,
    farmSize,
    budget,
}: GenerateFarmingInsightsParams): Promise<FarmingInsights> {
    const systemPrompt = `You are India's top agricultural consultant with 30 years of field experience. You give clear, step-by-step, jargon-free advice that any farmer can act on immediately. Your advice flows naturally — each section builds on the previous one, so the farmer gets a complete journey from preparation to profit.

IMPORTANT: Do NOT mention government subsidies, schemes, or success stories in your guide — those are provided separately. Focus ONLY on the practical, genuine, real-world farming knowledge. Give highly specific, non-generic advice. Avoid vague statements. Use exact measurements, names of specific chemicals/organic alternatives, temperatures, and exact timeframes.`;

    const userPrompt = `Generate real-world, highly specific practical farming tips for:
Technique: ${technique.replace(/_/g, " ")}
Farm Size: ${farmSize} acres
Budget: ${budget}

NOTE: The farmer already has an AI-generated analysis showing: investment costs, ROI projections, implementation timeline with phases, cost breakdown, and resource efficiency charts. So do NOT repeat any of that. Provide ONLY on-the-ground, genuine execution tactics.

Return ONLY valid JSON (no markdown, no extra text) with this structure:
{
  "title": "Practical Tips: ${technique.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}",
  "introduction": "2-3 sentences: ONE highly specific, advanced insight that the standard analysis above wouldn't cover — a real-world tip (e.g., specific soil pathogen issue, unique spacing trick, or hidden cost). Be direct and authoritative.",
  "sections": [
    {
      "heading": "Saving Money on Inputs",
      "icon": "indian-rupee",
      "content": "Practical ways to cut input costs for ${budget} budget. Include EXACT numbers: homemade organic alternatives, exact chemical/fertilizer substitutes, where to buy cheap, or cooperative bulk deals. 3-4 sentences.",
      "tips": ["(Specific cost-saving tip 1)", "(Specific cost-saving tip 2)"]
    },
    {
      "heading": "Where & How to Sell",
      "icon": "store",
      "content": "Best channels to sell ${technique.replace(/_/g, " ")} produce for maximum price. Include: mandi negotiation tips, exact quality parameters buyers look for (e.g., color, size grade), and specific platforms. 3-4 sentences.",
      "tips": ["(Selling tip 1)", "(Selling tip 2)"]
    }
  ]
}

RULES:
1. Do NOT repeat info about costs, ROI, financial projections, or timeline — those are already shown
2. Do NOT mention subsidies or government schemes — those are shown in a separate section
3. Do NOT mention YouTube videos or success stories — separate section
4. Use actual numbers: ₹ amounts, kg, quintals, liters, days, exact chemical/organic names
5. Simple language, no corporate jargon. Sound like a knowledgeable Indian farmer.
6. Be EXTREMELY specific to ${technique.replace(/_/g, " ")} — if you are writing generic tips that apply to any crop, you are failing your task.`;

    try {
        const text = await callGroq(systemPrompt, userPrompt, {
            maxTokens: 2500,
            temperature: 0.5,
        });
        return parseJson<FarmingInsights>(text);
    } catch (err) {
        console.error("[farmingAi] insights error:", err instanceof Error ? err.message : err);
        return {
            title: `Practical Tips: ${technique
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c: string) => c.toUpperCase())}`,
            introduction: `Your first step: visit your nearest KVK (Krishi Vigyan Kendra) for a free soil test and region-specific advice — call 1800-180-1551 (toll-free).`,
            sections: [
                {
                    heading: "Getting Started",
                    icon: "layers",
                    content:
                        "Get your soil tested, prepare a simple budget, and talk to 2-3 experienced farmers in your area who practice this technique. Join a local FPO for bulk input discounts.",
                    tips: [
                        "Soil health card is free from the government",
                        "Join a WhatsApp group of local farmers for daily tips",
                    ],
                },
            ],
            expertAdvice:
                "Start small — use 20% of your land for the first season. Keep records of every ₹ spent and earned from Day 1. Focus on soil health above all else.",
        };
    }
}
