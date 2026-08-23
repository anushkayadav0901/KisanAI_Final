import React, { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  useLiveAPI,
  type LiveMessage,
  type LiveStatus,
} from "../hooks/useLiveAPI";
import {
  float32ToInt16,
  int16ToFloat32,
  base64ToArrayBuffer,
  arrayBufferToBase64,
} from "../utils/audioUtils";
import { useLanguage } from "../hooks/useLanguage";
import { Mic, MicOff, Bot, Loader2 } from "lucide-react";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const SPEECH_LOCALE: Record<string, string> = {
  Hindi: "hi-IN",
  Marathi: "mr-IN",
  Tamil: "ta-IN",
  Telugu: "te-IN",
  Kannada: "kn-IN",
  Malayalam: "ml-IN",
  Gujarati: "gu-IN",
  Punjabi: "pa-IN",
  Bengali: "bn-IN",
  Urdu: "ur-IN",
};

const GREETING: Record<string, string> = {
  Hindi: "नमस्ते! मैं आपका किसान-साथी विशेषज्ञ हूँ। मैं आज आपकी कैसे मदद कर सकता हूँ?",
  Marathi: "नमस्कार! मी तुमचा किसान-साथी तज्ञ आहे. मी आज तुम्हाला कशी मदत करू शकेन?",
  Tamil: "வணக்கம்! நான் உங்கள் கிசான்-சாத்தி நிபுணர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?",
};

const AUDIO_RESUME_TIMEOUT_MS = 2000;

const STATUS_HEADING: Record<LiveStatus, string> = {
  disconnected: "Ready to Connect",
  connecting: "Connecting...",
  connected: "AI Connected",
  error: "Call ended",
};

const DEFAULT_GREETING =
  "Hello! I am your Kisan-Saathi expert. How can I help you today?";

const formatText = (text: string) => {
  if (!text.trim()) return null;
  return <span>{text}</span>;
};

