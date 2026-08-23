import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

import { GROQ_API_KEY, GROQ_CHAT_URL } from "../config.js";
import { cacheGet, cacheSet } from "./farmingCache.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, "..", "data", "farmingData.json");

const SUBSIDY_CACHE_TTL = 6 * 60 * 60;

export interface SubsidyScheme {
    id?: string;
    name?: string;
    ministry?: string;
    category?: string;
    summary?: string;
    benefits?: string;
    eligibility?: string[];
    applicationProcess?: string[];
    applicationUrl?: string;
    sourceUrl?: string;
    deadline?: string;
    relevanceScore?: number;
}

export interface GovtScheme {
    schemeName: string;
    description: string;
    eligibility: string;
    contactNumber: string;
    websiteUrl: string;
    compensationDetails: string;
}

export interface SubsidiesResult {
    subsidies: SubsidyScheme[];
    totalResults: number;
    lastUpdated: string;
    source: "web-search" | "curated";
}

export interface GovtSchemesResult {
    schemes: GovtScheme[];
    totalResults: number;
    lastUpdated: string;
    source: "web-search" | "curated";
}

interface SearchResult {
    title: string;
    snippet: string;
    url: string;
}

interface FarmingDataJson {
    subsidies?: Record<string, SubsidyScheme[]>;
}

interface GroqChatResponse {
    choices?: Array<{
        message?: { content?: string };
    }>;
}

const TECHNIQUE_SEARCH_MAP: Record<string, string> = {
    integrated_farming: "fish farming aquaculture",
    organic_farming: "organic farming",
    rainwater_farming: "rainwater harvesting agriculture",
    precision_agriculture: "precision agriculture",
    hydroponics: "hydroponic farming",
    aquaponics: "aquaponics",
    vertical_farming: "vertical farming",
    mushroom_farming: "mushroom cultivation",
    dairy_farming: "dairy farming",
    poultry_farming: "poultry farming",
    sericulture: "silk sericulture",
    apiculture: "beekeeping apiculture",
};

function resolveKey(technique: string): string {
    const t = technique?.toLowerCase().replace(/\s+/g, "_") || "";
    if (t.includes("organic")) return "organic_farming";
    if (t.includes("rain") || t.includes("water")) return "rainwater_farming";
    if (t.includes("fish") || t.includes("integrated") || t.includes("aqua"))
        return "integrated_farming";
    return "default";
}

async function loadStaticSubsidies(key: string): Promise<SubsidyScheme[]> {
    try {
        const raw = await readFile(DATA_PATH, "utf-8");
        const data = JSON.parse(raw) as FarmingDataJson;
        return data.subsidies?.[key] || data.subsidies?.["default"] || [];
    } catch (err) {
        console.error("[farmingScraper] static data load error:", err instanceof Error ? err.message : err);
        return [];
    }
}

function extractActualUrl(rawUrl: string): string {
    let actualUrl = rawUrl;
    const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
    if (uddgMatch?.[1]) {
        actualUrl = decodeURIComponent(uddgMatch[1]);
    }
    return actualUrl;
}

function parseDuckDuckGoHtml(html: string): SearchResult[] {
    const results: SearchResult[] = [];
    const resultRegex =
        /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    let match: RegExpExecArray | null;
    while ((match = resultRegex.exec(html)) !== null && results.length < 10) {
        const rawUrl = match[1];
        const titleHtml = match[2];
        const snippetHtml = match[3];
        if (rawUrl === undefined || titleHtml === undefined || snippetHtml === undefined)
            continue;

        const title = titleHtml.replace(/<[^>]*>/g, "").trim();
        const snippet = snippetHtml.replace(/<[^>]*>/g, "").trim();
        const actualUrl = extractActualUrl(rawUrl);

        if (title && title.length > 5) {
            results.push({ title, snippet, url: actualUrl });
        }
    }
    return results;
}

async function scrapeDuckDuckGo(searchTerm: string): Promise<SearchResult[]> {
    try {
        const query = `site:gov.in ${searchTerm} subsidy scheme farmer India 2024 2025`;
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });

        if (!response.ok) {
            console.error(`[farmingScraper] DuckDuckGo error: ${response.status}`);
            return [];
        }

        const html = await response.text();

        const results = parseDuckDuckGoHtml(html);

        console.log(
            `[farmingScraper] DuckDuckGo found ${results.length} results for "${searchTerm}"`,
        );
        return results;
    } catch (err) {
        console.error("[farmingScraper] DuckDuckGo scrape error:", err instanceof Error ? err.message : err);
        return [];
    }
}

