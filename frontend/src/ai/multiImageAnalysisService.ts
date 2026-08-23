import axios from "axios";
import {
  getCropMonitoringPrompt,
  getSoilMonitoringPrompt,
  getThermalMonitoringPrompt,
  getFieldMonitoringPrompt,
} from "./monitoringPrompt";
import { MonitoringType } from "../types";
import { parseModelJson } from "./parseModelJson";

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
  overallConfidence: number;
  consensusLevel: "high" | "medium" | "low";
  analysisSummary: string;

  cropType?: string;
  soilType?: string;

  primaryIssue: string;
  secondaryIssues: string[];

  findings: {
    imageIndex: number;
    confidence: number;
    keyObservations: string[];
    discrepancies?: string[];
  }[];

  aggregatedMetrics: {
    healthScore: number;
    severityLevel: "none" | "mild" | "moderate" | "severe";
    affectedAreaPercentage: number;
    spreadPattern: "localized" | "scattered" | "widespread";
  };

  immediateActions: string[];
  shortTermPlan: string[];
  longTermStrategy: string[];

  progressionAnalysis?: {
    trend: "improving" | "stable" | "worsening" | "inconsistent";
    progressionNotes: string;
  };
}

export async function analyzeMultipleImages(
  images: string[],
  type: MonitoringType,
  cropType?: string,
): Promise<MultiImageAnalysisResult> {
  if (images.length === 0) {
    throw new Error("No images provided");
  }

  if (images.length === 1) {
    const singleResult = await analyzeSingleImage(images[0], type, cropType);
    return convertToMultiImageResult(singleResult, type);
  }

  const basePrompt = getPromptForType(type, cropType);

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

  return parseModelJson<MultiImageAnalysisResult>(text);
}

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

  return parseModelJson(text);
}

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
