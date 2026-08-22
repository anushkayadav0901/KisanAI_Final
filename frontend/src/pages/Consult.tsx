import React, { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveAPI, type LiveMessage } from "../hooks/useLiveAPI";
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

/**
 * Format model text — show raw output including thinking markers.
 */
const formatText = (text: string) => {
  if (!text.trim()) return null;
  return <span>{text}</span>;
};

const Consult: React.FC = () => {
  const { selected: language } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [localMessages, setLocalMessages] = useState<LiveMessage[]>([]);
  const [interimText, setInterimText] = useState("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recorderNodeRef = useRef<AudioWorkletNode | null>(null);
  const playerNodeRef = useRef<AudioWorkletNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);

  const handleAudioData = useCallback((base64Audio: string) => {
    try {
      const arrayBuffer = base64ToArrayBuffer(base64Audio);
      const int16Array = new Int16Array(arrayBuffer);
      const float32Array = int16ToFloat32(int16Array);

      if (playerNodeRef.current) {
        playerNodeRef.current.port.postMessage(float32Array);
      }
    } catch (e) {
      console.error("Error processing audio data", e);
    }
  }, []);

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
    onError: (err) => console.error("LiveAPI Error:", err),
    language: language.name,
  });

  // Keep ref in sync with status so closures can read live value
  useEffect(() => {
    isConnectedRef.current = status === "connected";
  }, [status]);

  const initializeAudio = async () => {
    try {
      const ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
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

      const source = ctx.createMediaStreamSource(stream);
      const recorderNode = new AudioWorkletNode(ctx, "audio-recorder-worklet");

      recorderNode.port.onmessage = (event) => {
        if (event.data) {
          const int16 = float32ToInt16(event.data);
          const base64 = arrayBufferToBase64(int16.buffer as ArrayBuffer);
          sendAudioChunk(base64);
        }
      };

      source.connect(recorderNode);
      recorderNodeRef.current = recorderNode;

      // Seed initial connection message in appropriate language
      let welcomeMsg =
        "Hello! I am your Kisan-Saathi expert. How can I help you today?";
      if (language.name === "Hindi")
        welcomeMsg =
          "नमस्ते! मैं आपका किसान-साथी विशेषज्ञ हूँ। मैं आज आपकी कैसे मदद कर सकता हूँ?";
      if (language.name === "Marathi")
        welcomeMsg =
          "नमस्कार! मी तुमचा किसान-साथी तज्ञ आहे. मी आज तुम्हाला कशी मदत करू शकेन?";
      if (language.name === "Tamil")
        welcomeMsg =
          "வணக்கம்! நான் உங்கள் கிசான்-சாத்தி நிபுணர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?";

      await connect();
      // Send a text prompt to Gemini to initiate an audio greeting
      sendText(`Start by greeting me with this exact phrase: "${welcomeMsg}"`);

      // Initialize SpeechRecognition for user transcription
      const SpeechRec =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true; // CHANGED to see live transcriptions

        if (language.name === "Hindi") recognition.lang = "hi-IN";
        else if (language.name === "Marathi") recognition.lang = "mr-IN";
        else if (language.name === "Tamil") recognition.lang = "ta-IN";
        else recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const transcript = event.results[i][0].transcript;
              console.log("[SpeechRecognition] Final transcript:", transcript);
              if (transcript.trim()) {
                setLocalMessages((prev) => [
                  ...prev,
                  {
                    id: "user-" + Date.now() + "-" + Math.random(),
                    role: "user",
                    text: transcript.trim(),
                    isFinal: true,
                  },
                ]);
              }
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          setInterimText(interim);
        };
        recognition.onend = () => {
          console.log(
            "[SpeechRecognition] ended, isConnected:",
            isConnectedRef.current,
          );
          // Auto-reconnect if still connected (use ref to avoid stale closure)
          if (isConnectedRef.current) {
            try {
              setTimeout(() => recognition.start(), 400);
            } catch {
              /* ignore */
            }
          }
        };
        recognition.onerror = (e: any) => {
          console.warn("[SpeechRecognition] error:", e.error);
        };
        recognitionRef.current = recognition;
        console.log(
          "[SpeechRecognition] Starting with lang:",
          recognition.lang,
        );
        try {
          recognition.start();
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      console.error("Failed to initialize audio", e);
    }
  };

  const cleanupAudio = useCallback(() => {
    if (recorderNodeRef.current) {
      recorderNodeRef.current.disconnect();
      recorderNodeRef.current = null;
    }
    if (playerNodeRef.current) {
      playerNodeRef.current.disconnect();
      playerNodeRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => {
    disconnect();
    cleanupAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Merge model messages from the hook while preserving user messages added locally
  // Maintains chronological order: existing entries keep their position,
  // model messages get updated in-place, new ones are appended.
  useEffect(() => {
    setLocalMessages((prev) => {
      const modelById = new Map(messages.map((m) => [m.id, m]));
      const seenModelIds = new Set<string>();
      const result: LiveMessage[] = [];

      // Walk existing order — keep user msgs, update model msgs in-place
      for (const p of prev) {
        if (p.role === "user") {
          result.push(p);
        } else if (p.role === "model" && modelById.has(p.id)) {
          result.push(modelById.get(p.id)!);
          seenModelIds.add(p.id);
        }
      }

      // Append brand-new model messages that weren't in prev
      for (const m of messages) {
        if (!seenModelIds.has(m.id)) {
          result.push(m);
        }
      }

      return result;
    });
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, interimText]);

  const handleStart = () => {
    initializeAudio();
  };

  const handleStop = () => {
    disconnect();
    cleanupAudio();
  };

  const isModelSpeaking = status === "connected" && agentState === "speaking";
  const isListening = status === "connected" && agentState === "listening";
  const isConnecting = status === "connecting";

  return (
    <div className="min-h-screen bg-white pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
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
          {/* Left Panel - Status & Controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="p-6 bg-white rounded-2xl border border-[#5B532C]/10 shadow-lg sticky top-28">
              {/* Status Card */}
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
                  {status === "disconnected"
                    ? "Ready to Connect"
                    : status === "connecting"
                      ? "Connecting..."
                      : "AI Connected"}
                </h2>
                <p className="text-sm text-[#5B532C]/60">
                  {status === "connected"
                    ? isModelSpeaking
                      ? "AI is speaking..."
                      : isListening
                        ? "Listening to you..."
                        : "Waiting..."
                    : "Start a voice conversation"}
                </p>
              </div>

              {/* Simple Status Indicator */}
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

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Control Button */}
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

              {/* Tips */}
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

          {/* Right Panel - Conversation */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl border border-[#5B532C]/10 shadow-lg overflow-hidden h-[600px] flex flex-col">
              {/* Header */}
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

              {/* Messages */}
              <div
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
                              {/* Avatar */}
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#63A361]/10">
                                <Bot className="w-4 h-4 text-[#63A361]" />
                              </div>

                              {/* Thinking Bubble */}
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

              {/* Input Area */}
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
