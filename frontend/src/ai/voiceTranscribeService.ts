// Voice Transcription Service - Backend Proxy
// NO VITE_ PREFIX - all API calls go through backend

const API_BASE_URL = import.meta.env.PROD 
  ? '/api'
  : 'http://localhost:3000/api';

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  response_format?: "json" | "text" | "srt" | "verbose_json" | "vtt";
  temperature?: number;
  timestamp_granularities?: ("word" | "segment")[];
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
}

/**
 * Transcribe audio using backend proxy (Groq Whisper)
 * @param audioBlob - The audio blob to transcribe
 * @param options - Transcription options
 * @returns Promise with transcription result
 */
export const transcribeAudio = async (
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> => {
  try {
    // Validate audio blob
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error("No audio data provided");
    }

    // Check file size (limit to 25MB)
    if (audioBlob.size > 25 * 1024 * 1024) {
      throw new Error("Audio file too large. Please keep recordings under 25MB.");
    }

    // Convert blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Call backend proxy
    const response = await fetch(`${API_BASE_URL}/ai/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioData: base64Audio,
        model: "whisper-large-v3-turbo",
        language: options.language || "auto",
        prompt: options.prompt || "Agricultural and farming related conversation.",
        response_format: options.response_format || "verbose_json",
        temperature: options.temperature || 0.0
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result || !result.text) {
      throw new Error("No transcription result received");
    }

    return result as TranscriptionResult;
  } catch (error) {
    console.error("Voice transcription error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        throw new Error("Voice transcription rate limit exceeded. Please try again in a moment.");
      } else if (error.message.includes("quota")) {
        throw new Error("Voice transcription quota exceeded. Please try again later.");
      } else if (error.message.includes("invalid")) {
        throw new Error("Invalid audio format. Please try recording again.");
      }
    }
    
    throw new Error(`Voice transcription failed: ${(error as Error).message}`);
  }
};

/**
 * Get supported languages for transcription
 */
export const getSupportedLanguages = (): string[] => {
  return [
    "auto", "en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "ar", "hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "or", "as", "ne", "si", "my", "km", "lo", "th", "vi", "id", "ms", "tl", "sw", "am", "ha", "yo", "ig", "zu", "xh", "af", "sq", "az", "eu", "be", "bg", "ca", "cs", "da", "et", "fi", "gl", "el", "he", "hr", "hu", "is", "ga", "lv", "lt", "mk", "mt", "no", "pl", "ro", "sk", "sl", "sv", "tr", "uk", "cy", "fa", "ur"
  ];
};

/**
 * Detect language from audio
 * @param audioBlob - The audio blob to analyze
 * @returns Promise with detected language code
 */
export const detectLanguage = async (audioBlob: Blob): Promise<string> => {
  try {
    const result = await transcribeAudio(audioBlob, {
      response_format: "verbose_json",
      language: "auto"
    });
    return result.language || "en";
  } catch (error) {
    console.error("Language detection error:", error);
    return "en";
  }
};

export default {
  transcribeAudio,
  getSupportedLanguages,
  detectLanguage
};
