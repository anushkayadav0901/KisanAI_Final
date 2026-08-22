import axios from "axios";
import { searchWithKimi, SearchResult } from "./searchService";

// Backend API URL
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
  // Weather Context
  weatherReport: {
    currentConditions: string;
    temperature: number;
    humidity: number;
    impactOnDisease: string;
    favorableConditions: string[];
    unfavorableConditions: string[];
  };

  // Disease Analysis
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

  // Prevention & Treatment
  preventionMeasures: PreventionMeasure[];

  // Educational Resources
  videoRecommendations: VideoResource[];
  articleLinks: {
    title: string;
    source: string;
    url?: string;
    description: string;
  }[];

  // Government Support
  governmentResources: GovernmentResource[];

  // Session Summary
  summary: string;
  keyFindings: string[];
  immediateActions: string[];
  followUpRecommendations: string[];
}

/**
 * Generate comprehensive session report using Gemini 2.5 Pro
 */
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

  // Extract unique diseases and issues from logs
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
      "url": "MUST provide a real working URL — use official Indian agriculture sites like icar.org.in, farmer.gov.in, agmarknet.gov.in, kvk.icar.gov.in, manage.gov.in, or state agriculture department URLs",
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

  try {
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

    const report = cleanAndParseJSON<ComprehensiveSessionReport>(text);

    // Enrich report with Groq Kimi K2.5 web search results
    try {
      const searchQuery = report.diseaseAnalysis?.diseaseName
        ? `${report.diseaseAnalysis.diseaseName} crop disease treatment India agriculture`
        : detectedIssues.length > 0
          ? `${detectedIssues[0]} crop problem treatment India`
          : `crop health monitoring best practices India agriculture`;

      const searchResults = await searchWithKimi(searchQuery, location?.city);

      if (searchResults.results?.length > 0) {
        // Enrich article links with real search results
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
      // Search enrichment is optional, don't fail the report
      console.warn("Search enrichment failed, continuing with AI report");
    }

    // Enrich government resources with web-scraped data
    try {
      const govtResponse = await axios.post(
        `${API_BASE_URL}/farming/govt-schemes`,
        {
          cropIssue:
            report.diseaseAnalysis?.diseaseName || detectedIssues[0] || "",
          cropName: "", // extracted from session if available
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
        // Replace AI-generated schemes with real web-scraped ones
        report.governmentResources = scrapedSchemes;
        console.log(
          `Enriched report with ${scrapedSchemes.length} web-scraped govt schemes (source: ${govtResponse.data.source})`,
        );
      }
    } catch {
      // Govt scheme scraping is optional, keep AI-generated ones
      console.warn("Govt scheme scraping failed, using AI-generated schemes");
    }

    return report;
  } catch (error) {
    console.error("Report generation error:", error);
    // Return fallback report
    return generateFallbackReport(avgHealth, detectedIssues, weather, location);
  }
}

/**
 * Extract unique issues from log entries
 */
function extractIssuesFromLogs(logs: LogEntry[]): string[] {
  const issues = new Set<string>();
  logs.forEach((log) => {
    if (log.type === "alert") {
      // Extract disease/pest name from message
      const match = log.message.match(/([^—]+)(?:—|$)/);
      if (match) {
        issues.add(match[1].trim());
      }
    }
  });
  return Array.from(issues);
}

/**
 * Clean and parse JSON response
 */
function cleanAndParseJSON<T>(text: string): T {
  try {
    let cleaned = text
      .trim()
      .replace(/^```json\s*|\s*```$/gm, "")
      .trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("JSON parse error:", error);
    throw error;
  }
}

/**
 * Generate fallback report when AI fails
 */
function generateFallbackReport(
  avgHealth: number,
  issues: string[],
  weather: WeatherData | null,
  _location: LocationInfo | null,
): ComprehensiveSessionReport {
  const hasIssues = issues.length > 0;

  return {
    weatherReport: {
      currentConditions: weather?.weather[0]?.description || "Unknown",
      temperature: weather?.main.temp || 0,
      humidity: weather?.main.humidity || 0,
      impactOnDisease: hasIssues
        ? "Current weather conditions may be contributing to detected issues."
        : "Weather conditions appear favorable for crop health.",
      favorableConditions: ["Adequate sunlight", "Moderate temperature"],
      unfavorableConditions: hasIssues
        ? ["High humidity may promote disease"]
        : [],
    },
    diseaseAnalysis: {
      diseaseName: hasIssues ? issues[0] : null,
      isDetected: hasIssues,
      confidence: hasIssues ? 70 : 0,
      currentStage: hasIssues ? "Moderate" : "None",
      allStages: hasIssues
        ? [
            {
              stage: "Early",
              description: "Initial symptoms appearing",
              duration: "3-5 days",
              symptoms: ["Minor discoloration"],
              isCurrent: false,
            },
            {
              stage: "Moderate",
              description: "Visible spread",
              duration: "5-10 days",
              symptoms: ["Spreading spots", "Wilting"],
              isCurrent: true,
            },
            {
              stage: "Severe",
              description: "Major damage",
              duration: "10+ days",
              symptoms: ["Extensive damage", "Crop loss"],
              isCurrent: false,
            },
          ]
        : [],
      stageImpact: hasIssues
        ? "Moderate impact on yield expected if not treated"
        : "No disease detected",
      progressionRisk: hasIssues ? "medium" : "low",
      spreadPrediction: hasIssues
        ? "May spread to adjacent plants within 5-7 days"
        : "No spread expected",
    },
    preventionMeasures: hasIssues
      ? [
          {
            measure: "Remove and destroy infected plant parts",
            priority: "high",
            type: "cultural",
            estimatedCost: "Low",
            timeToImplement: "Immediate",
            effectiveness: 80,
          },
          {
            measure: "Apply neem oil spray (organic pesticide)",
            priority: "medium",
            type: "natural",
            estimatedCost: "Low",
            timeToImplement: "Within 2 days",
            effectiveness: 70,
          },
          {
            measure: "Improve air circulation between plants",
            priority: "medium",
            type: "cultural",
            estimatedCost: "Minimal",
            timeToImplement: "Within a week",
            effectiveness: 60,
          },
        ]
      : [],
    videoRecommendations: [
      {
        title: "Crop Disease Identification and Management",
        channel: "DD Kisan",
        description:
          "Government agricultural channel providing expert guidance",
        searchQuery: "DD Kisan crop disease management hindi",
      },
      {
        title: "Organic Farming Solutions",
        channel: "ICAR",
        description: "Research-based organic farming practices",
        searchQuery: "ICAR organic farming disease control",
      },
    ],
    articleLinks: [
      {
        title: "Integrated Pest Management Guidelines",
        source: "Krishi Vigyan Kendra",
        description: "Comprehensive guide for farmers",
      },
      {
        title: "Crop Protection Methods",
        source: "State Agriculture Department",
        description: "Official recommendations",
      },
    ],
    governmentResources: [
      {
        schemeName: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        description: "Crop insurance scheme for farmers",
        eligibility: "All farmers growing notified crops",
        contactNumber: "1800-180-1551",
        websiteUrl: "https://pmfby.gov.in",
        compensationDetails: "Up to 100% of sum insured for crop loss",
      },
      {
        schemeName: "Soil Health Card Scheme",
        description: "Free soil testing and recommendations",
        eligibility: "All farmers",
        contactNumber: "1800-180-1551",
        compensationDetails: "Free soil testing services",
      },
    ],
    summary: hasIssues
      ? `Monitoring session detected ${issues.length} issue(s) with average crop health of ${avgHealth}/100. Immediate attention recommended.`
      : `Monitoring session completed with average crop health of ${avgHealth}/100. No critical issues detected.`,
    keyFindings: hasIssues
      ? [
          `Detected: ${issues.join(", ")}`,
          `Health score: ${avgHealth}/100`,
          "Weather conditions favorable for disease spread",
        ]
      : [
          "No diseases detected",
          "Crop health is satisfactory",
          "Continue regular monitoring",
        ],
    immediateActions: hasIssues
      ? [
          "Inspect affected plants closely",
          "Isolate infected areas if possible",
          "Contact local KVK for guidance",
        ]
      : ["Continue regular monitoring", "Maintain current care practices"],
    followUpRecommendations: [
      "Schedule next monitoring session in 3-5 days",
      "Document any changes in crop appearance",
      "Keep records for insurance claims if needed",
    ],
  };
}
