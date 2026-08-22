/**
 * farmingVideos.js — YouTube success story video fetcher
 *
 * Approach: Directly scrapes YouTube search results page via HTTP fetch.
 * Parses the embedded ytInitialData JSON to extract real video IDs, titles,
 * channels, and view counts. Then uses Groq llama (NOT compound-beta) to
 * generate a farmer-friendly summary.
 *
 * No external packages needed — just native fetch + regex.
 * Fallback: static curated data from farmingData.json
 */

import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

import { GROQ_API_KEY, GROQ_CHAT_URL } from "../config.js";
import { cacheGet, cacheSet } from "./farmingCache.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, "..", "data", "farmingData.json");

// Cache TTL: 12 hours for video data
const VIDEO_CACHE_TTL = 12 * 60 * 60;

// YouTube search URL
const YT_SEARCH_URL = "https://www.youtube.com/results";

/**
 * Map a technique ID to the data key (for static fallback).
 */
function resolveKey(technique) {
    const t = technique?.toLowerCase().replace(/\s+/g, "_") || "";
    if (t.includes("organic")) return "organic_farming";
    if (t.includes("rain") || t.includes("water")) return "rainwater_farming";
    if (t.includes("fish") || t.includes("integrated") || t.includes("aqua"))
        return "integrated_farming";
    return "default";
}

/**
 * Load video data from static JSON (fallback).
 */
