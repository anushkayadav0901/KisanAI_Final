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

// Backend API URL - NO VITE_ PREFIX!
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

/**
 * Call Gemini API via backend proxy
 */
async function callGeminiAPI(payload: any, retries = 3, initialDelay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.post<GeminiResponse>(`${API_BASE_URL}/ai/gemini`, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000 // 30s timeout
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

/**
 * Clean and parse JSON response from AI, handling common formatting issues
 */
function cleanAndParseJSON<T>(text: string): T {
  try {
    // Remove markdown code blocks
    let cleaned = text.trim().replace(/^```json\s*|\s*```$/gm, '').trim();
    
    // Remove any text before the first { or after the last }
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    
    // Try to parse as-is first
    try {
      return JSON.parse(cleaned);
    } catch {
      // If that fails, try to fix common issues
      
      // Replace single quotes with double quotes (but be careful with apostrophes in text)
      cleaned = cleaned.replace(/'/g, '"');
      
      // Remove trailing commas before closing braces/brackets
      cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
      
      // Fix unquoted property names (basic case)
      cleaned = cleaned.replace(/(\w+):/g, '"$1":');
      
      // Remove any newlines or excessive whitespace within the JSON
      cleaned = cleaned.replace(/\s+/g, ' ');
      
      return JSON.parse(cleaned);
    }
  } catch (error) {
    console.error('Failed to parse JSON:', text);
    console.error('Parse error:', error);
    throw new Error('Failed to parse AI response as valid JSON');
  }
}

/**
 * Analyzes a crop image using Gemini API via backend proxy
 */
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

    const result = cleanAndParseJSON<CropMonitoringResult>(text);

    // Validation for invalid images
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

/**
 * Analyzes a soil image using Gemini API via backend proxy
 */
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

    const result = cleanAndParseJSON<SoilMonitoringResult>(text);

    // Validation for invalid images
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

/**
 * Analyzes a thermal image using Gemini API via backend proxy
 */
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

    const result = cleanAndParseJSON<ThermalMonitoringResult>(text);

    // Validation for invalid images
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

/**
 * Analyzes a field/drone image using Gemini API via backend proxy
 */
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

    const result = cleanAndParseJSON<FieldMonitoringResult>(text);

    // Validation for invalid images
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

/**
 * Helper function to validate if an image is appropriate for the selected monitoring type
 */
export function isValidImage(result: any): boolean {
  return result && result.confidenceLevel > 0;
}
