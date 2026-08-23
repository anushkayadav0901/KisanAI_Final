import axios from "axios";
import { searchWithKimi, SearchResult } from "./searchService";
import { parseModelJson } from "./parseModelJson";

const API_BASE_URL = import.meta.env.PROD
  ? "/api"
  : "http://localhost:3000/api";

interface LogEntry {
  id: string;
  timestamp: number;
  timeString: string;
  message: string;
  type: "observation" | "alert" | "error";
  detections?: any[];
}

interface WeatherData {
  name: string;
  main: { temp: number; humidity: number; feels_like: number };
  weather: Array<{ main: string; description: string; icon: string }>;
  wind: { speed: number };
}

interface LocationInfo {
  city: string;
  lat: number;
  lon: number;
}

export interface DiseaseStage {
  stage: string;
  description: string;
  duration: string;
  symptoms: string[];
  isCurrent: boolean;
}

export interface PreventionMeasure {
  measure: string;
  priority: "critical" | "high" | "medium" | "low";
  type: "natural" | "pesticide" | "biological" | "cultural" | "mechanical";
  estimatedCost: string;
  timeToImplement: string;
  effectiveness: number;
}

export interface VideoResource {
  title: string;
  channel: string;
  description: string;
  thumbnailUrl?: string;
  searchQuery: string;
}

export interface GovernmentResource {
  schemeName: string;
  description: string;
  eligibility: string;
  contactNumber?: string;
  websiteUrl?: string;
  compensationDetails?: string;
}

export interface ComprehensiveSessionReport {
  weatherReport: {
    currentConditions: string;
    temperature: number;
    humidity: number;
    impactOnDisease: string;
    favorableConditions: string[];
    unfavorableConditions: string[];
  };

  diseaseAnalysis: {
    diseaseName: string | null;
    isDetected: boolean;
    confidence: number;
    currentStage: string;
    allStages: DiseaseStage[];
    stageImpact: string;
    progressionRisk: "low" | "medium" | "high" | "severe";
    spreadPrediction: string;
  };

  preventionMeasures: PreventionMeasure[];

  videoRecommendations: VideoResource[];
  articleLinks: {
    title: string;
    source: string;
    url?: string;
    searchHint?: string;
    description: string;
  }[];

  governmentResources: GovernmentResource[];

  summary: string;
  keyFindings: string[];
  immediateActions: string[];
  followUpRecommendations: string[];
}

