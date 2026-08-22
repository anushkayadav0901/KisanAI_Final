import axios from "axios";
import {
  getCropMonitoringPrompt,
  getSoilMonitoringPrompt,
  getThermalMonitoringPrompt,
  getFieldMonitoringPrompt,
} from "./monitoringPrompt";
import { MonitoringType } from "../types";

// Backend API URL
const API_BASE_URL = import.meta.env.PROD
  ? "/api"
  : "http://localhost:3000/api";

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export interface MultiImageAnalysisResult {
  // Overall Analysis
  overallConfidence: number;
  consensusLevel: "high" | "medium" | "low";
  analysisSummary: string;

  // Type-specific results
  cropType?: string;
  soilType?: string;

  // Issues detected
  primaryIssue: string;
  secondaryIssues: string[];

  // Detailed findings
  findings: {
    imageIndex: number;
    confidence: number;
    keyObservations: string[];
    discrepancies?: string[];
  }[];

  // Aggregated metrics
  aggregatedMetrics: {
    healthScore: number;
    severityLevel: "none" | "mild" | "moderate" | "severe";
    affectedAreaPercentage: number;
    spreadPattern: "localized" | "scattered" | "widespread";
  };

  // Recommendations
  immediateActions: string[];
  shortTermPlan: string[];
  longTermStrategy: string[];

  // Comparison insights (for multi-image)
  progressionAnalysis?: {
    trend: "improving" | "stable" | "worsening" | "inconsistent";
    progressionNotes: string;
  };
}

/**
 * Clean and parse JSON response from AI
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
 * Analyze multiple images together for comprehensive analysis
 */
export async function analyzeMultipleImages(
  images: string[],
  type: MonitoringType,
  cropType?: string,
): Promise<MultiImageAnalysisResult> {
  if (images.length === 0) {
    throw new Error("No images provided");
  }

  if (images.length === 1) {
    // Fallback to single image analysis
    const singleResult = await analyzeSingleImage(images[0], type, cropType);
    return convertToMultiImageResult(singleResult, type);
  }

  try {
    // Get appropriate prompt based on type
    const basePrompt = getPromptForType(type, cropType);

    // Build multi-image prompt
    const multiImagePrompt = `${basePrompt}

IMPORTANT: You are analyzing ${images.length} images of the same ${type} from potentially different angles, times, or areas.
Provide a COMPREHENSIVE analysis that:
1. Identifies consistent patterns across all images
2. Notes any discrepancies or variations
3. Provides an overall confidence score based on consensus
4. Determines if the issue is localized or widespread

Return ONLY valid JSON with this structure:
{
  "overallConfidence": number (0-100),
  "consensusLevel": "high|medium|low",
  "analysisSummary": "Brief summary of findings across all images",
  ${type === "crop" ? '"cropType": "identified crop type",\n  "primaryIssue": "main disease/pest/issue detected",\n  "secondaryIssues": ["issue1", "issue2"],' : ""}
  ${type === "soil" ? '"soilType": "identified soil type",\n  "primaryIssue": "main soil issue",\n  "secondaryIssues": ["issue1", "issue2"],' : ""}
  "findings": [
    {
      "imageIndex": 0,
      "confidence": number,
      "keyObservations": ["observation1", "observation2"],
      "discrepancies": ["any differences from other images"]
    }
  ],
  "aggregatedMetrics": {
    "healthScore": number (0-100),
    "severityLevel": "none|mild|moderate|severe",
    "affectedAreaPercentage": number,
    "spreadPattern": "localized|scattered|widespread"
  },
  "immediateActions": ["action1", "action2", "action3"],
  "shortTermPlan": ["plan1", "plan2"],
  "longTermStrategy": ["strategy1", "strategy2"],
  "progressionAnalysis": {
    "trend": "improving|stable|worsening|inconsistent",
    "progressionNotes": "Analysis of how the condition varies across images"
  }
}

Analyze all images together and provide the most accurate combined assessment.`;

    // Build content parts with all images
    const parts: any[] = [{ text: multiImagePrompt }];

    images.forEach((imageData, index) => {
      const base64Image = imageData.split(",")[1] || imageData;
      parts.push({
        text: `\n--- Image ${index + 1} ---\n`,
      });
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: base64Image,
        },
      });
    });

    const response = await axios.post<GeminiResponse>(
      `${API_BASE_URL}/ai/gemini`,
      {
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.3,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000,
      },
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response from AI model");

    return cleanAndParseJSON<MultiImageAnalysisResult>(text);
  } catch (error) {
    console.error("Multi-image analysis error:", error);
    // Fallback: analyze images individually and combine
    return fallbackMultiImageAnalysis(images, type, cropType);
  }
}

/**
 * Fallback: Analyze images individually and combine results
 */
