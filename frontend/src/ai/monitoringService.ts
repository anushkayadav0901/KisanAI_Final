import axios from 'axios';
import { 
  getCropMonitoringPrompt, 
  getSoilMonitoringPrompt, 
  getThermalMonitoringPrompt, 
  getFieldMonitoringPrompt,
  CropMonitoringPromptConfig,
  SoilMonitoringPromptConfig,
  ThermalMonitoringPromptConfig,
  FieldMonitoringPromptConfig
} from './monitoringPrompt';
import {
  CropMonitoringResult,
  SoilMonitoringResult,
  ThermalMonitoringResult,
  FieldMonitoringResult
} from '../types';
import { parseModelJson } from "./parseModelJson";

const API_BASE_URL = import.meta.env.PROD 
  ? '/api'
  : 'http://localhost:3000/api';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

async function callGeminiAPI(payload: any, retries = 3, initialDelay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.post<GeminiResponse>(`${API_BASE_URL}/ai/gemini`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429 && i < retries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Rate limited. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
}

export async function analyzeCropImage(
  imageData: string,
  config?: CropMonitoringPromptConfig
): Promise<CropMonitoringResult> {
  try {
    const prompt = getCropMonitoringPrompt(config);
    const base64Image = imageData.split(',')[1] || imageData;

    const response = await callGeminiAPI({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
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
    });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from AI model');

    const result = parseModelJson<CropMonitoringResult>(text);

    if (result.confidenceLevel === 0 || result.diseaseDetected === 'Invalid Input') {
      return result;
    }

    return result;
  } catch (error) {
    console.error('Crop analysis error:', error);
    throw new Error(
      `Failed to analyze crop image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function analyzeSoilImage(
  imageData: string,
  config?: SoilMonitoringPromptConfig
): Promise<SoilMonitoringResult> {
  try {
    const prompt = getSoilMonitoringPrompt(config);
    const base64Image = imageData.split(',')[1] || imageData;

    const response = await callGeminiAPI({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
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
    });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from AI model');

    const result = parseModelJson<SoilMonitoringResult>(text);

    if (result.confidenceLevel === 0 || result.soilType === 'Not Applicable') {
      return result;
    }

    return result;
  } catch (error) {
    console.error('Soil analysis error:', error);
    throw new Error(
      `Failed to analyze soil image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function analyzeThermalImage(
  imageData: string,
  config?: ThermalMonitoringPromptConfig
): Promise<ThermalMonitoringResult> {
  try {
    const prompt = getThermalMonitoringPrompt(config);
    const base64Image = imageData.split(',')[1] || imageData;

    const response = await callGeminiAPI({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
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
    });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from AI model');

    const result = parseModelJson<ThermalMonitoringResult>(text);

    if (result.confidenceLevel === 0 || result.analysisSummary === 'Non-thermal image detected') {
      return result;
    }

    return result;
  } catch (error) {
    console.error('Thermal analysis error:', error);
    throw new Error(
      `Failed to analyze thermal image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function analyzeFieldImage(
  imageData: string,
  config?: FieldMonitoringPromptConfig
): Promise<FieldMonitoringResult> {
  try {
    const prompt = getFieldMonitoringPrompt(config);
    const base64Image = imageData.split(',')[1] || imageData;

    const response = await callGeminiAPI({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
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
    });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from AI model');

    const result = parseModelJson<FieldMonitoringResult>(text);

    if (result.confidenceLevel === 0 || result.analysisSummary === 'Non-field image detected') {
      return result;
    }

    return result;
  } catch (error) {
    console.error('Field analysis error:', error);
    throw new Error(
      `Failed to analyze field image: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function isValidImage(result: any): boolean {
  return result && result.confidenceLevel > 0;
}
