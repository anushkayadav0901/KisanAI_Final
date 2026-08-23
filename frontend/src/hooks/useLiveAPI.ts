import { useState, useRef, useCallback, useEffect } from "react";

const VOICE_WS_PATH = "/voice-live";
const CONNECT_TIMEOUT_MS = 15000;
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
  onSessionLost?: (reason: string) => void;
  language?: string;
}

function describeClose(event: CloseEvent): string {
  if (event.reason) return event.reason;
  if (event.code === 1006)
    return "Voice service unreachable — is it running on port 8001?";
  if (event.code === 1011) return "Voice service error (check GEMINI_API_KEY)";
  return `Voice connection closed (code ${event.code})`;
}

export const useLiveAPI = ({
  onAudioData,
  onTextData,
  onSessionLost,
  language = "en",
}: UseLiveAPIProps): UseLiveAPI => {
  const [status, setStatus] = useState<LiveStatus>("disconnected");
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [errorState, setErrorState] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const intentionalDisconnectRef = useRef(false);
  const readyForAudioRef = useRef(false);

  const handlersRef = useRef({ onAudioData, onTextData, onSessionLost });
  useEffect(() => {
    handlersRef.current = { onAudioData, onTextData, onSessionLost };
  }, [onAudioData, onTextData, onSessionLost]);

  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const getVoiceWsUrl = () => {
    const origin = window.location.origin;
    const protocol = origin.startsWith("https") ? "wss:" : "ws:";
    const host = origin.replace(/^https?:\/\//, "");
    return `${protocol}//${host}${VOICE_WS_PATH}`;
  };

  const handleMessage = useCallback((data: any) => {
    if (!data.serverContent) return;
    const { modelTurn, turnComplete } = data.serverContent;

    if (modelTurn && modelTurn.parts) {
      setAgentState("speaking");

      const textParts = modelTurn.parts.filter((p: any) => p.text);
      if (textParts.length > 0) {
        const combinedText = textParts.map((p: any) => p.text).join("");
        setMessages((prev) => {
          const last = prev.length > 0 ? prev[prev.length - 1] : null;
          if (last && last.role === "model" && !last.isFinal) {
            return [
              ...prev.slice(0, -1),
              { ...last, text: last.text + combinedText },
            ];
          }
          return [
            ...prev,
            {
              id: `model-${Date.now()}-${prev.length}`,
              role: "model" as const,
              text: combinedText,
              isFinal: false,
            },
          ];
        });
      }

      for (const part of modelTurn.parts) {
        if (part.text) handlersRef.current.onTextData?.(part.text);
        if (part.inlineData?.mimeType?.startsWith("audio/pcm")) {
          handlersRef.current.onAudioData(part.inlineData.data);
        }
      }
    }

    if (turnComplete) {
      setAgentState("listening");
      setMessages((prev) => {
        const last = prev.length > 0 ? prev[prev.length - 1] : null;
        if (last && last.role === "model") {
          return [...prev.slice(0, -1), { ...last, isFinal: true }];
        }
        return prev;
      });
    }
  }, []);

  const teardown = useCallback(() => {
    intentionalDisconnectRef.current = true;
    readyForAudioRef.current = false;
    const socket = ws.current;
    ws.current = null;
    if (socket) {
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (
      ws.current?.readyState === WebSocket.OPEN ||
      ws.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    setStatus("connecting");
    setErrorState(null);
    readyForAudioRef.current = false;
    intentionalDisconnectRef.current = false;

    try {
      await new Promise<void>((resolve, reject) => {
        const socket = new WebSocket(getVoiceWsUrl());
        ws.current = socket;
        let isSettled = false;

        const timer = setTimeout(() => {
          fail(`Voice service did not respond within ${CONNECT_TIMEOUT_MS / 1000}s`);
        }, CONNECT_TIMEOUT_MS);

        const succeed = () => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timer);
          resolve();
        };

        const fail = (reason: string) => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(timer);
          teardown();
          setStatus("error");
          setAgentState("idle");
          setErrorState(reason);
          reject(new Error(reason));
        };

        socket.onopen = () => {
          socket.send(
            JSON.stringify({
              setup: {
                model: GEMINI_LIVE_MODEL,
                generation_config: {
                  response_modalities: ["AUDIO"],
                  speech_config: {
                    voice_config: {
                      prebuilt_voice_config: { voice_name: "Aoede" },
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
                        `Default to ${languageRef.current} if you cannot detect the language.`,
                      ].join(" "),
                    },
                  ],
                },
              },
            }),
          );
        };

        socket.onmessage = async (event) => {
          let data;
          try {
            const raw =
              event.data instanceof Blob
                ? await event.data.text()
                : (event.data as string);
            data = JSON.parse(raw);
          } catch {
            return;
          }

          if (data?.error?.message) {
            const message = data.error.message as string;
            if (isSettled) {
              setStatus("error");
              setErrorState(message);
              handlersRef.current.onSessionLost?.(message);
            } else {
              fail(message);
            }
            return;
          }

          if (data.setupComplete !== undefined) {
            readyForAudioRef.current = true;
            setStatus("connected");
            setAgentState("listening");
            succeed();
            return;
          }

          handleMessage(data);
        };

        socket.onclose = (event) => {
          readyForAudioRef.current = false;
          if (ws.current === socket) ws.current = null;

          if (!isSettled) {
            fail(describeClose(event));
            return;
          }
          if (intentionalDisconnectRef.current) return;

          const reason = describeClose(event);
          setStatus("error");
          setAgentState("idle");
          setErrorState(reason);
          handlersRef.current.onSessionLost?.(reason);
        };
      });
    } catch (e) {
      throw e instanceof Error ? e : new Error(String(e));
    }
  }, [handleMessage, teardown]);

  const disconnect = useCallback(() => {
    teardown();
    setStatus("disconnected");
    setAgentState("idle");
  }, [teardown]);

  useEffect(() => teardown, [teardown]);

  const sendAudioChunk = useCallback((base64Audio: string) => {
    if (ws.current?.readyState !== WebSocket.OPEN || !readyForAudioRef.current) {
      return;
    }
    ws.current.send(
      JSON.stringify({
        realtime_input: {
          media_chunks: [
            { mime_type: "audio/pcm;rate=16000", data: base64Audio },
          ],
        },
      }),
    );
  }, []);

  const sendText = useCallback((text: string) => {
    if (ws.current?.readyState !== WebSocket.OPEN || !readyForAudioRef.current) {
      return;
    }
    ws.current.send(
      JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text }] }],
          turnComplete: true,
        },
      }),
    );
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