function readGroqContent(data: GroqChatResponse): string | null {
    return data.choices?.[0]?.message?.content?.trim() || null;
}

async function enrichWithLlama(
    searchResults: SearchResult[],
    technique: string,
): Promise<SubsidyScheme[] | null> {
    if (!GROQ_API_KEY || searchResults.length === 0) return null;

    const techniqueName = technique.replace(/_/g, " ");
    const resultsText = searchResults
        .map(
            (r, i) =>
                `${i + 1}. Title: ${r.title}\n   URL: ${r.url}\n   Snippet: ${r.snippet}`,
        )
        .join("\n\n");

    try {
        const response = await fetch(GROQ_CHAT_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: `You are a government agricultural scheme expert. You identify and explain Indian government subsidies in simple farmer-friendly language. You ONLY output valid JSON — no markdown, no extra text.`,
                    },
                    {
                        role: "user",
                        content: `From these search results about "${techniqueName}" farming subsidies, extract the top 5 most relevant government schemes.

Search Results:
${resultsText}

For each scheme, return structured data. Use the REAL URLs from the search results.
If a result doesn't look like a real subsidy scheme, skip it.

Return ONLY valid JSON (no markdown fences):
{
  "subsidies": [
    {
      "id": "scheme-1",
      "name": "Official Scheme Name",
      "ministry": "Ministry/Department name",
      "category": "Category (e.g. Direct Benefit, Equipment Subsidy, Credit, Insurance)",
      "summary": "2-3 sentence farmer-friendly explanation of what this scheme gives",
      "benefits": "Exact financial benefit (₹X or Y% subsidy)",
      "eligibility": ["Who can apply - criterion 1", "criterion 2", "criterion 3"],
      "applicationProcess": ["Step 1 to apply", "Step 2", "Step 3"],
      "applicationUrl": "real URL from search results",
      "sourceUrl": "real URL from search results",
      "deadline": "Open enrollment / deadline if mentioned",
      "relevanceScore": 90
    }
  ]
}

RULES:
- Use REAL URLs from the search results above — do not make up URLs
- Keep summaries in simple language a farmer can understand
- relevanceScore: how useful this scheme is for "${techniqueName}" specifically (0-100)
- If fewer than 5 relevant schemes found, return only what you find
- Include PM-KISAN and KCC if they appear (they apply to all farmers)`,
                    },
                ],
                temperature: 0.3,
                max_tokens: 2500,
            }),
        });

        if (!response.ok) {
            console.error(
                `[farmingScraper] llama enrichment error: ${response.status}`,
            );
            return null;
        }

        const data = (await response.json()) as GroqChatResponse;
        const content = readGroqContent(data);
        if (!content) return null;

        let clean = content
            .replace(/```json\s*/gi, "")
            .replace(/```/g, "")
            .trim();
        const first = clean.indexOf("{");
        const last = clean.lastIndexOf("}");
        if (first !== -1 && last !== -1) clean = clean.substring(first, last + 1);

        const parsed = JSON.parse(clean) as { subsidies?: SubsidyScheme[] };
        const subsidies = parsed.subsidies || [];

        if (subsidies.length > 0) {
            console.log(
                `[farmingScraper] Enriched ${subsidies.length} schemes for "${techniqueName}"`,
            );
            return subsidies;
        }

        return null;
    } catch (err) {
        console.error("[farmingScraper] enrichment error:", err instanceof Error ? err.message : err);
        return null;
    }
}

