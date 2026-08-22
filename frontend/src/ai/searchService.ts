import axios from "axios";

const API_BASE_URL = import.meta.env.PROD
  ? "/api"
  : "http://localhost:3000/api";

export interface SearchResult {
  title: string;
  snippet: string;
  source: string;
  url?: string;
  relevance: "high" | "medium" | "low";
}

export interface SearchResponse {
  results: SearchResult[];
  summary: string;
  relatedQueries: string[];
}

/**
 * Search using Groq Kimi K2.5 for agricultural web search
 */
export async function searchWithKimi(
  query: string,
  context?: string,
): Promise<SearchResponse> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/ai/search`,
      { query, context },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      },
    );

    return response.data as SearchResponse;
  } catch (error) {
    console.error("Search error:", error);
    return {
      results: [],
      summary: "Search unavailable at this time.",
      relatedQueries: [],
    };
  }
}
