import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Bot,
  Sprout,
  Mic,
  Loader,
  Square,
  Leaf,
} from "lucide-react";
import aiService, { cancelActiveRequest } from "../ai/aiService";
import { transcribeAudio } from "../ai/voiceTranscribeService";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MAX_RECORDING_SECONDS = 60;

interface Message {
  text: string;
  sender: "user" | "ai";
  timestamp: number;
  thinking?: string;
}

const MessageBubble = ({ message }: { message: Message }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
  >
    <div
      className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${message.sender === "user"
        ? "bg-[#63A361] text-white rounded-br-md"
        : "bg-white border border-[#5B532C]/10 text-[#5B532C] rounded-bl-md"
        }`}
    >
      {message.sender === "ai" ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
          {message.text}
        </ReactMarkdown>
      ) : (
        <div>{message.text}</div>
      )}
    </div>
  </motion.div>
);

const ThinkingBubble = ({ text, thinking }: { text: string; thinking?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex justify-start"
  >
    <div className="max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed bg-white border border-[#5B532C]/10 text-[#5B532C] rounded-bl-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none">
        {text}
      </ReactMarkdown>
      {thinking && (
        <details className="mt-2 pt-2 border-t border-[#5B532C]/10">
          <summary className="text-xs text-[#5B532C]/50 cursor-pointer hover:text-[#63A361]">
            Thinking
          </summary>
          <div className="mt-2 text-xs text-[#5B532C]/60 whitespace-pre-wrap">
            {thinking}
          </div>
        </details>
      )}
    </div>
  </motion.div>
);

const TypingIndicator = () => (
  <div className="flex justify-start">
    <div className="bg-white border border-[#5B532C]/10 rounded-2xl rounded-bl-md px-4 py-3">
      <div className="flex gap-1">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
          className="w-2 h-2 bg-[#63A361] rounded-full"
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
          className="w-2 h-2 bg-[#63A361] rounded-full"
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
          className="w-2 h-2 bg-[#63A361] rounded-full"
        />
      </div>
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FDE7B3]/30 border border-[#5B532C]/10 hover:border-[#63A361]/30 hover:bg-[#FDE7B3]/50 transition-colors text-xs text-[#5B532C]"
  >
    <Icon className="w-3.5 h-3.5 text-[#63A361]" />
    <span>{label}</span>
  </button>
);

const AgriTechChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingThinking, setStreamingThinking] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const messageScrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const pane = messageScrollRef.current;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [messages, streamingText, streamingThinking]);

  const handleSend = useCallback(async (override?: string) => {
    const userMessage = (override ?? input).trim();
    if (!userMessage || isLoading) return;

    setInput("");
    setIsLoading(true);
    setStreamingText("");
    setStreamingThinking("");

    setMessages((prev) => [
      ...prev,
      { text: userMessage, sender: "user", timestamp: Date.now() },
    ]);

    try {
      let responseText = "";
      let thinkingText = "";

      const finalText = await aiService.getAIResponse(
        userMessage,
        {
          previousMessages: messages.map((msg) => ({
            role: msg.sender === "user" ? "user" : "assistant",
            content: msg.text,
          })),
        },
        ({ text, done, thinking }) => {
          if (!done) {
            if (text) {
              responseText += text;
              setStreamingText(responseText);
            }
            if (thinking) {
              thinkingText += thinking;
              setStreamingThinking(thinkingText);
            }
          }
        }
      );

      setMessages((prev) => [
        ...prev,
        { text: finalText, sender: "ai", timestamp: Date.now(), thinking: thinkingText },
      ]);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      setMessages((prev) => [
        ...prev,
        { text: `Could not answer: ${reason}`, sender: "ai", timestamp: Date.now() },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingText("");
      setStreamingThinking("");
    }
  }, [input, isLoading, messages]);

  const handleSendRef = useRef(handleSend);
  useEffect(() => {
    handleSendRef.current = handleSend;
  }, [handleSend]);

  const releaseMic = useCallback(() => {
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    setIsRecording(false);
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      releaseMic();
    }
  }, [releaseMic]);

  const stopRecordingRef = useRef(stopRecording);
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    setIsTranscribing(true);

    try {
      const text = (await transcribeAudio(audioBlob)).text.trim();
      if (text) {
        handleSendRef.current(text);
      } else {
        toast("Could not hear anything — try again");
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not transcribe your recording",
      );
    } finally {
      setIsTranscribing(false);
      setRecordingDuration(0);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("This browser cannot record audio");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      toast.error("Microphone access denied");
      return;
    }
    audioStreamRef.current = stream;

    try {
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "";
      }

      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });
        releaseMic();
        if (audioBlob.size > 0) processAudio(audioBlob);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const next = prev + 1;
          if (next >= MAX_RECORDING_SECONDS) stopRecordingRef.current();
          return next;
        });
      }, 1000);
    } catch (e) {
      releaseMic();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      toast.error(
        e instanceof Error ? e.message : "Could not start the recorder",
      );
    }
  }, [releaseMic, processAudio]);

  useEffect(() => releaseMic, [releaseMic]);

  const quickActions = [
    { icon: Sprout, label: "Crop Advice", action: "What crops should I plant this season?" },
    { icon: Leaf, label: "Disease Help", action: "How do I identify tomato leaf disease?" },
    { icon: Bot, label: "Market Prices", action: "What are current wheat prices?" },
    { icon: Sprout, label: "Soil Tips", action: "How to improve soil fertility?" },
  ];

  return (
    <div className="fixed right-4 bottom-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="mb-4 w-[360px] sm:w-[400px] bg-white rounded-2xl shadow-2xl border border-[#5B532C]/10 overflow-hidden"
          >
            {            }
            <div className="flex items-center justify-between px-4 py-3 bg-[#63A361]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Kisan AI</h3>
                  <p className="text-xs text-white/70">Ask anything about farming</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isLoading && (
                  <button
                    onClick={() => cancelActiveRequest()}
                    className="px-2 py-1 text-xs text-white bg-white/20 rounded hover:bg-white/30 transition-colors"
                  >
                    Stop
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {              }
            <div
              ref={messageScrollRef}
              className="h-[400px] overflow-y-auto bg-[#FDFCF8] p-4 space-y-3"
            >
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-[#5B532C]/50 text-center">Quick actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map(({ icon, label, action }) => (
                      <QuickAction
                        key={label}
                        icon={icon}
                        label={label}
                        onClick={() => handleSend(action)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <MessageBubble key={index} message={message} />
              ))}

              {(streamingText || streamingThinking) && (
                <ThinkingBubble text={streamingText} thinking={streamingThinking} />
              )}

              {isLoading && !streamingText && <TypingIndicator />}

            </div>

            {           }
            <div className="p-3 bg-white border-t border-[#5B532C]/10">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask about farming..."
                  className="flex-1 px-3 py-2 text-sm bg-[#F5F5F0] border border-[#5B532C]/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#63A361]/30 focus:border-[#63A361] text-[#5B532C] placeholder:text-[#5B532C]/40"
                  disabled={isLoading || isTranscribing}
                />
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isTranscribing || isLoading}
                  className={`p-2 rounded-xl transition-colors ${isRecording
                    ? "bg-red-500 text-white"
                    : "bg-[#F5F5F0] text-[#5B532C] hover:bg-[#FDE7B3]/50"
                    }`}
                >
                  {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading || isTranscribing}
                  className="p-2 bg-[#63A361] text-white rounded-xl hover:bg-[#4a8a4d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isTranscribing ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>

              {                         }
              <AnimatePresence>
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 flex items-center justify-center gap-2 text-xs text-red-500"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-2 h-2 bg-red-500 rounded-full"
                    />
                    <span>Recording {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {                   }
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.95 }}
        className="p-4 bg-[#63A361] text-white rounded-full shadow-lg hover:bg-[#4a8a4d] transition-colors"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </motion.button>
    </div>
  );
};

export default AgriTechChatbot;
