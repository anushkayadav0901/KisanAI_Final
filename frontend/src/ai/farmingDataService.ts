/**
 * farmingDataService.ts — Frontend service for farming subsidies, videos & insights
 *
 * Calls the new /api/farming/* backend endpoints.
 */

const API_BASE_URL = import.meta.env.PROD
    ? "/api"
    : "http://localhost:3000/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Subsidy {
    id: string;
    name: string;
    ministry: string;
    category: string;
    summary: string;
    benefits: string;
    eligibility: string[];
    applicationProcess: string[];
    applicationUrl: string;
    sourceUrl: string;
    deadline: string;
    relevanceScore: number;
    oneLineSummary?: string;
}

export interface SubsidyResponse {
    subsidies: Subsidy[];
    totalResults: number;
    lastUpdated: string;
    source: string;
}

export interface SuccessVideo {
    id: string;
    title: string;
    channel: string;
    duration: string;
    views: string;
    summary: string;
    keyTakeaways: string[];
    embedUrl: string;
    thumbnail: string;
}

export interface RelatedVideo {
    id: string;
    title: string;
    channel: string;
    duration: string;
    embedUrl: string;
    thumbnail: string;
}

export interface VideoResponse {
    featuredVideo: SuccessVideo | null;
    relatedVideos: RelatedVideo[];
}

export interface InsightsSection {
    heading: string;
    icon: string;
    content: string;
    tips: string[];
}

export interface FarmingGuide {
    title: string;
    introduction: string;
    sections: InsightsSection[];
    quickFacts?: {
        bestSeason: string;
        breakEvenTime: string;
        waterRequirement: string;
        laborNeeded: string;
        expectedYield: string;
        profitMargin: string;
    };
    expertAdvice: string;
}

export interface InsightsResponse {
    guide: FarmingGuide;
    cacheHit: boolean;
}

// ── API Calls ─────────────────────────────────────────────────────────────────

export async function fetchSubsidies(
    technique: string,
    state?: string,
    budget?: string
): Promise<SubsidyResponse> {
    const response = await fetch(`${API_BASE_URL}/farming/subsidies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technique, state, budget }),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch subsidies: ${response.status}`);
    }

    return response.json();
}

export async function fetchSuccessVideos(
    technique: string
): Promise<VideoResponse> {
    const response = await fetch(`${API_BASE_URL}/farming/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technique }),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.status}`);
    }

    return response.json();
}

export async function fetchFarmingInsights(
    technique: string,
    farmSize: string,
    budget: string
): Promise<InsightsResponse> {
    const response = await fetch(`${API_BASE_URL}/farming/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technique, farmSize, budget }),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch insights: ${response.status}`);
    }

    return response.json();
}