async function fallbackMultiImageAnalysis(
  images: string[],
  type: MonitoringType,
  cropType?: string,
): Promise<MultiImageAnalysisResult> {
  const results = await Promise.all(
    images.map((img) =>
      analyzeSingleImage(img, type, cropType).catch(() => null),
    ),
  );

  const validResults = results.filter((r) => r !== null);

  if (validResults.length === 0) {
    throw new Error("Failed to analyze any images");
  }

  // Calculate aggregated metrics
  const healthScores = validResults.map(
    (r) => r.realTimeMetrics?.healthScore || 50,
  );
  const avgHealth = Math.round(
    healthScores.reduce((a, b) => a + b, 0) / healthScores.length,
  );
  const confidenceLevels = validResults.map((r) => r.confidenceLevel || 80);
  const avgConfidence = Math.round(
    confidenceLevels.reduce((a, b) => a + b, 0) / confidenceLevels.length,
  );

  return {
    overallConfidence: avgConfidence,
    consensusLevel: "medium",
    analysisSummary: `Analyzed ${validResults.length} images. Average health score: ${avgHealth}/100.`,
    cropType:
      validResults[0]?.cropType || validResults[0]?.soilType || "Unknown",
    primaryIssue:
      validResults[0]?.diseaseDetected ||
      validResults[0]?.analysisSummary ||
      "No major issues detected",
    secondaryIssues: [],
    findings: validResults.map((r, i) => ({
      imageIndex: i,
      confidence: r.confidenceLevel || 80,
      keyObservations: [r.analysisSummary || "Analysis completed"],
    })),
    aggregatedMetrics: {
      healthScore: avgHealth,
      severityLevel:
        avgHealth > 70 ? "mild" : avgHealth > 40 ? "moderate" : "severe",
      affectedAreaPercentage: validResults[0]?.affectedArea || 0,
      spreadPattern: "localized",
    },
    immediateActions: validResults[0]?.treatmentRecommendations?.slice(0, 3) ||
      validResults[0]?.improvementSuggestions?.slice(0, 3) || [
        "Consult local agricultural expert",
      ],
    shortTermPlan: validResults[0]?.preventiveMeasures?.slice(0, 2) ||
      validResults[0]?.preventionMeasures?.slice(0, 2) || [
        "Continue monitoring",
      ],
    longTermStrategy: [
      "Regular monitoring recommended",
      "Maintain crop health practices",
    ],
  };
}

/**
 * Analyze a single image
 */
async function analyzeSingleImage(
  imageData: string,
  type: MonitoringType,
  cropType?: string,
): Promise<any> {
  const prompt = getPromptForType(type, cropType);
  const base64Image = imageData.split(",")[1] || imageData;

  const response = await axios.post<GeminiResponse>(
    `${API_BASE_URL}/ai/gemini`,
    {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 1,
        maxOutputTokens: 2048,
      },
    },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    },
  );

  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response from AI model");

  return cleanAndParseJSON(text);
}

/**
 * Get prompt for monitoring type
 */
function getPromptForType(type: MonitoringType, cropType?: string): string {
  switch (type) {
    case "crop":
      return getCropMonitoringPrompt(cropType ? { cropType } : undefined);
    case "soil":
      return getSoilMonitoringPrompt();
    case "thermal":
      return getThermalMonitoringPrompt();
    case "field":
      return getFieldMonitoringPrompt();
    default:
      return getCropMonitoringPrompt();
  }
}

/**
 * Convert single image result to multi-image format
 */
function convertToMultiImageResult(
  singleResult: any,
  type: MonitoringType,
): MultiImageAnalysisResult {
  const isCrop = type === "crop";
  const isSoil = type === "soil";

  return {
    overallConfidence: singleResult.confidenceLevel || 80,
    consensusLevel: "high",
    analysisSummary: singleResult.analysisSummary || "Analysis completed",
    cropType: isCrop ? singleResult.cropType : undefined,
    soilType: isSoil ? singleResult.soilType : undefined,
    primaryIssue:
      singleResult.diseaseDetected ||
      singleResult.soilType ||
      singleResult.analysisSummary ||
      "No major issues detected",
    secondaryIssues: [],
    findings: [
      {
        imageIndex: 0,
        confidence: singleResult.confidenceLevel || 80,
        keyObservations: [singleResult.analysisSummary || "Analysis completed"],
      },
    ],
    aggregatedMetrics: {
      healthScore: singleResult.realTimeMetrics?.healthScore || 75,
      severityLevel: singleResult.diseaseSeverity || "none",
      affectedAreaPercentage: singleResult.affectedArea || 0,
      spreadPattern: "localized",
    },
    immediateActions: singleResult.treatmentRecommendations ||
      singleResult.improvementSuggestions ||
      singleResult.mitigationStrategies ||
      singleResult.precisionFarmingTips || [
        "Consult local agricultural expert",
      ],
    shortTermPlan: singleResult.preventiveMeasures ||
      singleResult.preventionMeasures ||
      singleResult.monitoringRecommendations ||
      singleResult.interventionPlans || ["Continue monitoring"],
    longTermStrategy: [
      "Regular monitoring recommended",
      "Maintain best practices",
    ],
  };
}
