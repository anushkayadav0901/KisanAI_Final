/**
 * useLiveAPI — Gemini Live API voice hook
 *
 * Follows the documented Gemini Live API protocol:
 *   1. Open WebSocket to backend proxy (/voice-live)
 *   2. Send `setup` message with model, generation_config, system_instruction
 *   3. Wait for `setupComplete` before streaming audio
 *   4. Stream audio as `realtime_input` with `audio/pcm;rate=16000`
 *   5. Receive audio/text in `serverContent.modelTurn.parts`
 */
import { useState, useRef, useCallback } from "react";

const VOICE_WS_PATH = "/voice-live";
const GEMINI_LIVE_MODEL =
  import.meta.env.VITE_GEMINI_LIVE_MODEL ||
  "models/gemini-2.5-flash-native-audio-preview-12-2025";

export type LiveStatus = "disconnected" | "connecting" | "connected" | "error";
export type AgentState = "listening" | "processing" | "speaking" | "idle";

export interface LiveMessage {
  id: string;
  role: "user" | "model";
  text: string;
  isFinal?: boolean;
}

interface UseLiveAPI {
  status: LiveStatus;
  agentState: AgentState;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendAudioChunk: (base64Audio: string) => void;
  sendText: (text: string) => void;
  messages: LiveMessage[];
  error: string | null;
}

interface UseLiveAPIProps {
  onAudioData: (base64: string) => void;
  onTextData?: (text: string) => void;
  onError?: (err: any) => void;
  language?: string;
}