export async function getSubsidies(
    technique: string,
    state?: string,
    budget?: string,
): Promise<SubsidiesResult> {
    const key = resolveKey(technique);
    const cacheKey = `subsidies:${technique}:${state || "all"}`;

    const cached = cacheGet<SubsidiesResult>(cacheKey);
    if (cached) {
        console.log(`[farmingScraper] Cache hit for "${cacheKey}"`);
        return cached;
    }

    const searchTerm =
        TECHNIQUE_SEARCH_MAP[technique] || technique.replace(/_/g, " ");

    const searchResults = await scrapeDuckDuckGo(searchTerm);

    let subsidies: SubsidyScheme[] | null = null;
    let source: "web-search" | "curated" = "web-search";

    if (searchResults.length > 0) {
        subsidies = await enrichWithLlama(searchResults, technique);
    }

    if (!subsidies || subsidies.length === 0) {
        subsidies = await loadStaticSubsidies(key);
        source = "curated";
        console.log(`[farmingScraper] Using curated data for "${key}"`);
    }

    subsidies.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    const result: SubsidiesResult = {
        subsidies,
        totalResults: subsidies.length,
        lastUpdated: new Date().toISOString(),
        source,
    };

    cacheSet(cacheKey, result, SUBSIDY_CACHE_TTL);

    return result;
}

export async function manualScrape(technique: string): Promise<SubsidiesResult> {
    const { cacheInvalidate } = await import("./farmingCache.js");
    cacheInvalidate(`subsidies:${technique}`);
    return getSubsidies(technique);
}

const GOVT_SCHEME_CACHE_TTL = 6 * 60 * 60;

async function scrapeDuckDuckGoRaw(query: string): Promise<SearchResult[]> {
    try {
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });

        if (!response.ok) return [];

        const html = await response.text();
        return parseDuckDuckGoHtml(html);
    } catch (err) {
        console.error("[farmingScraper] DuckDuckGo raw scrape error:", err instanceof Error ? err.message : err);
        return [];
    }
}

async function enrichGovtSchemesWithLlama(
    searchResults: SearchResult[],
    cropIssue: string,
    cropName?: string,
    state?: string,
): Promise<GovtScheme[] | null> {
    if (!GROQ_API_KEY || searchResults.length === 0) return null;

    const resultsText = searchResults
        .map(
            (r, i) =>
                `${i + 1}. Title: ${r.title}\n   URL: ${r.url}\n   Snippet: ${r.snippet}`,
        )
        .join("\n\n");

    try {
        const response = await fetch(GROQ_CHAT_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: `You are an expert on Indian government agricultural schemes and subsidies. You help farmers understand what government support is available. Output ONLY valid JSON — no markdown, no extra text.`,
                    },
                    {
                        role: "user",
                        content: `From these search results about government schemes for farmers${cropIssue ? ` dealing with "${cropIssue}"` : ""}${cropName ? ` growing "${cropName}"` : ""}${state ? ` in ${state}` : ""}, extract the most relevant government schemes.

Search Results:
${resultsText}

Return ONLY valid JSON (no markdown fences):
{
  "schemes": [
    {
      "schemeName": "Official scheme name",
      "description": "2-3 sentence farmer-friendly explanation of what this scheme provides",
      "eligibility": "Who can apply for this scheme",
      "contactNumber": "Helpline number if mentioned (e.g., 1800-180-1551)",
      "websiteUrl": "REAL .gov.in URL from search results — do NOT make up URLs",
      "compensationDetails": "What financial benefit/compensation the farmer gets"
    }
  ]
}

RULES:
- Use REAL URLs from the search results — never fabricate URLs
- Include schemes like PMFBY, PM-KISAN, KCC, Soil Health Card if they appear
- Keep descriptions in simple language a farmer can understand
- Include helpline numbers when available
- Return 3-6 most relevant schemes
- If a result doesn't look like a real government scheme, skip it`,
                    },
                ],
                temperature: 0.3,
                max_tokens: 2000,
            }),
        });

        if (!response.ok) {
            console.error(
                `[farmingScraper] govt scheme enrichment error: ${response.status}`,
            );
            return null;
        }

        const data = (await response.json()) as GroqChatResponse;
        const content = readGroqContent(data);
        if (!content) return null;

        let clean = content
            .replace(/```json\s*/gi, "")
            .replace(/```/g, "")
            .trim();
        const first = clean.indexOf("{");
        const last = clean.lastIndexOf("}");
        if (first !== -1 && last !== -1) clean = clean.substring(first, last + 1);

        const parsed = JSON.parse(clean) as { schemes?: GovtScheme[] };
        const schemes = parsed.schemes || [];

        if (schemes.length > 0) {
            console.log(
                `[farmingScraper] Enriched ${schemes.length} govt schemes for monitoring`,
            );
            return schemes;
        }

        return null;
    } catch (err) {
        console.error(
            "[farmingScraper] govt scheme enrichment error:",
            err instanceof Error ? err.message : err,
        );
        return null;
    }
}

