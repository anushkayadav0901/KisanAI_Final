/**
 * Kisan AI — Live Monitoring (Redesigned)
 * Fixed layout: Static camera preview, dynamic stats below, sidebar on right
 * Design: Kisan AI brand system (#63A361 green, #FFC50F yellow, #5B532C brown, #FDE7B3 cream)
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  StopCircle,
  Loader,
  ScanSearch,
  Eye,
  ChevronDown,
  ChevronUp,
  Trash2,
  Activity,
  AlertTriangle,
  Shield,
  Camera,
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  TrendingUp,
  Filter,
  Clock,
  Target,
  Wifi,
  WifiOff,
  BarChart3,
  Cloud,
  Video,
  Zap,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import useGeminiLive from "../../hooks/useGeminiLive";
import {
  generateComprehensiveReport,
  ComprehensiveSessionReport,
} from "../../ai/sessionReportService";
import { ComprehensiveReport } from "./ComprehensiveReport";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  id: string;
  timestamp: number;
  timeString: string;
  message: string;
  type: "observation" | "alert" | "error";
  detections?: YOLODetection[];
}

interface YOLODetection {
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number];
  center: [number, number];
}

interface Analysis {
  disease?: {
    name: string | null;
    severity: number;
    confidence: number;
    appearance?: string;
    affected_parts?: string[];
    progression_stage?: string;
  };
  crop_type?: string;
  pests?: Array<{ type: string; count: number; description?: string }>;
  health_score: number;
  recommendations: string[];
  summary?: string;
}

interface WeatherData {
  name: string;
  main: { temp: number; humidity: number; feels_like: number };
  weather: Array<{ main: string; description: string; icon: string }>;
  wind: { speed: number };
}

interface LocationInfo {
  city: string;
  lat: number;
  lon: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const YOLO_BASE = "/yolo";
const API_BASE = "/api";
const FRAME_MS = 1000;
const MAX_LOG = 100;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const healthColor = (s: number) =>
  s >= 80 ? "#63A361" : s >= 60 ? "#FFC50F" : "#ef4444";
const healthLabel = (s: number) =>
  s >= 80 ? "Excellent" : s >= 60 ? "Good" : s >= 40 ? "Fair" : "Poor";

// ─── Scanning Line ────────────────────────────────────────────────────────────

const ScanLine: React.FC = () => (
  <motion.div
    className="absolute left-0 right-0 h-px pointer-events-none z-10"
    style={{
      background:
        "linear-gradient(90deg, transparent 0%, #63A361 40%, #63A361 60%, transparent 100%)",
      boxShadow: "0 0 8px #63A36188",
    }}
    animate={{ top: ["3%", "97%", "3%"] }}
    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
  />
);

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
  sub?: string;
  trend?: "up" | "down" | "stable";
}> = ({ label, value, icon: Icon, color, sub, trend }) => (
  <div className="p-4 bg-white rounded-xl border border-[#5B532C]/10 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-2">
      <div className="w-8 h-8 bg-[#FDE7B3]/30 rounded-lg flex items-center justify-center">
        <Icon className="w-4 h-4 text-[#63A361]" />
      </div>
      {trend && (
        <div
          className={`text-xs ${trend === "up" ? "text-[#63A361]" : trend === "down" ? "text-red-500" : "text-[#5B532C]/40"}`}
        >
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
        </div>
      )}
    </div>
    <p className="text-2xl font-bold" style={{ color: color || "#5B532C" }}>
      {value}
    </p>
    <p className="text-xs text-[#5B532C]/50 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-[#5B532C]/35 mt-0.5">{sub}</p>}
  </div>
);

// ─── Compact Stat ─────────────────────────────────────────────────────────────

const CompactStat: React.FC<{
  label: string;
  value: string | number;
  icon: React.ElementType;
}> = ({ label, value, icon: Icon }) => (
  <div className="flex items-center gap-2 px-3 py-2 bg-[#FDE7B3]/10 rounded-lg">
    <Icon className="w-3.5 h-3.5 text-[#63A361]" />
    <div>
      <p className="text-sm font-bold text-[#5B532C]">{value}</p>
      <p className="text-[10px] text-[#5B532C]/50 uppercase">{label}</p>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const LiveMonitoring: React.FC = () => {
  type Mode =
    | "idle"
    | "locating"
    | "connecting"
    | "live"
    | "generating-report"
    | "report"
    | "error";
  type LogFilter = "all" | "alert" | "observation";

  const [mode, setMode] = useState<Mode>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<LogFilter>("all");
  const [detections, setDetections] = useState<YOLODetection[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [yoloOnline, setYoloOnline] = useState<boolean | null>(null);
  const [llavaOnline, setLlavaOnline] = useState<boolean>(false);
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [comprehensiveReport, setComprehensiveReport] =
    useState<ComprehensiveSessionReport | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [, setLastAnalysisMs] = useState<number | null>(null);
  const [healthHistory, setHealthHistory] = useState<number[]>([]);
  const [showLog, setShowLog] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const frameCountRef = useRef(0);
  const processingRef = useRef(false);
  const detectionsRef = useRef<YOLODetection[]>([]);
  const logRef = useRef<LogEntry[]>([]);
  const analysisRef = useRef<Analysis | null>(null);
  const healthScoresRef = useRef<number[]>([]);
  const sessionStartRef = useRef<string>("");
  const logEndRef = useRef<HTMLDivElement>(null);
  const glowFrameRef = useRef<number | null>(null);
  const glowPhaseRef = useRef(0);
  const isMountedRef = useRef(true);
  const aiConnectedRef = useRef(false);
  const lastFrameSentRef = useRef<number>(0);
  const prevYoloOnlineRef = useRef<boolean | null>(null);
  const llavaOnlineRef = useRef(false);
  const llavaBusyRef = useRef(false);

  useEffect(() => {
    llavaOnlineRef.current = llavaOnline;
  }, [llavaOnline]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    detectionsRef.current = detections;
  }, [detections]);
  useEffect(() => {
    logRef.current = log;
  }, [log]);
  useEffect(() => {
    analysisRef.current = analysis;
  }, [analysis]);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  // Toast on YOLO status change (only on change, not initial)
  useEffect(() => {
    if (yoloOnline === null) return;
    if (prevYoloOnlineRef.current === null) {
      prevYoloOnlineRef.current = yoloOnline;
      return;
    }
    if (yoloOnline !== prevYoloOnlineRef.current) {
      if (yoloOnline)
        toast.success("YOLO detection online", { duration: 2000, icon: "🎯" });
      else
        toast("YOLO offline — AI analysis continues", {
          duration: 3000,
          icon: "⚠️",
        });
      prevYoloOnlineRef.current = yoloOnline;
    }
  }, [yoloOnline]);

  // Keyboard shortcut: Space to start/stop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      e.preventDefault();
      if (mode === "idle") start();
      else if (mode === "live") stop();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode]);

  // ─── Location + Weather ────────────────────────────────────────────────────

  const getLocationAndWeather = async (): Promise<{
    location: LocationInfo;
    weather: WeatherData;
  } | null> => {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000,
          maximumAge: 60000,
          enableHighAccuracy: false,
        });
      });
      const { latitude: lat, longitude: lon } = pos.coords;
      const weatherRes = await fetch(
        `${API_BASE}/weather/coords?lat=${lat}&lon=${lon}`,
      );
      let cityName = "Unknown Location";
      let weatherData: WeatherData | null = null;
      if (weatherRes.ok) {
        weatherData = await weatherRes.json();
        cityName = weatherData?.name || "Unknown Location";
      } else {
        const fallbackRes = await fetch(`${API_BASE}/weather/${lat},${lon}`);
        if (fallbackRes.ok) {
          weatherData = await fallbackRes.json();
          cityName =
            weatherData?.name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
        }
      }
      const locationInfo: LocationInfo = { city: cityName, lat, lon };
      if (weatherData) return { location: locationInfo, weather: weatherData };
      return {
        location: locationInfo,
        weather: null as unknown as WeatherData,
      };
    } catch {
      return null;
    }
  };

  // ─── Gemini Live ────────────────────────────────────────────────────────────

  const onAnalysis = useCallback((data: unknown) => {
    try {
      const a = parseAnalysis(data as Parameters<typeof parseAnalysis>[0]);

      // Enforce >90% confidence — discard low-confidence disease detections
      if (a.disease?.name && (a.disease.confidence ?? 0) < 90) {
        a.disease = undefined;
      }

      setAnalysis(a);
      analysisRef.current = a;
      setAnalysisCount((c) => c + 1);
      if (lastFrameSentRef.current > 0)
        setLastAnalysisMs(Date.now() - lastFrameSentRef.current);
      if (a.health_score > 0) {
        healthScoresRef.current.push(a.health_score);
        setHealthHistory((prev) => [...prev, a.health_score].slice(-50));
      }
      const hasIssue =
        (a.disease?.name && a.disease.severity > 0) ||
        a.pests?.length ||
        a.health_score < 60;
      if (hasIssue) {
        const isAlert = (a.disease?.severity ?? 0) > 5 || a.health_score < 50;
        addLog({
          message: buildMessage(a),
          type: isAlert ? "alert" : "observation",
          detections: detectionsRef.current.filter((d) => d.confidence >= 0.9),
        });

        // Notifications removed — logs are sufficient
      }
    } catch {
      /* ignore */
    }
  }, []);

  const onError = useCallback((err: string) => {
    addLog({ message: `AI: ${err}`, type: "error" });
  }, []);

  const onConnect = useCallback(() => {
    if (isMountedRef.current)
      toast.success("AI analysis connected", { duration: 2000, icon: "🤖" });
  }, []);

  const onDisconnect = useCallback(() => {
    /* silent */
  }, []);

  const {
    isConnected: aiConnected,
    isAnalyzing: aiAnalyzing,
    connect: connectAI,
    disconnect: disconnectAI,
    sendFrame,
  } = useGeminiLive({ onAnalysis, onError, onConnect, onDisconnect });

  useEffect(() => {
    aiConnectedRef.current = aiConnected;
  }, [aiConnected]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  interface GeminiMsg {
    serverContent?: { modelTurn?: { parts?: Array<{ text?: string }> } };
  }

  const parseAnalysis = (data: GeminiMsg): Analysis => {
    const text = data.serverContent?.modelTurn?.parts?.[0]?.text || "";
    try {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) {
        const p = JSON.parse(m[0]) as Analysis;
        if (p.disease?.name === null) p.disease = undefined;
        return p;
      }
    } catch {
      /* fall through */
    }
    return { health_score: 75, recommendations: ["Continue monitoring"] };
  };

  const buildMessage = (a: Analysis): string => {
    const parts: string[] = [];

    if (a.crop_type && a.crop_type !== "unknown") parts.push(a.crop_type);

    if (a.disease?.name) {
      parts.push(`${a.disease.name} ${a.disease.severity}/10`);
    }

    if (a.pests?.length) {
      parts.push(`${a.pests[0].count} ${a.pests[0].type}`);
    }

    // Use AI summary as the concise description
    if (a.summary) {
      parts.push(`— ${a.summary}`);
    } else if (!a.disease?.name && !a.pests?.length) {
      parts.push(`Health ${a.health_score}/100`);
    }

    return parts.join(" ");
  };

  const addLog = useCallback(
    (entry: Omit<LogEntry, "id" | "timestamp" | "timeString">) => {
      const newEntry: LogEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        timeString: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        ...entry,
      };
      setLog((prev) => [...prev, newEntry].slice(-MAX_LOG));
    },
    [],
  );

  const filteredLog =
    logFilter === "all" ? log : log.filter((e) => e.type === logFilter);

  // ─── Local vision (Ollama / LLaVA) ──────────────────────────────────────────

  const checkLocalVision = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/ai/local-vision/health`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setLlavaOnline(Boolean(d.available));
      return Boolean(d.available);
    } catch {
      setLlavaOnline(false);
      return false;
    }
  }, []);

  // Fire-and-forget: describe the current frame on the local model and log it.
  const describeLocal = useCallback(
    async (b64: string) => {
      if (llavaBusyRef.current || !llavaOnlineRef.current) return;
      llavaBusyRef.current = true;
      try {
        const r = await fetch(`${API_BASE}/ai/vision-commentary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: b64, mode: "live" }),
          signal: AbortSignal.timeout(45000),
        });
        if (!r.ok) throw new Error(String(r.status));
        const d = await r.json();
        setLlavaOnline(true);
        if (d.observation && typeof d.observation === "string") {
          addLog({
            message: `[local] ${d.observation}`,
            type: d.alert ? "alert" : "observation",
          });
        }
      } catch {
        setLlavaOnline(false);
      } finally {
        llavaBusyRef.current = false;
      }
    },
    [addLog],
  );

  // ─── Canvas / YOLO ──────────────────────────────────────────────────────────

  const drawBoxes = useCallback(
    (dets: YOLODetection[], canvas: HTMLCanvasElement, phase: number) => {
      const ctx = canvas.getContext("2d");
      const video = videoRef.current;
      if (!ctx || !video?.videoWidth) return;
      const rect = video.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      const sx = rect.width / video.videoWidth;
      const sy = rect.height / video.videoHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const glow = 0.5 + 0.5 * Math.abs(Math.sin(phase));
      dets.forEach((d) => {
        const [x1, y1, x2, y2] = d.bbox;
        const color =
          d.class_name === "disease"
            ? "#ef4444"
            : d.class_name === "pest"
              ? "#f97316"
              : "#63A361";
        const bx = x1 * sx,
          by = y1 * sy,
          bw = (x2 - x1) * sx,
          bh = (y2 - y1) * sy;
        const cl = Math.min(bw, bh) * 0.2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10 * glow;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.55 + 0.45 * glow;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 14 * glow;
        [
          [
            [bx, by + cl],
            [bx, by],
            [bx + cl, by],
          ],
          [
            [bx + bw - cl, by],
            [bx + bw, by],
            [bx + bw, by + cl],
          ],
          [
            [bx, by + bh - cl],
            [bx, by + bh],
            [bx + cl, by + bh],
          ],
          [
            [bx + bw - cl, by + bh],
            [bx + bw, by + bh],
            [bx + bw, by + bh - cl],
          ],
        ].forEach((pts) => {
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          ctx.lineTo(pts[1][0], pts[1][1]);
          ctx.lineTo(pts[2][0], pts[2][1]);
          ctx.stroke();
        });
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        const label = `${d.class_name} ${Math.round(d.confidence * 100)}%`;
        ctx.font = "bold 11px monospace";
        const lw = ctx.measureText(label).width + 8;
        ctx.fillStyle = color + "cc";
        ctx.fillRect(bx, by - 20, lw, 18);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, bx + 4, by - 6);
      });
    },
    [],
  );

  const animateGlow = useCallback(() => {
    glowPhaseRef.current += 0.07;
    if (overlayCanvasRef.current && detectionsRef.current.length > 0) {
      drawBoxes(
        detectionsRef.current,
        overlayCanvasRef.current,
        glowPhaseRef.current,
      );
    }
    glowFrameRef.current = requestAnimationFrame(animateGlow);
  }, [drawBoxes]);

  useEffect(() => {
    if (mode === "live") {
      glowFrameRef.current = requestAnimationFrame(animateGlow);
    } else {
      if (glowFrameRef.current) {
        cancelAnimationFrame(glowFrameRef.current);
        glowFrameRef.current = null;
      }
    }
    return () => {
      if (glowFrameRef.current) {
        cancelAnimationFrame(glowFrameRef.current);
        glowFrameRef.current = null;
      }
    };
  }, [mode, animateGlow]);

  // ─── Frame processing ───────────────────────────────────────────────────────

  const processFrame = useCallback(async () => {
    if (processingRef.current || !videoRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2 || !video.videoWidth) return;
    processingRef.current = true;
    frameCountRef.current++;
    try {
      const canvas = captureCanvasRef.current;
      if (!canvas) {
        processingRef.current = false;
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        processingRef.current = false;
        return;
      }
      ctx.drawImage(video, 0, 0);
      const b64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
      if (aiConnectedRef.current) {
        lastFrameSentRef.current = Date.now();
        sendFrame(b64);
      }
      if (frameCountRef.current % 3 === 0 && yoloOnline !== false) {
        try {
          const r = await fetch(`${YOLO_BASE}/detect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: b64, conf_threshold: 0.9 }),
            signal: AbortSignal.timeout(3000),
          });
          if (r.ok) {
            const d = await r.json();
            setDetections(d.detections || []);
            if (!yoloOnline) setYoloOnline(true);
          } else {
            setYoloOnline(false);
          }
        } catch {
          setYoloOnline(false);
        }
      }
      if (frameCountRef.current % 10 === 0) {
        describeLocal(b64);
      }
    } catch {
      /* ignore */
    } finally {
      processingRef.current = false;
    }
  }, [sendFrame, yoloOnline, describeLocal]);

  // ─── Duration timer ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (mode === "live") {
      durationIntervalRef.current = setInterval(
        () => setDuration((p) => p + 1),
        1000,
      );
    } else {
      if (durationIntervalRef.current)
        clearInterval(durationIntervalRef.current);
    }
    return () => {
      if (durationIntervalRef.current)
        clearInterval(durationIntervalRef.current);
    };
  }, [mode]);

  // ─── Camera ─────────────────────────────────────────────────────────────────

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment",
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((res) => {
          const v = videoRef.current!;
          if (v.readyState >= 2) {
            res();
            return;
          }
          v.onloadeddata = () => res();
        });
      }
      setCameraError(null);
      return true;
    } catch {
      setCameraError(
        "Camera access denied. Please allow camera permissions and try again.",
      );
      toast.error("Camera access denied");
      return false;
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    overlayCanvasRef.current?.getContext("2d")?.clearRect(0, 0, 9999, 9999);
  };

  // ─── Start / Stop ────────────────────────────────────────────────────────────

  const start = async () => {
    // Reset state
    setLog([]);
    setDetections([]);
    setAnalysis(null);
    setDuration(0);
    setComprehensiveReport(null);
    setAnalysisCount(0);
    setLastAnalysisMs(null);
    setHealthHistory([]);
    frameCountRef.current = 0;
    processingRef.current = false;
    healthScoresRef.current = [];
    lastFrameSentRef.current = 0;
    sessionStartRef.current = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    setMode("locating");
    const locationResult = await getLocationAndWeather();
    if (!isMountedRef.current) return;
    if (locationResult) {
      setLocation(locationResult.location);
      if (locationResult.weather) {
        setWeather(locationResult.weather);
        toast(
          `📍 ${locationResult.location.city} · ${locationResult.weather.main.temp}°C`,
          { duration: 2500 },
        );
      }
    }
    setMode("connecting");
    const ok = await startCamera();
    if (!isMountedRef.current) return;
    if (!ok) {
      setMode("error");
      return;
    }
    connectAI();
    checkLocalVision();
    setMode("live");
    frameIntervalRef.current = setInterval(processFrame, FRAME_MS);
  };

  const stop = useCallback(async () => {
    stopCamera();
    disconnectAI();
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    const finalDuration = duration;
    const finalLog = [...logRef.current];
    const finalWeather = weather;
    const finalLocation = location;
    const finalHealthScores = [...healthScoresRef.current];

    setMode("generating-report");
    toast("Generating comprehensive AI report...", { duration: 3000 });

    try {
      const report = await generateComprehensiveReport(
        finalDuration,
        finalLog,
        finalWeather,
        finalLocation,
        finalHealthScores,
      );
      setComprehensiveReport(report);
      setMode("report");
      toast.success("Comprehensive report ready!", { duration: 2000 });
    } catch {
      setMode("idle");
      toast.error("Could not generate report");
    }
    processingRef.current = false;
  }, [disconnectAI, duration, weather, location]);

  const newSession = () => {
    setMode("idle");
    setComprehensiveReport(null);
    setLog([]);
    setDetections([]);
    setAnalysis(null);
    setDuration(0);
    setLocation(null);
    setWeather(null);
    setAnalysisCount(0);
    setLastAnalysisMs(null);
    setHealthHistory([]);
    frameCountRef.current = 0;
    healthScoresRef.current = [];
  };

  useEffect(() => {
    return () => {
      stopCamera();
      disconnectAI();
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, [disconnectAI]);

  const fmt = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const clearLog = () => {
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#5B532C]">Clear history?</span>
          <button
            onClick={() => {
              setLog([]);
              toast.dismiss(t.id);
            }}
            className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium"
          >
            Clear
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1 bg-[#FDE7B3]/50 text-[#5B532C] rounded-lg text-xs font-medium border border-[#5B532C]/20"
          >
            Cancel
          </button>
        </div>
      ),
      { duration: 5000 },
    );
  };

  // AI status config
  const aiStatus =
    aiConnected && aiAnalyzing
      ? {
          label: "Analyzing",
          dotClass: "bg-[#63A361] animate-pulse",
          wrapClass: "bg-[#63A361] text-white",
        }
      : aiConnected
        ? {
            label: "Connected",
            dotClass: "bg-[#63A361]",
            wrapClass: "bg-[#5B532C]/80 text-white",
          }
        : {
            label: "Connecting...",
            dotClass: "bg-[#FFC50F] animate-pulse",
            wrapClass: "bg-[#5B532C]/60 text-white",
          };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (mode === "report" && comprehensiveReport) {
    return (
      <div className="pb-12">
        <Toaster position="top-right" />
        <ComprehensiveReport
          report={comprehensiveReport}
          onNewSession={newSession}
        />
      </div>
    );
  }

  if (mode === "generating-report") {
    return (
      <div className="pb-12 flex items-center justify-center min-h-100">
        <Toaster position="top-right" />
        <div className="text-center p-10 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#63A361]/10 rounded-2xl flex items-center justify-center">
            <Loader className="w-8 h-8 text-[#63A361] animate-spin" />
          </div>
          <p className="text-base font-semibold text-[#5B532C]">
            Generating comprehensive report...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <Toaster position="top-right" />
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ── Left Column: Camera & Stats (8 cols) ── */}
        <div className="lg:col-span-8 space-y-5">
          {/* Camera Card - Fixed Height */}
          <div className="bg-white rounded-2xl border border-[#5B532C]/20 shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#5B532C]/10 bg-[#FDE7B3]/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#63A361]/10 rounded-xl flex items-center justify-center">
                  <Camera className="w-5 h-5 text-[#63A361]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#5B532C]">
                    Live Camera
                  </p>
                  <p className="text-xs text-[#5B532C]/50">
                    {mode === "live"
                      ? `Active Session`
                      : mode === "locating"
                        ? "Getting location..."
                        : mode === "connecting"
                          ? "Starting camera..."
                          : "Ready to start"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {location && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FDE7B3]/50 border border-[#5B532C]/15">
                    <MapPin className="w-3 h-3 text-[#63A361]" />
                    <span className="text-xs font-medium text-[#5B532C]">
                      {location.city}
                    </span>
                  </div>
                )}
                {mode === "live" && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-bold text-red-600 tracking-wide">
                      LIVE
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Video area - Fixed aspect ratio */}
            <div className="relative bg-[#FDFCF8] aspect-video overflow-hidden">
              {mode === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FDE7B3]/5">
                  <div className="w-20 h-20 bg-[#63A361]/10 rounded-2xl flex items-center justify-center mb-4 border border-[#63A361]/20">
                    <Camera className="w-10 h-10 text-[#63A361]" />
                  </div>
                  <p className="text-sm font-semibold text-[#5B532C]">
                    Camera ready
                  </p>
                  <p className="text-xs text-[#5B532C]/40 mt-1">
                    AI-powered crop monitoring
                  </p>
                </div>
              )}

              {(mode === "locating" || mode === "connecting") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FDE7B3]/5">
                  <div className="w-16 h-16 bg-[#63A361]/10 rounded-2xl flex items-center justify-center mb-4 border border-[#63A361]/20">
                    <Loader className="w-8 h-8 text-[#63A361] animate-spin" />
                  </div>
                  <p className="text-sm font-semibold text-[#5B532C]">
                    {mode === "locating"
                      ? "Getting your location..."
                      : "Starting camera..."}
                  </p>
                </div>
              )}

              {mode === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-red-50">
                  <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-3 border border-red-200">
                    <AlertTriangle className="w-7 h-7 text-red-500" />
                  </div>
                  <p className="text-sm font-semibold text-red-700 mb-1">
                    Camera unavailable
                  </p>
                  <p className="text-xs text-red-500 text-center mb-4">
                    {cameraError}
                  </p>
                  <button
                    onClick={() => setMode("idle")}
                    className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${mode !== "live" ? "hidden" : ""}`}
              />

              {mode === "live" && (
                <>
                  <ScanLine />
                  <canvas
                    ref={overlayCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  />

                  {/* AI status pill — top right */}
                  <div
                    className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${aiStatus.wrapClass}`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${aiStatus.dotClass}`}
                    />
                    {aiStatus.label}
                  </div>

                  {/* YOLO + local vision status — top left */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        yoloOnline
                          ? "bg-[#63A361] text-white"
                          : "bg-[#FFC50F]/80 text-[#5B532C]"
                      }`}
                    >
                      {yoloOnline ? (
                        <Wifi className="w-3 h-3" />
                      ) : (
                        <WifiOff className="w-3 h-3" />
                      )}
                      {yoloOnline ? "YOLO" : "YOLO Off"}
                    </div>
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        llavaOnline
                          ? "bg-[#63A361] text-white"
                          : "bg-[#5B532C]/50 text-white"
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      {llavaOnline ? "LLaVA Local" : "LLaVA Off"}
                    </div>
                  </div>

                  {/* Analysis overlay — bottom */}
                  {analysis && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black/70 via-black/30 to-transparent">
                      <motion.div
                        key={analysis.health_score}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3"
                      >
                        <div
                          className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border border-white/20"
                          style={{
                            backgroundColor:
                              healthColor(analysis.health_score) + "33",
                          }}
                        >
                          <span
                            className="text-lg font-bold"
                            style={{
                              color: healthColor(analysis.health_score),
                            }}
                          >
                            {analysis.health_score}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold leading-tight">
                            {healthLabel(analysis.health_score)} health
                            {analysis.disease?.name && (
                              <span className="ml-2 px-1.5 py-0.5 bg-red-500/80 rounded text-xs font-medium">
                                {analysis.disease.name}
                              </span>
                            )}
                          </p>
                          {analysis.recommendations[0] && (
                            <p className="text-white/60 text-xs mt-0.5 truncate">
                              {analysis.recommendations[0]}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Controls */}
            <div className="px-5 py-4 border-t border-[#5B532C]/10 bg-[#FDE7B3]/5">
              {mode === "idle" && (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={start}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#63A361] text-white rounded-xl font-semibold hover:bg-[#4a8a4d] transition-colors shadow-md shadow-[#63A361]/25"
                >
                  <Video className="w-4 h-4" />
                  Start Monitoring
                </motion.button>
              )}
              {(mode === "locating" || mode === "connecting") && (
                <div className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#FDE7B3]/30 rounded-xl text-[#5B532C]/60 text-sm border border-[#5B532C]/15">
                  <Loader className="w-4 h-4 animate-spin text-[#63A361]" />
                  {mode === "locating" ? "Getting location..." : "Starting..."}
                </div>
              )}
              {mode === "live" && (
                <div className="flex items-center justify-between">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={stop}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors text-sm shadow-md shadow-red-500/20"
                  >
                    <StopCircle className="w-4 h-4" />
                    Stop & Generate Report
                  </motion.button>
                  <div className="flex items-center gap-4 text-sm text-[#5B532C]/60">
                    <CompactStat
                      label="Duration"
                      value={fmt(duration)}
                      icon={Clock}
                    />
                    <CompactStat
                      label="Analyses"
                      value={analysisCount}
                      icon={BarChart3}
                    />
                    <CompactStat
                      label="Objects"
                      value={detections.length}
                      icon={Target}
                    />
                  </div>
                </div>
              )}
              {mode === "error" && (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setMode("idle")}
                  className="w-full py-3 bg-[#5B532C] text-white rounded-xl font-semibold hover:bg-[#4a4220] transition-colors text-sm"
                >
                  Try again
                </motion.button>
              )}
            </div>
          </div>

          {/* Stats Grid - Below Camera */}
          {mode === "live" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Health Score"
                value={analysis ? analysis.health_score : "—"}
                icon={Shield}
                color={
                  analysis ? healthColor(analysis.health_score) : undefined
                }
                sub={analysis ? healthLabel(analysis.health_score) : undefined}
                trend={
                  healthHistory.length > 2 && analysis
                    ? analysis.health_score >
                      healthHistory[healthHistory.length - 2]
                      ? "up"
                      : analysis.health_score <
                          healthHistory[healthHistory.length - 2]
                        ? "down"
                        : "stable"
                    : undefined
                }
              />
              <StatCard label="Duration" value={fmt(duration)} icon={Clock} />
              <StatCard
                label="Analyses"
                value={analysisCount}
                icon={BarChart3}
              />
              <StatCard
                label="Detections"
                value={detections.length}
                icon={Target}
              />
            </div>
          )}

          {/* Weather Card */}
          {weather && location && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-white rounded-2xl border border-[#5B532C]/20 shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Cloud className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#5B532C]">
                      {location.city}
                    </p>
                    <p className="text-xs text-[#5B532C]/50 capitalize">
                      {weather.weather[0]?.description}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-3 bg-[#FDE7B3]/20 rounded-xl">
                  <Thermometer className="w-4 h-4 text-[#FFC50F]" />
                  <div>
                    <p className="text-sm font-bold text-[#5B532C]">
                      {weather.main.temp}°C
                    </p>
                    <p className="text-[10px] text-[#5B532C]/50">Temperature</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-sm font-bold text-[#5B532C]">
                      {weather.main.humidity}%
                    </p>
                    <p className="text-[10px] text-[#5B532C]/50">Humidity</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-[#63A361]/10 rounded-xl">
                  <Wind className="w-4 h-4 text-[#63A361]" />
                  <div>
                    <p className="text-sm font-bold text-[#5B532C]">
                      {weather.wind.speed}
                    </p>
                    <p className="text-[10px] text-[#5B532C]/50">m/s Wind</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Right Column: Log & Analysis (4 cols) ── */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border border-[#5B532C]/20 shadow-lg overflow-hidden lg:sticky lg:top-4">
            {/* Log header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b border-[#5B532C]/10 bg-[#FDE7B3]/10 cursor-pointer hover:bg-[#FDE7B3]/20 transition-colors"
              onClick={() => setShowLog((p) => !p)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#63A361]/10 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-[#63A361]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#5B532C]">
                    Analysis Log
                  </p>
                  <p className="text-xs text-[#5B532C]/50">
                    {log.length > 0
                      ? `${log.length} entries · ${log.filter((e) => e.type === "alert").length} alerts`
                      : "No entries yet"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {log.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearLog();
                    }}
                    className="p-1.5 text-[#5B532C]/30 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {showLog ? (
                  <ChevronUp className="w-4 h-4 text-[#5B532C]/30" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#5B532C]/30" />
                )}
              </div>
            </div>

            {/* Filter tabs */}
            {showLog && log.length > 0 && (
              <div className="flex items-center gap-1 px-4 py-2.5 border-b border-[#5B532C]/10 bg-[#FDFCF8]">
                <Filter className="w-3 h-3 text-[#5B532C]/35 mr-1" />
                {(["all", "alert", "observation"] as LogFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setLogFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      logFilter === f
                        ? "bg-[#63A361] text-white shadow-sm"
                        : "text-[#5B532C]/50 hover:bg-[#FDE7B3]/30 hover:text-[#5B532C]"
                    }`}
                  >
                    {f === "all"
                      ? `All (${log.length})`
                      : f === "alert"
                        ? `Alerts (${log.filter((e) => e.type === "alert").length})`
                        : `Obs (${log.filter((e) => e.type === "observation").length})`}
                  </button>
                ))}
              </div>
            )}

            <AnimatePresence>
              {showLog && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="max-h-125 overflow-y-auto">
                    {filteredLog.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-[#FDE7B3]/40 rounded-2xl flex items-center justify-center border border-[#5B532C]/10">
                          <Eye className="w-6 h-6 text-[#5B532C]/25" />
                        </div>
                        <p className="text-sm text-[#5B532C]/40">
                          {log.length > 0
                            ? "No entries match this filter"
                            : "No analyses yet"}
                        </p>
                        <p className="text-xs text-[#5B532C]/25 mt-1">
                          Alerts appear when issues are detected
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 space-y-2">
                        {filteredLog.map((entry) => (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-3 rounded-xl border-l-4 ${
                              entry.type === "alert"
                                ? "bg-red-50 border-red-400"
                                : entry.type === "error"
                                  ? "bg-orange-50 border-orange-400"
                                  : "bg-[#FDE7B3]/20 border-[#63A361]"
                            }`}
                          >
                            <p
                              className={`text-xs leading-relaxed ${
                                entry.type === "error"
                                  ? "text-orange-700"
                                  : entry.type === "alert"
                                    ? "text-red-700"
                                    : "text-[#5B532C]"
                              }`}
                            >
                              {entry.message}
                            </p>
                            <p className="text-xs text-[#5B532C]/35 mt-1">
                              {entry.timeString}
                            </p>
                            {entry.detections &&
                              entry.detections.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {entry.detections.slice(0, 3).map((d, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 bg-white rounded-full text-xs text-[#5B532C]/60 border border-[#5B532C]/10"
                                    >
                                      {d.class_name}{" "}
                                      {Math.round(d.confidence * 100)}%
                                    </span>
                                  ))}
                                </div>
                              )}
                          </motion.div>
                        ))}
                        <div ref={logEndRef} />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Feature preview (idle state) */}
            {mode === "idle" && log.length === 0 && (
              <div className="p-4 border-t border-[#5B532C]/10 bg-[#FDE7B3]/5">
                <p className="text-xs font-semibold text-[#5B532C]/40 mb-2.5 uppercase tracking-wider">
                  What you'll see
                </p>
                <div className="space-y-1.5">
                  {(
                    [
                      [MapPin, "Auto-detects your location + weather"],
                      [Eye, "YOLO bounding boxes on detected objects"],
                      [ScanSearch, "AI health scores & disease detection"],
                      [TrendingUp, "Real-time health trend visualization"],
                      [Zap, "Comprehensive AI report when you stop"],
                    ] as [React.ElementType, string][]
                  ).map(([Icon, text], i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 p-2.5 bg-[#FDE7B3]/20 rounded-xl border border-[#5B532C]/10"
                    >
                      <div className="w-6 h-6 bg-[#63A361]/10 rounded-lg flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-[#63A361]" />
                      </div>
                      <p className="text-xs text-[#5B532C]/60">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoring;