export async function generateComprehensiveReport(
  sessionDuration: number,
  sessionLog: LogEntry[],
  weather: WeatherData | null,
  location: LocationInfo | null,
  healthScores: number[],
): Promise<ComprehensiveSessionReport> {
  const alerts = sessionLog.filter((e) => e.type === "alert");
  const observations = sessionLog.filter((e) => e.type === "observation");
  const avgHealth =
    healthScores.length > 0
      ? Math.round(
          healthScores.reduce((a, b) => a + b, 0) / healthScores.length,
        )
      : 0;

  const detectedIssues = extractIssuesFromLogs(sessionLog);

  const prompt = `You are an expert agricultural AI assistant. Analyze this monitoring session data and generate a comprehensive JSON report for a farmer in India.

SESSION DATA:
${JSON.stringify(
  {
    duration: `${Math.floor(sessionDuration / 60)}m ${sessionDuration % 60}s`,
    location: location?.city || "Unknown",
    weather: weather
      ? {
          temperature: weather.main.temp,
          humidity: weather.main.humidity,
          conditions: weather.weather[0]?.description,
          windSpeed: weather.wind.speed,
        }
      : null,
    averageHealth: avgHealth,
    totalAlerts: alerts.length,
    totalObservations: observations.length,
    detectedIssues: detectedIssues,
    logEntries: sessionLog.slice(-20).map((e) => ({
      time: e.timeString,
      type: e.type,
      message: e.message,
    })),
  },
  null,
  2,
)}

Generate a comprehensive report with the following structure. Return ONLY valid JSON:

{
  "weatherReport": {
    "currentConditions": "Brief description of current weather",
    "temperature": number,
    "humidity": number,
    "impactOnDisease": "How current weather affects detected issues",
    "favorableConditions": ["condition1", "condition2"],
    "unfavorableConditions": ["condition1", "condition2"]
  },
  "diseaseAnalysis": {
    "diseaseName": "Detected disease name or null",
    "isDetected": boolean,
    "confidence": number (0-100),
    "currentStage": "Current stage name",
    "allStages": [
      {
        "stage": "Stage name (e.g., Early, Moderate, Severe)",
        "description": "What happens in this stage",
        "duration": "Typical duration of this stage",
        "symptoms": ["symptom1", "symptom2"],
        "isCurrent": boolean
      }
    ],
    "stageImpact": "Impact of current stage on crop health and yield",
    "progressionRisk": "low|medium|high|severe",
    "spreadPrediction": "Prediction of disease spread"
  },
  "preventionMeasures": [
    {
      "measure": "Detailed prevention/treatment measure",
      "priority": "critical|high|medium|low",
      "type": "natural|pesticide|biological|cultural|mechanical",
      "estimatedCost": "Cost estimate (Low/Medium/High or specific range)",
      "timeToImplement": "Time required",
      "effectiveness": number (0-100)
    }
  ],
  "videoRecommendations": [
    {
      "title": "Video title suggestion",
      "channel": "Recommended channel (prefer Indian government Krishi Vibhag)",
      "description": "What the video covers",
      "searchQuery": "YouTube search query for this topic"
    }
  ],
  "articleLinks": [
    {
      "title": "Article title",
      "source": "Source (e.g., ICAR, KVK, Krishi Vigyan Kendra)",
      "url": null,
      "searchHint": "Search terms a farmer can use to find this on an official portal (icar.org.in, farmer.gov.in, kvk.icar.gov.in). Do NOT invent a URL — a fabricated link is worse than no link.",
      "description": "Brief description"
    }
  ],
  "governmentResources": [
    {
      "schemeName": "Government scheme name",
      "description": "What the scheme offers",
      "eligibility": "Who can apply",
      "contactNumber": "Helpline if available",
      "websiteUrl": "MUST provide official .gov.in URL (e.g., pmfby.gov.in, soilhealth.dac.gov.in, mkisan.gov.in)",
      "compensationDetails": "Compensation information"
    }
  ],
  "summary": "2-3 sentence summary for the farmer",
  "keyFindings": ["finding1", "finding2", "finding3"],
  "immediateActions": ["action1", "action2"],
  "followUpRecommendations": ["recommendation1", "recommendation2"]
}

IMPORTANT:
- Use Indian agricultural context (crops, seasons, government schemes)
- Include PMFBY (Pradhan Mantri Fasal Bima Yojana) if crop loss detected
- Recommend Krishi Vigyan Kendra (KVK) resources
- Suggest state agriculture department contacts
- Use Hindi/English mixed terms where appropriate for Indian farmers
- All measures should be practical and actionable
- Prioritize organic/natural solutions before chemical pesticides
- Include cost estimates in INR context`;

  const response = await axios.post(
    `${API_BASE_URL}/ai/gemini`,
    {
      _model: "gemini-2.5-pro",
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        topK: 32,
        topP: 1,
        maxOutputTokens: 8192,
      },
    },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 120000,
    },
  );

  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response from AI model");

  const report = parseModelJson<ComprehensiveSessionReport>(text);

  try {
    const searchQuery = report.diseaseAnalysis?.diseaseName
      ? `${report.diseaseAnalysis.diseaseName} crop disease treatment India agriculture`
      : detectedIssues.length > 0
        ? `${detectedIssues[0]} crop problem treatment India`
        : `crop health monitoring best practices India agriculture`;

    const searchResults = await searchWithKimi(searchQuery, location?.city);

    if (searchResults.results?.length > 0) {
      const searchArticles = searchResults.results
        .filter((r: SearchResult) => r.relevance !== "low")
        .slice(0, 3)
        .map((r: SearchResult) => ({
          title: r.title,
          source: r.source,
          url: r.url,
          description: r.snippet,
        }));

      if (searchArticles.length > 0) {
        report.articleLinks = [
          ...searchArticles,
          ...report.articleLinks,
        ].slice(0, 5);
      }
    }
  } catch {
    console.warn("Search enrichment failed, continuing with AI report");
  }

  try {
    const govtResponse = await axios.post(
      `${API_BASE_URL}/farming/govt-schemes`,
      {
        cropIssue:
          report.diseaseAnalysis?.diseaseName || detectedIssues[0] || "",
        cropName: "",
        state: location?.city || "",
      },
      { timeout: 30000 },
    );

    if (govtResponse.data?.schemes?.length > 0) {
      const scrapedSchemes = govtResponse.data.schemes.map(
        (s: GovernmentResource) => ({
          schemeName: s.schemeName,
          description: s.description,
          eligibility: s.eligibility,
          contactNumber: s.contactNumber,
          websiteUrl: s.websiteUrl,
          compensationDetails: s.compensationDetails,
        }),
      );
      report.governmentResources = scrapedSchemes;
      console.log(
        `Enriched report with ${scrapedSchemes.length} web-scraped govt schemes (source: ${govtResponse.data.source})`,
      );
    }
  } catch {
    console.warn("Govt scheme scraping failed, using AI-generated schemes");
  }

  return report;
}

function extractIssuesFromLogs(logs: LogEntry[]): string[] {
  const issues = new Set<string>();
  logs.forEach((log) => {
    if (log.type === "alert") {
      const match = log.message.match(/([^—]+)(?:—|$)/);
      if (match) {
        issues.add(match[1].trim());
      }
    }
  });
  return Array.from(issues);
}