async function loadStaticVideos(key) {
    try {
        const raw = await readFile(DATA_PATH, "utf-8");
        const data = JSON.parse(raw);
        const entry = data.videos?.[key] || data.videos?.["default"];
        if (!entry) return null;

        const featured = entry.featured;
        return {
            featuredVideo: {
                ...featured,
                embedUrl: `https://www.youtube.com/embed/${featured.id}?rel=0&modestbranding=1`,
                thumbnail: `https://img.youtube.com/vi/${featured.id}/hqdefault.jpg`,
            },
            relatedVideos: (entry.related || []).map((v) => ({
                ...v,
                embedUrl: `https://www.youtube.com/embed/${v.id}?rel=0&modestbranding=1`,
                thumbnail:
                    v.thumbnail || `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
            })),
        };
    } catch (err) {
        console.error("[farmingVideos] static data error:", err.message);
        return null;
    }
}

/**
 * Scrape YouTube search results directly via HTTP fetch.
 * Extracts video data from the ytInitialData JSON embedded in the page.
 *
 * @param {string} query — search query
 * @returns {Promise<object[]>} — array of { id, title, channel, views, duration }
 */
async function scrapeYouTubeSearch(query) {
    try {
        const searchUrl = `${YT_SEARCH_URL}?search_query=${encodeURIComponent(query)}`;

        const response = await fetch(searchUrl, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                Accept: "text/html,application/xhtml+xml",
            },
        });

        if (!response.ok) {
            console.error(`[farmingVideos] YouTube fetch error: ${response.status}`);
            return [];
        }

        const html = await response.text();

        // Extract ytInitialData JSON from the page
        const dataMatch = html.match(
            /var\s+ytInitialData\s*=\s*({.+?});\s*<\/script>/s
        );

        if (!dataMatch?.[1]) {
            console.error("[farmingVideos] Could not find ytInitialData in page");
            return [];
        }

        const ytData = JSON.parse(dataMatch[1]);

        // Navigate to the video results
        const contents =
            ytData?.contents?.twoColumnSearchResultsRenderer?.primaryContents
                ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents ||
            [];

        const videos = [];

        for (const item of contents) {
            const renderer = item.videoRenderer;
            if (!renderer) continue; // Skip ads, playlists, channels, etc.

            const videoId = renderer.videoId;
            if (!videoId) continue;

            const title =
                renderer.title?.runs?.map((r) => r.text).join("") || "Untitled";
            const channel =
                renderer.ownerText?.runs?.[0]?.text || "Unknown Channel";
            const viewsText =
                renderer.viewCountText?.simpleText ||
                renderer.viewCountText?.runs?.map((r) => r.text).join("") ||
                "";
            const durationText =
                renderer.lengthText?.simpleText ||
                renderer.lengthText?.accessibility?.accessibilityData?.label ||
                "";

            // Parse view count for sorting
            let viewCount = 0;
            const viewMatch = viewsText.match(/([\d,.]+)\s*(K|M|lakh|crore)?/i);
            if (viewMatch) {
                viewCount = parseFloat(viewMatch[1].replace(/,/g, ""));
                const multiplier = viewMatch[2]?.toLowerCase();
                if (multiplier === "k") viewCount *= 1000;
                else if (multiplier === "m") viewCount *= 1000000;
                else if (multiplier === "lakh") viewCount *= 100000;
                else if (multiplier === "crore") viewCount *= 10000000;
            }

            videos.push({
                id: videoId,
                title,
                channel,
                views: viewsText.replace(" views", "").trim() || "—",
                duration: durationText,
                viewCount,
            });
        }

        // Sort by view count (most popular first) and take top results
        videos.sort((a, b) => b.viewCount - a.viewCount);

        console.log(
            `[farmingVideos] Scraped ${videos.length} videos from YouTube for "${query}"`
        );
        return videos;
    } catch (err) {
        console.error("[farmingVideos] YouTube scrape error:", err.message);
        return [];
    }
}

/**
 * Generate a farmer-friendly summary for a video using Groq llama
 * (NOT compound-beta, to avoid rate limits).
 *
 * @param {string} title — video title
 * @param {string} technique — farming technique
 * @returns {Promise<{ summary: string, keyTakeaways: string[] }>}
 */
async function generateVideoSummary(title, technique) {
    if (!GROQ_API_KEY) {
        return {
            summary: `Watch this success story about ${technique.replace(/_/g, " ")} farming to learn practical tips from an experienced farmer.`,
            keyTakeaways: [
                "Learn from real farmer experience",
                "Understand practical challenges and solutions",
                "Get inspired by actual success numbers",
            ],
        };
    }

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
                        content:
                            "You write short, inspiring summaries of farming success stories for Indian farmers. Be factual and motivating.",
                    },
                    {
                        role: "user",
                        content: `Based on this YouTube video title about ${technique.replace(/_/g, " ")} farming:
"${title}"

Write a JSON response (no markdown):
{
  "summary": "3-4 sentence summary of what this farmer likely achieved. Mention the technique, estimated scale, and why this is inspiring. Be realistic.",
  "keyTakeaways": [
    "Practical lesson 1 a viewer would learn",
    "Practical lesson 2",
    "Practical lesson 3",
    "Practical lesson 4",
    "Practical lesson 5"
  ]
}`,
                    },
                ],
                temperature: 0.5,
                max_tokens: 800,
            }),
        });

        if (!response.ok) return null;

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) return null;

        let clean = content.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
        const first = clean.indexOf("{");
        const last = clean.lastIndexOf("}");
        if (first !== -1 && last !== -1) clean = clean.substring(first, last + 1);

        return JSON.parse(clean);
    } catch (err) {
        console.error("[farmingVideos] summary generation error:", err.message);
        return null;
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get success story videos for a farming technique.
 *
 * Flow:
 *   1. Check cache
 *   2. Scrape YouTube search for real videos
 *   3. Generate AI summary for the top video
 *   4. Fallback to static curated data
 *
 * @param {string} technique
 * @returns {Promise<{ featuredVideo: object, relatedVideos: object[] }>}
 */
export async function getSuccessVideos(technique) {
    const cacheKey = `videos:${technique}`;

    // 1. Check cache
    const cached = cacheGet(cacheKey);
    if (cached) {
        console.log(`[farmingVideos] Cache hit for "${cacheKey}"`);
        return cached;
    }

    const techniqueName = technique.replace(/_/g, " ");

    // Map technique IDs to specific, focused search terms
    // This ensures we search for the exact farming type the user selected
    const searchTermMap = {
        integrated_farming: "fish farming",
        organic_farming: "organic farming",
        rainwater_farming: "rainwater harvesting farming",
        precision_agriculture: "precision agriculture",
        hydroponics: "hydroponic farming",
        aquaponics: "aquaponics farming",
        vertical_farming: "vertical farming",
        permaculture: "permaculture farming",
        agroforestry: "agroforestry",
        mushroom_farming: "mushroom farming",
        dairy_farming: "dairy farming",
        poultry_farming: "poultry farming",
        sericulture: "silk farming sericulture",
        apiculture: "bee keeping honey farming",
    };

    const searchTerm =
        searchTermMap[technique] || techniqueName;

    // 2. Scrape YouTube search
    const searchQueries = [
        `${searchTerm} success story farmer India`,
        `${searchTerm} profit India farmer`,
    ];

    let allVideos = [];
    for (const query of searchQueries) {
        const videos = await scrapeYouTubeSearch(query);
        allVideos.push(...videos);
        if (allVideos.length >= 5) break; // Enough results
    }

    // Deduplicate by video ID
    const seen = new Set();
    allVideos = allVideos.filter((v) => {
        if (seen.has(v.id)) return false;
        seen.add(v.id);
        return true;
    });

    if (allVideos.length > 0) {
        const featured = allVideos[0];
        const related = allVideos.slice(1, 3);

        // 3. Generate summary for the featured video
        const summaryData = await generateVideoSummary(featured.title, technique);

        const result = {
            featuredVideo: {
                id: featured.id,
                title: featured.title,
                channel: featured.channel,
                duration: featured.duration,
                views: featured.views,
                summary:
                    summaryData?.summary ||
                    `A real success story showing how ${techniqueName} can be profitable in India.`,
                keyTakeaways: summaryData?.keyTakeaways || [
                    "Real farmer experience with practical tips",
                    "Understand actual costs and returns",
                    "Learn from challenges faced and overcome",
                ],
                embedUrl: `https://www.youtube.com/embed/${featured.id}?rel=0&modestbranding=1`,
                thumbnail: `https://img.youtube.com/vi/${featured.id}/hqdefault.jpg`,
            },
            relatedVideos: related.map((v) => ({
                id: v.id,
                title: v.title,
                channel: v.channel,
                duration: v.duration,
                embedUrl: `https://www.youtube.com/embed/${v.id}?rel=0&modestbranding=1`,
                thumbnail: `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
            })),
        };

        console.log(
            `[farmingVideos] Serving "${featured.title}" for "${techniqueName}"`
        );

        // 4. Cache
        cacheSet(cacheKey, result, VIDEO_CACHE_TTL);
        return result;
    }

    // 5. Fallback to static curated data
    const key = resolveKey(technique);
    const staticResult = await loadStaticVideos(key);
    console.log(`[farmingVideos] Using curated fallback for "${key}"`);

    if (staticResult) {
        cacheSet(cacheKey, staticResult, VIDEO_CACHE_TTL);
        return staticResult;
    }

    return { featuredVideo: null, relatedVideos: [] };
}