const Consult: React.FC = () => {
  const { selected: language } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageScrollRef = useRef<HTMLDivElement>(null);
  const [localMessages, setLocalMessages] = useState<LiveMessage[]>([]);
  const [interimText, setInterimText] = useState("");
  const [starting, setStarting] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recorderNodeRef = useRef<AudioWorkletNode | null>(null);
  const playerNodeRef = useRef<AudioWorkletNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);

  const handleAudioData = useCallback((base64Audio: string) => {
    const arrayBuffer = base64ToArrayBuffer(base64Audio);
    const float32Array = int16ToFloat32(new Int16Array(arrayBuffer));
    playerNodeRef.current?.port.postMessage(float32Array);
  }, []);

  const cleanupAudio = useCallback(() => {
    recorderNodeRef.current?.disconnect();
    recorderNodeRef.current = null;

    playerNodeRef.current?.disconnect();
    playerNodeRef.current = null;

    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;

    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      if (ctx.state !== "closed") ctx.close();
    }

    if (recognitionRef.current) {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.stop();
    }

    setInterimText("");
  }, []);

  const handleSessionLost = useCallback(
    (reason: string) => {
      cleanupAudio();
      toast.error(reason);
    },
    [cleanupAudio],
  );

  const {
    status,
    agentState,
    connect,
    disconnect,
    sendAudioChunk,
    sendText,
    messages,
    error,
  } = useLiveAPI({
    onAudioData: handleAudioData,
    onSessionLost: handleSessionLost,
    language: language.name,
  });

  useEffect(() => {
    isConnectedRef.current = status === "connected";
  }, [status]);

  const startCapture = async () => {
    const ctx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    audioContextRef.current = ctx;

    await ctx.audioWorklet.addModule("/worklets/audio-recorder-worklet.js");
    await ctx.audioWorklet.addModule("/worklets/audio-player-worklet.js");

    const playerNode = new AudioWorkletNode(ctx, "audio-player-worklet");
    playerNode.connect(ctx.destination);
    playerNodeRef.current = playerNode;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    audioStreamRef.current = stream;

    const recorderNode = new AudioWorkletNode(ctx, "audio-recorder-worklet");
    recorderNode.port.onmessage = (event) => {
      if (!event.data) return;
      const int16 = float32ToInt16(event.data);
      sendAudioChunk(arrayBufferToBase64(int16.buffer as ArrayBuffer));
    };
    ctx.createMediaStreamSource(stream).connect(recorderNode);
    recorderNodeRef.current = recorderNode;

    await Promise.race([
      ctx.resume(),
      new Promise((r) => setTimeout(r, AUDIO_RESUME_TIMEOUT_MS)),
    ]);
    if (ctx.state !== "running") {
      toast("Your browser blocked audio playback — you may not hear replies");
    }
  };

  const startTranscription = () => {
    const SpeechRec =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = SPEECH_LOCALE[language.name] ?? "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          if (transcript.trim()) {
            setLocalMessages((prev) => [
              ...prev,
              {
                id: `user-${Date.now()}-${prev.length}`,
                role: "user",
                text: transcript.trim(),
                isFinal: true,
              },
            ]);
          }
        } else {
          interim += transcript;
        }
      }
      setInterimText(interim);
    };

    recognition.onend = () => {
      if (isConnectedRef.current && recognitionRef.current === recognition) {
        setTimeout(() => {
          if (recognitionRef.current === recognition) recognition.start();
        }, 400);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    try {
      await connect();
      await startCapture();
      sendText(
        `Start by greeting me with this exact phrase: "${
          GREETING[language.name] ?? DEFAULT_GREETING
        }"`,
      );
      startTranscription();
    } catch (e) {
      disconnect();
      cleanupAudio();
      toast.error(e instanceof Error ? e.message : "Could not start voice call");
    } finally {
      setStarting(false);
    }
  };

  const handleStop = useCallback(() => {
    disconnect();
    cleanupAudio();
  }, [disconnect, cleanupAudio]);

  useEffect(() => () => cleanupAudio(), [cleanupAudio]);

  useEffect(() => {
    setLocalMessages((prev) => {
      const modelById = new Map(messages.map((m) => [m.id, m]));
      const seen = new Set<string>();
      const result: LiveMessage[] = [];

      for (const p of prev) {
        if (p.role === "user") {
          result.push(p);
        } else if (modelById.has(p.id)) {
          result.push(modelById.get(p.id)!);
          seen.add(p.id);
        }
      }
      for (const m of messages) {
        if (!seen.has(m.id)) result.push(m);
      }
      return result;
    });
  }, [messages]);

  useEffect(() => {
    const pane = messageScrollRef.current;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [localMessages, interimText]);

  const isModelSpeaking = status === "connected" && agentState === "speaking";
  const isListening = status === "connected" && agentState === "listening";
  const isConnecting = starting || status === "connecting";

  return (
    <div className="min-h-screen bg-white pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {            }
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#63A361]/10 rounded-full text-xs font-semibold text-[#63A361] uppercase tracking-wider mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#63A361]" />
            AI Consultation
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#5B532C] mt-2">
            Voice <span className="text-[#63A361]">Consult</span>
          </h1>
          <p className="text-base text-[#5B532C]/60 mt-3 max-w-2xl mx-auto">
            Speak naturally to get real-time farming and market advice
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {                                    }
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="p-6 bg-white rounded-2xl border border-[#5B532C]/10 shadow-lg sticky top-28">
              {                 }
              <div className="text-center mb-6">
                <div
                  className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 ${
                    status === "connected"
                      ? "bg-[#63A361] shadow-lg shadow-[#63A361]/25"
                      : "bg-[#FDE7B3]/50"
                  }`}
                >
                  {status === "connected" ? (
                    <div className="relative">
                      <Bot className="w-10 h-10 text-white" />
                      {(isModelSpeaking || isListening) && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FFC50F] rounded-full animate-pulse" />
                      )}
                    </div>
                  ) : (
                    <MicOff className="w-10 h-10 text-[#5B532C]/40" />
                  )}
                </div>

                <h2 className="text-xl font-bold text-[#5B532C] mb-1">
                  {STATUS_HEADING[status]}
                </h2>
                <p className="text-sm text-[#5B532C]/60">
                  {status === "connected"
                    ? isModelSpeaking
                      ? "AI is speaking..."
                      : isListening
                        ? "Listening to you..."
                        : "Waiting..."
                    : status === "error"
                      ? "The call ended — start again when you are ready"
                      : "Start a voice conversation"}
                </p>
              </div>

              {                             }
              {status === "connected" && (
                <div className="flex items-center justify-center gap-3 mb-6 p-3 bg-[#FDE7B3]/20 rounded-xl">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className={`w-1.5 h-6 rounded-full ${
                          isModelSpeaking
                            ? "bg-[#63A361]"
                            : isListening
                              ? "bg-[#FFC50F]"
                              : "bg-[#5B532C]/20"
                        }`}
                        animate={
                          isModelSpeaking || isListening
                            ? {
                                scaleY: [1, 0.4, 1],
                                opacity: [1, 0.5, 1],
                              }
                            : {}
                        }
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-[#5B532C]/70">
                    {isModelSpeaking
                      ? "Speaking"
                      : isListening
                        ? "Listening"
                        : "Active"}
                  </span>
                </div>
              )}

              {           }
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {                    }
              <button
                onClick={
                  status === "disconnected" || status === "error"
                    ? handleStart
                    : handleStop
                }
                disabled={isConnecting}
                className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  status === "disconnected" || status === "error"
                    ? "bg-[#63A361] text-white hover:bg-[#4a8a4d] shadow-md shadow-[#63A361]/20"
                    : "bg-[#FDE7B3]/50 text-[#5B532C] hover:bg-[#FDE7B3] border border-[#5B532C]/10"
                } ${isConnecting ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : status === "disconnected" || status === "error" ? (
                  <>
                    <Mic className="w-5 h-5" />
                    <span>Start Conversation</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-5 h-5" />
                    <span>End Conversation</span>
                  </>
                )}
              </button>

              {          }
              <div className="mt-6 pt-6 border-t border-[#5B532C]/10">
                <h3 className="text-sm font-semibold text-[#5B532C] mb-3">
                  Tips
                </h3>
                <ul className="space-y-2 text-xs text-[#5B532C]/60">
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#63A361] mt-1.5 shrink-0" />
                    Speak clearly for best results
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#63A361] mt-1.5 shrink-0" />
                    Ask about crops, diseases, or market prices
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#63A361] mt-1.5 shrink-0" />
                    Supports multiple Indian languages
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          {                                }
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl border border-[#5B532C]/10 shadow-lg overflow-hidden h-[600px] flex flex-col">
              {            }
              <div className="p-4 border-b border-[#5B532C]/10 bg-[#FDE7B3]/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#63A361] rounded-xl flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#5B532C]">
                      AI Consultant
                    </h3>
                    <p className="text-xs text-[#5B532C]/60">
                      {status === "connected" ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
              </div>

              {              }
              <div
                ref={messageScrollRef}
                className="flex-1 overflow-y-auto p-6 notranslate"
                translate="no"
              >
                <AnimatePresence mode="wait">
                  {localMessages.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center text-center"
                    >
                      <div className="w-16 h-16 bg-[#FDE7B3]/30 rounded-2xl flex items-center justify-center mb-4">
                        <Bot className="w-8 h-8 text-[#63A361]/50" />
                      </div>
                      <p className="text-[#5B532C] font-medium mb-1">
                        No conversation yet
                      </p>
                      <p className="text-sm text-[#5B532C]/50">
                        Start a voice conversation to get farming advice
                      </p>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {localMessages
                        .filter((msg) => msg.role === "model")
                        .map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-start"
                          >
                            <div className="max-w-[80%] flex gap-3 flex-row">
                              {            }
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#63A361]/10">
                                <Bot className="w-4 h-4 text-[#63A361]" />
                              </div>

                              {                     }
                              <div className="p-4 rounded-2xl text-sm leading-relaxed bg-white border border-[#5B532C]/10 text-[#5B532C] rounded-tl-sm">
                                <span className="block text-xs font-semibold text-[#63A361] mb-1">
                                  Thinking
                                </span>
                                {formatText(msg.text)}
                              </div>
                            </div>
                          </motion.div>
                        ))}

                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {                }
              <div className="p-4 border-t border-[#5B532C]/10 bg-[#FDE7B3]/5">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      status === "connected"
                        ? "bg-[#63A361]"
                        : "bg-[#5B532C]/10"
                    }`}
                  >
                    {status === "connected" ? (
                      <Mic className="w-5 h-5 text-white" />
                    ) : (
                      <MicOff className="w-5 h-5 text-[#5B532C]/40" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-[#5B532C]">
                      {status === "connected"
                        ? isListening
                          ? "Listening..."
                          : isModelSpeaking
                            ? "AI is speaking..."
                            : "Waiting..."
                        : "Start conversation to speak"}
                    </p>
                    <p className="text-xs text-[#5B532C]/50">
                      {status === "connected"
                        ? "Speak naturally, AI will respond"
                        : "Click Start to begin"}
                    </p>
                  </div>
                  {status === "connected" && (
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-[#63A361]"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Consult;
