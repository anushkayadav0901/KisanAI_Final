import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Leaf,
  Layers,
  Thermometer,
  Map,
  Video,
  Image as ImageIcon,
  Search,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import LiveMonitoring from "../components/monitoring/LiveMonitoringNew";

const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter(Boolean).join(" ");

import {
  analyzeCropImage,
  analyzeSoilImage,
  analyzeThermalImage,
  analyzeFieldImage,
  isValidImage,
} from "../ai/monitoringService";
import {
  analyzeMultipleImages,
  MultiImageAnalysisResult,
} from "../ai/multiImageAnalysisService";
import { MonitoringType } from "../types";
import { InvalidImageResult } from "../components/monitoring/InvalidImageResult";
import { CropMonitoringResult } from "../components/monitoring/CropMonitoringResult";
import { SoilMonitoringResult } from "../components/monitoring/SoilMonitoringResult";
import { ThermalMonitoringResult } from "../components/monitoring/ThermalMonitoringResult";
import { FieldMonitoringResult } from "../components/monitoring/FieldMonitoringResult";
import { MultiImageUpload } from "../components/monitoring/MultiImageUpload";
import { MultiImageAnalysisResult as MultiImageResultComponent } from "../components/monitoring/MultiImageAnalysisResult";
import { enqueue, countQueue } from "../utils/offlineQueue";
import { budgetImage } from "../hooks/useConnection";
import toast from "react-hot-toast";

const MONITORING_TYPES = [
  {
    type: "crop",
    title: "Crop Health",
    icon: Leaf,
    description: "Detect diseases, pests, and nutrient deficiencies",
    color: "#63A361",
    bgColor: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    type: "soil",
    title: "Soil Analysis",
    icon: Layers,
    description: "Analyze moisture, texture, and fertility levels",
    color: "#5B532C",
    bgColor: "bg-amber-50",
    iconColor: "text-amber-800",
  },
  {
    type: "thermal",
    title: "Thermal Scan",
    icon: Thermometer,
    description: "Detect water stress and irrigation leaks",
    color: "#ef4444",
    bgColor: "bg-red-50",
    iconColor: "text-red-600",
  },
  {
    type: "field",
    title: "Field Map",
    icon: Map,
    description: "Assess crop coverage and growth stages",
    color: "#3d6b40",
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-700",
  },
];

type MonitoringMode = "live" | "upload";

