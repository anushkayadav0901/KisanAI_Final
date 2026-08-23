import { arrayBufferToBase64 } from "../utils/audioUtils";

const API_BASE_URL = import.meta.env.PROD
  ? "/api"
  : "http://localhost:3000/api";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
}

export async function transcribeAudio(
  audioBlob: Blob,
): Promise<TranscriptionResult> {
  if (audioBlob.size === 0) {
    throw new Error("Recording was empty");
  }
  if (audioBlob.size > MAX_AUDIO_BYTES) {
    throw new Error("Recording is over the 25MB limit");
  }

  const response = await fetch(`${API_BASE_URL}/ai/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audioData: arrayBufferToBase64(await audioBlob.arrayBuffer()),
      model: "whisper-large-v3-turbo",
      language: "auto",
      prompt: "Agricultural and farming related conversation.",
      response_format: "verbose_json",
      temperature: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`Transcription failed (${response.status})`);
  }

  const result: TranscriptionResult = await response.json();
  if (!result.text) {
    throw new Error("Transcription returned no text");
  }
  return result;
}