export async function getGovtSchemes(
    cropIssue: string,
    cropName?: string,
    state?: string,
): Promise<GovtSchemesResult> {
    const cacheKey = `govt-schemes:${cropIssue}:${cropName || "general"}:${state || "all"}`;

    const cached = cacheGet<GovtSchemesResult>(cacheKey);
    if (cached) {
        console.log(`[farmingScraper] Govt schemes cache hit for "${cacheKey}"`);
        return cached;
    }

    const searchQueries = [
        `site:gov.in ${cropIssue || "crop"} farmer scheme subsidy India 2025`,
        `site:gov.in ${cropName || "agriculture"} crop insurance compensation India`,
    ];
    if (state) {
        searchQueries.push(`site:gov.in ${state} agriculture farmer scheme 2025`);
    }

    let allResults: SearchResult[] = [];
    for (const query of searchQueries) {
        const results = await scrapeDuckDuckGoRaw(query);
        allResults = allResults.concat(results);
    }

    const seen = new Set<string>();
    allResults = allResults.filter((r) => {
        if (seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
    });

    console.log(
        `[farmingScraper] Govt schemes: ${allResults.length} total results for "${cropIssue}"`,
    );

    let schemes: GovtScheme[] | null = null;
    let source: "web-search" | "curated" = "web-search";

    if (allResults.length > 0) {
        schemes = await enrichGovtSchemesWithLlama(
            allResults,
            cropIssue,
            cropName,
            state,
        );
    }

    if (!schemes || schemes.length === 0) {
        schemes = getStaticGovtSchemes(cropIssue);
        source = "curated";
        console.log(`[farmingScraper] Using curated govt schemes fallback`);
    }

    const result: GovtSchemesResult = {
        schemes,
        totalResults: schemes.length,
        lastUpdated: new Date().toISOString(),
        source,
    };

    cacheSet(cacheKey, result, GOVT_SCHEME_CACHE_TTL);

    return result;
}

function getStaticGovtSchemes(cropIssue: string): GovtScheme[] {
    const schemes: GovtScheme[] = [
        {
            schemeName: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
            description:
                "Crop insurance scheme that protects farmers against crop loss due to natural calamities, pests, and diseases. Provides financial support when crops are damaged.",
            eligibility: "All farmers growing notified crops in notified areas",
            contactNumber: "1800-180-1551",
            websiteUrl: "https://pmfby.gov.in",
            compensationDetails:
                "Up to 100% of sum insured for crop loss. Premium: 2% for Kharif, 1.5% for Rabi crops.",
        },
        {
            schemeName: "PM-KISAN Samman Nidhi",
            description:
                "Direct income support of ₹6,000 per year transferred in 3 installments to all landholding farmer families.",
            eligibility: "All landholding farmer families",
            contactNumber: "155261",
            websiteUrl: "https://pmkisan.gov.in",
            compensationDetails: "₹6,000/year (₹2,000 every 4 months)",
        },
        {
            schemeName: "Kisan Credit Card (KCC)",
            description:
                "Provides affordable credit to farmers for crop cultivation, post-harvest expenses, and farm maintenance at subsidized interest rates.",
            eligibility: "All farmers, sharecroppers, tenant farmers",
            contactNumber: "1800-180-1551",
            websiteUrl: "https://www.pmjdy.gov.in/scheme",
            compensationDetails:
                "Credit up to ₹3 lakh at 4% interest (with subvention)",
        },
        {
            schemeName: "Soil Health Card Scheme",
            description:
                "Free soil testing and nutrient-based recommendations for your farm. Helps optimize fertilizer use and improve crop yield.",
            eligibility: "All farmers",
            contactNumber: "1800-180-1551",
            websiteUrl: "https://soilhealth.dac.gov.in",
            compensationDetails: "Free soil testing and expert recommendations",
        },
    ];

    if (cropIssue) {
        schemes.push({
            schemeName: "National Agriculture Market (e-NAM)",
            description:
                "Online trading platform for agricultural commodities. Helps farmers get better prices by connecting to multiple markets.",
            eligibility: "All farmers with produce to sell",
            contactNumber: "1800-270-0224",
            websiteUrl: "https://enam.gov.in",
            compensationDetails:
                "Better market prices through transparent online trading",
        });
    }

    return schemes;
}