export const useLiveAPI = ({
  onAudioData,
  onTextData,
  onError,
  language = "en",
}: UseLiveAPIProps): UseLiveAPI => {
  const [status, setStatus] = useState<LiveStatus>("disconnected");
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [errorState, setErrorState] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const intentionalDisconnectRef = useRef(false);
  // Gate: only allow audio after Gemini confirms setupComplete
  const readyForAudioRef = useRef(false);

  const getVoiceWsUrl = () => {
    // Always connect via current origin so the Vite dev-server proxy
    // (or production reverse-proxy) routes /voice-live to the voice service.
    const origin = window.location.origin;
    const protocol = origin.startsWith("https") ? "wss:" : "ws:";
    const host = origin.replace(/^https?:\/\//, "");
    return `${protocol}//${host}${VOICE_WS_PATH}`;
  };

  const handleMessage = useCallback(
    (data: any) => {
      if (data.serverContent) {
        const { modelTurn, turnComplete } = data.serverContent;

        if (modelTurn && modelTurn.parts) {
          setAgentState("speaking");

          const textParts = modelTurn.parts.filter((p: any) => p.text);
          if (textParts.length > 0) {
            const combinedText = textParts.map((p: any) => p.text).join("");
            setMessages((prev) => {
              const newMessages = [...prev];
              const last =
                newMessages.length > 0
                  ? newMessages[newMessages.length - 1]
                  : null;

              if (last && last.role === "model" && !last.isFinal) {
                newMessages[newMessages.length - 1] = {
                  ...last,
                  text: last.text + combinedText,
                };
              } else {
                newMessages.push({
                  id: Math.random().toString(),
                  role: "model",
                  text: combinedText,
                  isFinal: false,
                });
              }
              return newMessages;
            });
          }

          for (const part of modelTurn.parts) {
            if (part.text && onTextData) {
              onTextData(part.text);
            }
            if (
              part.inlineData &&
              part.inlineData.mimeType?.startsWith("audio/pcm")
            ) {
              onAudioData(part.inlineData.data);
            }
          }
        }

        if (turnComplete) {
          setAgentState("listening");
          setMessages((prev) => {
            const newMessages = [...prev];
            const last =
              newMessages.length > 0
                ? newMessages[newMessages.length - 1]
                : null;
            if (last && last.role === "model") {
              newMessages[newMessages.length - 1] = { ...last, isFinal: true };
            }
            return newMessages;
          });
        }
      }
    },
    [onAudioData, onTextData],
  );

  const connect = useCallback(async () => {
    if (
      ws.current?.readyState === WebSocket.OPEN ||
      ws.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    try {
      setStatus("connecting");
      setErrorState(null);
      readyForAudioRef.current = false;
      intentionalDisconnectRef.current = false;

      await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(getVoiceWsUrl());
        let isSettled = false;

        const settleResolve = () => {
          if (isSettled) return;
          isSettled = true;
          resolve();
        };

        const settleReject = (err: unknown) => {
          if (isSettled) return;
          isSettled = true;
          reject(err);
        };

        socket.onopen = () => {
          ws.current = socket;

          // Send setup message per Gemini Live API spec.
          // The backend proxy forwards this to Gemini verbatim.
          const setupMessage = {
            setup: {
              model: GEMINI_LIVE_MODEL,
              generation_config: {
                response_modalities: ["AUDIO"],
                speech_config: {
                  voice_config: {
                    prebuilt_voice_config: {
                      voice_name: "Aoede",
                    },
                  },
                },
              },
              system_instruction: {
                parts: [
                  {
                    text: [
                      "You are an expert agricultural consultant for Kisan-Saathi, an app that helps Indian farmers.",
                      "You help with crop diseases, market prices, weather impact, soil health, and farming advice.",
                      "Keep answers concise, practical, and helpful.",
                      "CRITICAL INSTRUCTION: NEVER output your internal thoughts, internal process, or step-by-step reasoning.",
                      "CRITICAL INSTRUCTION: NEVER output any text wrapped in asterisks like **Initiating** or **Clarifying**.",
                      "ONLY output the exact, direct spoken response you want the user to hear.",
                      "Respond in the language the user speaks — Hindi, Marathi, Tamil, Telugu, Kannada, Punjabi, or any Indian language.",
                      `Default to ${language} if you cannot detect the language.`,
                    ].join(" "),
                  },
                ],
              },
            },
          };
          socket.send(JSON.stringify(setupMessage));
          // Do NOT resolve yet — wait for setupComplete
        };

        socket.onmessage = async (event) => {
          try {
            let data;
            if (event.data instanceof Blob) {
              const text = await event.data.text();
              data = JSON.parse(text);
            } else {
              data = JSON.parse(event.data as string);
            }

            // Gemini confirms setup is complete — now safe to stream audio
            if (data.setupComplete !== undefined) {
              readyForAudioRef.current = true;
              setStatus("connected");
              setAgentState("listening");
              settleResolve();
              return;
            }

            // Error from backend proxy or Gemini
            if (data?.error?.message) {
              const err = data.error.message as string;
              setStatus("error");
              setErrorState(err);
              if (onError) onError(err);
              settleReject(new Error(err));
              return;
            }

            handleMessage(data);
          } catch (e) {
            console.error("Error parsing message", e);
          }
        };

        socket.onerror = (e) => {
          console.error("WebSocket error", e);
          setStatus("error");
          setErrorState("Connection error");
          if (onError) onError(e);
          settleReject(e);
        };

        socket.onclose = (event) => {
          ws.current = null;
          readyForAudioRef.current = false;
          setStatus("disconnected");
          setAgentState("idle");

          if (!intentionalDisconnectRef.current) {
            const reason = event.reason ? ` (${event.reason})` : "";
            const err = `Live voice connection closed${reason}`;
            setErrorState(err);
            if (onError) onError(err);
            settleReject(new Error(err));
          }
        };
      });
    } catch (e) {
      setStatus("error");
      setErrorState("Failed to connect");
      if (onError) onError(e);
    }
  }, [handleMessage, onError, language]);

  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    readyForAudioRef.current = false;
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setStatus("disconnected");
    setAgentState("idle");
    setErrorState(null);
  }, []);

  const sendAudioChunk = useCallback((base64Audio: string) => {
    if (
      ws.current &&
      ws.current.readyState === WebSocket.OPEN &&
      readyForAudioRef.current
    ) {
      const msg = {
        realtime_input: {
          media_chunks: [
            {
              mime_type: "audio/pcm;rate=16000",
              data: base64Audio,
            },
          ],
        },
      };
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  const sendText = useCallback((text: string) => {
    if (
      ws.current &&
      ws.current.readyState === WebSocket.OPEN &&
      readyForAudioRef.current
    ) {
      const msg = {
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text }],
            },
          ],
          turnComplete: true,
        },
      };
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  return {
    status,
    agentState,
    connect,
    disconnect,
    sendAudioChunk,
    sendText,
    messages,
    error: errorState,
  };
};