const Monitoring: React.FC = () => {
  const [activeMode, setActiveMode] = useState<MonitoringMode>("live");
  const [selectedType, setSelectedType] = useState<MonitoringType | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [multiImageResult, setMultiImageResult] =
    useState<MultiImageAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingSteps, setProcessingSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const handleImagesSelected = (selectedImages: string[]) => {
    setImages(selectedImages);
    setAnalysisResult(null);
    setMultiImageResult(null);
    setErrorMessage(null);
  };

  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearStepTimer = () => {
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  };

  useEffect(() => clearStepTimer, []);

  const handleAnalysis = async (type: MonitoringType) => {
    if (!type || images.length === 0) return;

    const steps = [
      "Optimizing Image Data...",
      "Connecting to Vision AI...",
      "Scanning for Patterns...",
      "Analyzing Agricultural Context...",
      "Crawling Web Resources for Treatment...",
      "Building Comprehensive Report...",
    ];

    setProcessingSteps(steps);
    setCurrentStep(0);

    stepTimerRef.current = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);

    if (!navigator.onLine) {
      clearStepTimer();
      setIsAnalyzing(false);
      try {
        const { image } = await budgetImage(images[0], { dataSaver: true });
        const location = await new Promise<{ lat: number; lon: number } | undefined>(
          (resolve) => {
            if (!navigator.geolocation) return resolve(undefined);
            navigator.geolocation.getCurrentPosition(
              (pos) =>
                resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
              () => resolve(undefined),
              { timeout: 3000, maximumAge: 300000 },
            );
          },
        );

        await enqueue({ image, kind: type, location });
        const waiting = await countQueue();
        setErrorMessage(null);
        toast.success(
          `Saved on your device — ${waiting} capture${waiting === 1 ? "" : "s"} will be analysed when you have signal.`,
          { duration: 4500 },
        );
      } catch {
        toast.error("Could not save this capture on the device.");
      }
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage(null);
      setAnalysisResult(null);
      setMultiImageResult(null);

      if (images.length > 1) {
        const result = await analyzeMultipleImages(images, type);
        setMultiImageResult(result);
        toast.success("Multi-image analysis complete!");
      } else {
        let result;
        switch (type) {
          case "crop":
            result = await analyzeCropImage(images[0]);
            break;
          case "soil":
            result = await analyzeSoilImage(images[0]);
            break;
          case "thermal":
            result = await analyzeThermalImage(images[0]);
            break;
          case "field":
            result = await analyzeFieldImage(images[0]);
            break;
          default:
            throw new Error("Invalid monitoring type");
        }

        setAnalysisResult(result);
        if (!isValidImage(result)) {
          toast.error("Invalid image detected");
        } else {
          toast.success("Analysis complete!");
        }
      }
      clearStepTimer();
    } catch (error: any) {
      clearStepTimer();
      setErrorMessage(error instanceof Error ? error.message : "Analysis failed");
      toast.error("Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTypeSelection = (type: MonitoringType) => {
    setSelectedType(type);
    if (images.length > 0) {
      handleAnalysis(type);
    }
  };

  const resetAnalysis = () => {
    setImages([]);
    setAnalysisResult(null);
    setMultiImageResult(null);
    setSelectedType(null);
    setErrorMessage(null);
    setProcessingSteps([]);
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-white pt-24 pb-12 px-4">

      <div className="max-w-7xl mx-auto">
        {            }
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#63A361]/10 rounded-full text-xs font-semibold text-[#63A361] uppercase tracking-wider mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#63A361]" />
            Monitoring
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#5B532C] mt-2">
            Smart <span className="text-[#63A361]">Monitoring</span> System
          </h1>
          <p className="text-base text-[#5B532C]/60 mt-3 max-w-2xl mx-auto">
            AI-powered agricultural monitoring for better farm management
          </p>
        </motion.div>

        {                      }
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex p-1.5 bg-[#FDE7B3]/30 rounded-2xl border border-[#5B532C]/15">
            <button
              onClick={() => setActiveMode("live")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold transition-all text-sm",
                activeMode === "live"
                  ? "bg-[#63A361] text-white shadow-md shadow-[#63A361]/25"
                  : "text-[#5B532C]/70 hover:bg-[#63A361]/10 hover:text-[#5B532C]",
              )}
            >
              <Video className="w-4 h-4 sm:w-4 sm:h-4" />
              <span>Live Monitor</span>
              <span
                className={cn(
                  "hidden sm:inline px-2 py-0.5 rounded-full text-xs font-medium",
                  activeMode === "live"
                    ? "bg-white/20 text-white"
                    : "bg-[#63A361]/10 text-[#63A361]",
                )}
              >
                AI Camera
              </span>
            </button>
            <button
              onClick={() => setActiveMode("upload")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-semibold transition-all text-sm",
                activeMode === "upload"
                  ? "bg-[#5B532C] text-white shadow-md shadow-[#5B532C]/20"
                  : "text-[#5B532C]/70 hover:bg-[#5B532C]/10 hover:text-[#5B532C]",
              )}
            >
              <ImageIcon className="w-4 h-4 sm:w-4 sm:h-4" />
              <span>Upload Image</span>
              <span
                className={cn(
                  "hidden sm:inline px-2 py-0.5 rounded-full text-xs font-medium",
                  activeMode === "upload"
                    ? "bg-white/20 text-white"
                    : "bg-[#5B532C]/10 text-[#5B532C]",
                )}
              >
                Analysis
              </span>
            </button>
          </div>
        </motion.div>

        {                          }
        <AnimatePresence mode="wait">
          {activeMode === "live" && (
            <motion.div
              key="live"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <LiveMonitoring />
            </motion.div>
          )}
        </AnimatePresence>

        {                    }
        <AnimatePresence mode="wait">
          {activeMode === "upload" &&
            images.length === 0 &&
            !analysisResult &&
            !multiImageResult && (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-8"
              >
                {                 }
                <div className="p-8 bg-white rounded-2xl border border-[#5B532C]/10 shadow-lg">
                  <MultiImageUpload
                    onImagesSelected={handleImagesSelected}
                    maxImages={3}
                    disabled={isAnalyzing}
                  />

                  {                           }
                  <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {MONITORING_TYPES.map((type, index) => (
                      <motion.div
                        key={type.type}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-5 rounded-xl bg-white border border-[#5B532C]/10 text-center hover:border-[#63A361]/30 transition-colors"
                      >
                        <div
                          className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${type.color}15` }}
                        >
                          <type.icon
                            className="w-6 h-6"
                            style={{ color: type.color }}
                          />
                        </div>
                        <h4 className="font-semibold text-[#5B532C] text-sm">
                          {type.title}
                        </h4>
                        <p className="text-xs text-[#5B532C]/50 mt-1">
                          {type.description}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

          {                    }
          {activeMode === "upload" &&
            images.length > 0 &&
            !selectedType &&
            !analysisResult &&
            !multiImageResult &&
            !isAnalyzing && (
              <motion.div
                key="type-selection"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="p-8 bg-white rounded-2xl border border-[#5B532C]/10 shadow-lg">
                  {                    }
                  <div className="flex flex-col md:flex-row gap-6 items-start mb-8 pb-8 border-b border-[#5B532C]/10">
                    <div className="flex gap-2">
                      {images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Uploaded ${idx + 1}`}
                          className="w-24 h-24 object-cover rounded-xl border border-[#5B532C]/10"
                        />
                      ))}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#63A361]/10 text-[#63A361] text-sm font-medium mb-3">
                        <span className="w-2 h-2 rounded-full bg-[#63A361] animate-pulse" />
                        {images.length} Image{images.length > 1 ? "s" : ""}{" "}
                        Ready
                      </div>
                      <h2 className="text-xl font-bold text-[#5B532C] mb-2">
                        Choose Analysis Type
                      </h2>
                      <p className="text-[#5B532C]/60 mb-4">
                        Select the type of monitoring for your image
                        {images.length > 1 ? "s" : ""}
                      </p>
                      <button
                        onClick={resetAnalysis}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#5B532C] border border-[#5B532C]/20 hover:bg-[#FDE7B3]/30 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Change Images
                      </button>
                    </div>
                  </div>

                  {               }
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {MONITORING_TYPES.map((type) => (
                      <button
                        key={type.type}
                        onClick={() => handleTypeSelection(type.type as MonitoringType)}
                        className="p-6 rounded-xl border-2 border-[#5B532C]/10 text-center transition-all hover:border-[#63A361] hover:bg-[#63A361]/5"
                      >
                        <div
                          className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${type.color}15` }}
                        >
                          <type.icon
                            className="w-7 h-7"
                            style={{ color: type.color }}
                          />
                        </div>
                        <h3 className="font-semibold text-[#5B532C] mb-1">
                          {type.title}
                        </h3>
                        <p className="text-xs text-[#5B532C]/50">
                          {type.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

          {                   }
          {activeMode === "upload" && isAnalyzing && selectedType && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-white rounded-[3rem] shadow-2xl p-12 border-4 border-[#63A361]/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-[#FDE7B3]/20">
                  <motion.div
                    className="h-full bg-[#63A361]"
                    initial={{ width: "0%" }}
                    animate={{ width: `${((currentStep + 1) / processingSteps.length) * 100}%` }}
                  />
                </div>

                <div className="text-center mb-12">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-[#63A361] blur-2xl opacity-20 animate-pulse" />
                    <div className="relative w-24 h-24 bg-white rounded-3xl border shadow-xl flex items-center justify-center">
                      <RefreshCw className="w-12 h-12 text-[#63A361] animate-spin" />
                    </div>
                  </div>

                  <h3 className="text-3xl font-bold text-[#5B532C] mb-3">
                    {images.length > 1
                      ? `Deep Scanning ${images.length} Images`
                      : `Analyzing ${MONITORING_TYPES.find((t) => t.type === selectedType)?.title}`}
                  </h3>
                  <p className="text-[#5B532C]/50 font-medium">
                    {images.length > 1
                      ? "Aggregating multi-source vision data..."
                      : "Engaging Vision Intelligence Model..."}
                  </p>
                </div>

                {                      }
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {processingSteps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "flex items-center gap-4 p-5 rounded-3xl border-2 transition-all duration-500",
                        index === currentStep
                          ? "bg-[#63A361]/5 border-[#63A361] shadow-lg shadow-[#63A361]/10"
                          : index < currentStep
                            ? "bg-gray-50 border-gray-100 opacity-60"
                            : "bg-white border-dashed border-gray-200 opacity-30"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center font-bold",
                          index === currentStep
                            ? "bg-[#63A361] text-white"
                            : index < currentStep
                              ? "bg-gray-200 text-gray-500"
                              : "bg-gray-50 text-gray-300"
                        )}
                      >
                        {index < currentStep ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-sm font-bold uppercase tracking-wider",
                          index === currentStep
                            ? "text-[#5B532C]"
                            : "text-[#5B532C]/40"
                        )}
                      >
                        {step}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-12 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FDE7B3]/30 rounded-full text-[10px] font-bold text-[#5B532C]/40 uppercase tracking-[0.2em]">
                    <Search className="w-3 h-3" />
                    Initializing Web Crawl Subroutine
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {                            }
          {activeMode === "upload" && analysisResult && !isAnalyzing && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
            >
              {isValidImage(analysisResult) ? (
                <>
                  {selectedType === "crop" && (
                    <CropMonitoringResult
                      result={analysisResult}
                      image={images[0]}
                      onRetry={resetAnalysis}
                    />
                  )}
                  {selectedType === "soil" && (
                    <SoilMonitoringResult
                      result={analysisResult}
                      image={images[0]}
                      onRetry={resetAnalysis}
                    />
                  )}
                  {selectedType === "thermal" && (
                    <ThermalMonitoringResult
                      result={analysisResult}
                      image={images[0]}
                      onRetry={resetAnalysis}
                    />
                  )}
                  {selectedType === "field" && (
                    <FieldMonitoringResult
                      result={analysisResult}
                      image={images[0]}
                      onRetry={resetAnalysis}
                    />
                  )}
                </>
              ) : (
                <InvalidImageResult
                  onRetry={resetAnalysis}
                  message={analysisResult.analysisSummary}
                />
              )}
            </motion.div>
          )}

          {                           }
          {activeMode === "upload" &&
            multiImageResult &&
            !isAnalyzing &&
            selectedType && (
              <motion.div
                key="multi-results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <MultiImageResultComponent
                  result={multiImageResult}
                  images={images}
                  type={selectedType}
                  onRetry={resetAnalysis}
                />
              </motion.div>
            )}
        </AnimatePresence>

        {                   }
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
          >
            {errorMessage}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Monitoring;
