import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud,
  Thermometer,
  Droplets,
  Wind,
  AlertTriangle,
  Shield,
  Sprout,
  FileText,
  Building2,
  Phone,
  Globe,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertOctagon,
  Leaf,
  Bug,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Play,
  BookOpen,
  Wallet,
  ArrowRight,
  RefreshCw,
  FileSearch,
} from "lucide-react";
import {
  ComprehensiveSessionReport,
  PreventionMeasure,
  DiseaseStage,
} from "../../ai/sessionReportService";

interface Props {
  report: ComprehensiveSessionReport;
  onNewSession: () => void;
}

// Priority badge colors
const priorityColors = {
  critical: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
    icon: "text-red-500",
  },
  high: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
    icon: "text-orange-500",
  },
  medium: {
    bg: "bg-[#FFC50F]/20",
    text: "text-[#5B532C]",
    border: "border-[#FFC50F]/30",
    icon: "text-[#FFC50F]",
  },
  low: {
    bg: "bg-[#63A361]/10",
    text: "text-[#63A361]",
    border: "border-[#63A361]/20",
    icon: "text-[#63A361]",
  },
};

// Type badge colors
const typeColors = {
  natural: { bg: "bg-green-100", text: "text-green-700", icon: Leaf },
  pesticide: { bg: "bg-red-100", text: "text-red-700", icon: AlertOctagon },
  biological: { bg: "bg-blue-100", text: "text-blue-700", icon: Bug },
  cultural: { bg: "bg-amber-100", text: "text-amber-700", icon: Sprout },
  mechanical: { bg: "bg-gray-100", text: "text-gray-700", icon: Shield },
};

// Progression risk colors
const riskColors = {
  low: {
    bg: "bg-[#63A361]/10",
    text: "text-[#63A361]",
    border: "border-[#63A361]/20",
  },
  medium: {
    bg: "bg-[#FFC50F]/20",
    text: "text-[#5B532C]",
    border: "border-[#FFC50F]/30",
  },
  high: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  severe: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
};

export const ComprehensiveReport: React.FC<Props> = ({
  report,
  onNewSession,
}) => {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "treatment" | "resources"
  >("overview");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-[#5B532C]/20 shadow-lg"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#63A361]/10 rounded-2xl flex items-center justify-center">
            <FileSearch className="w-7 h-7 text-[#63A361]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#5B532C]">
              AI Analysis Report
            </h2>
            <p className="text-sm text-[#5B532C]/60">
              Powered by Gemini 2.5 Pro
            </p>
          </div>
        </div>
        <motion.button
          onClick={onNewSession}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#63A361] text-white rounded-xl font-semibold hover:bg-[#4a8a4d] transition-colors shadow-md shadow-[#63A361]/20"
        >
          <RefreshCw className="w-4 h-4" />
          New Session
        </motion.button>
      </motion.div>

      {/* Summary Card */}
      <motion.div
        variants={itemVariants}
        className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#63A361]/10 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-[#63A361]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#5B532C] mb-2">
              Session Summary
            </h3>
            <p className="text-[#5B532C]/70 leading-relaxed">
              {report.summary}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        variants={itemVariants}
        className="flex gap-2 p-1.5 bg-[#FDE7B3]/20 rounded-2xl"
      >
        {[
          { id: "overview", label: "Overview", icon: TrendingUp },
          { id: "treatment", label: "Treatment Plan", icon: Shield },
          { id: "resources", label: "Resources", icon: BookOpen },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-[#63A361] text-white shadow-md"
                : "text-[#5B532C]/60 hover:bg-[#63A361]/10 hover:text-[#5B532C]"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Weather Report */}
            <WeatherSection weather={report.weatherReport} />

            {/* Disease Analysis */}
            {report.diseaseAnalysis.isDetected && (
              <DiseaseAnalysisSection
                analysis={report.diseaseAnalysis}
                expandedStage={expandedStage}
                setExpandedStage={setExpandedStage}
              />
            )}

            {/* Key Findings */}
            <KeyFindingsSection findings={report.keyFindings} />
          </motion.div>
        )}

        {activeTab === "treatment" && (
          <motion.div
            key="treatment"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Immediate Actions */}
            <ImmediateActionsSection actions={report.immediateActions} />

            {/* Prevention Measures */}
            <PreventionMeasuresSection measures={report.preventionMeasures} />

            {/* Follow-up */}
            <FollowUpSection recommendations={report.followUpRecommendations} />
          </motion.div>
        )}

        {activeTab === "resources" && (
          <motion.div
            key="resources"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Video Recommendations */}
            <VideoSection videos={report.videoRecommendations} />

            {/* Articles */}
            <ArticlesSection articles={report.articleLinks} />

            {/* Government Resources */}
            <GovernmentSection resources={report.governmentResources} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Weather Section Component
const WeatherSection: React.FC<{
  weather: ComprehensiveSessionReport["weatherReport"];
}> = ({ weather }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-6 bg-white rounded-2xl border border-[#5B532C]/20 shadow-lg"
  >
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
        <Cloud className="w-5 h-5 text-blue-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-[#5B532C]">
          Weather Conditions
        </h3>
        <p className="text-sm text-[#5B532C]/50">
          Current environmental factors
        </p>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4 mb-5">
      <div className="text-center p-4 bg-[#FDE7B3]/20 rounded-xl">
        <Thermometer className="w-5 h-5 text-[#FFC50F] mx-auto mb-2" />
        <p className="text-2xl font-bold text-[#5B532C]">
          {weather.temperature}°C
        </p>
        <p className="text-xs text-[#5B532C]/50">Temperature</p>
      </div>
      <div className="text-center p-4 bg-blue-50 rounded-xl">
        <Droplets className="w-5 h-5 text-blue-400 mx-auto mb-2" />
        <p className="text-2xl font-bold text-[#5B532C]">{weather.humidity}%</p>
        <p className="text-xs text-[#5B532C]/50">Humidity</p>
      </div>
      <div className="text-center p-4 bg-[#63A361]/10 rounded-xl">
        <Wind className="w-5 h-5 text-[#63A361] mx-auto mb-2" />
        <p className="text-2xl font-bold text-[#5B532C]">
          {weather.currentConditions}
        </p>
        <p className="text-xs text-[#5B532C]/50">Conditions</p>
      </div>
    </div>

    <div className="p-4 bg-[#FDE7B3]/10 rounded-xl border border-[#5B532C]/10">
      <p className="text-sm text-[#5B532C]/70 mb-3">
        <span className="font-semibold">Impact on Disease:</span>{" "}
        {weather.impactOnDisease}
      </p>
      <div className="flex flex-wrap gap-2">
        {weather.favorableConditions.map((c, i) => (
          <span
            key={i}
            className="px-3 py-1 bg-[#63A361]/10 text-[#63A361] rounded-full text-xs font-medium"
          >
            ✓ {c}
          </span>
        ))}
        {weather.unfavorableConditions.map((c, i) => (
          <span
            key={i}
            className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium"
          >
            ⚠ {c}
          </span>
        ))}
      </div>
    </div>
  </motion.div>
);

// Disease Analysis Section
const DiseaseAnalysisSection: React.FC<{
  analysis: ComprehensiveSessionReport["diseaseAnalysis"];
  expandedStage: string | null;
  setExpandedStage: (id: string | null) => void;
}> = ({ analysis, expandedStage, setExpandedStage }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-6 bg-white rounded-2xl border border-red-200 shadow-lg"
  >
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-red-500" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-[#5B532C]">
          Disease Analysis
        </h3>
        <p className="text-sm text-[#5B532C]/50">
          {analysis.diseaseName} • Confidence: {analysis.confidence}%
        </p>
      </div>
      <div
        className={`px-3 py-1.5 rounded-lg border ${riskColors[analysis.progressionRisk].bg} ${riskColors[analysis.progressionRisk].border} ${riskColors[analysis.progressionRisk].text}`}
      >
        <span className="text-xs font-bold uppercase">
          {analysis.progressionRisk} Risk
        </span>
      </div>
    </div>

    {/* Current Stage */}
    <div className="p-4 bg-red-50 rounded-xl border border-red-100 mb-5">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-red-500" />
        <span className="font-semibold text-red-700">
          Current Stage: {analysis.currentStage}
        </span>
      </div>
      <p className="text-sm text-red-600">{analysis.stageImpact}</p>
      <p className="text-sm text-red-500 mt-2">{analysis.spreadPrediction}</p>
    </div>

    {/* Disease Stages Timeline */}
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-[#5B532C] uppercase tracking-wider">
        Disease Progression
      </h4>
      {analysis.allStages.map((stage, index) => (
        <DiseaseStageCard
          key={stage.stage}
          stage={stage}
          index={index}
          total={analysis.allStages.length}
          isExpanded={expandedStage === stage.stage}
          onToggle={() =>
            setExpandedStage(expandedStage === stage.stage ? null : stage.stage)
          }
        />
      ))}
    </div>
  </motion.div>
);

// Disease Stage Card
const DiseaseStageCard: React.FC<{
  stage: DiseaseStage;
  index: number;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ stage, index, isExpanded, onToggle }) => (
  <div
    className={`rounded-xl border transition-all ${
      stage.isCurrent
        ? "bg-red-50 border-red-200"
        : "bg-[#FDFCF8] border-[#5B532C]/10"
    }`}
  >
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 p-4 text-left"
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          stage.isCurrent
            ? "bg-red-500 text-white"
            : "bg-[#5B532C]/10 text-[#5B532C]"
        }`}
      >
        {index + 1}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`font-semibold ${stage.isCurrent ? "text-red-700" : "text-[#5B532C]"}`}
          >
            {stage.stage}
          </span>
          {stage.isCurrent && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              Current
            </span>
          )}
        </div>
        <p className="text-xs text-[#5B532C]/50">{stage.duration}</p>
      </div>
      {isExpanded ? (
        <ChevronUp className="w-4 h-4 text-[#5B532C]/40" />
      ) : (
        <ChevronDown className="w-4 h-4 text-[#5B532C]/40" />
      )}
    </button>

    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-4 pt-0">
            <p className="text-sm text-[#5B532C]/70 mb-3">
              {stage.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {stage.symptoms.map((symptom, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-white rounded-lg text-xs text-[#5B532C]/60 border border-[#5B532C]/10"
                >
                  {symptom}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// Key Findings Section
const KeyFindingsSection: React.FC<{ findings: string[] }> = ({ findings }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
  >
    <h3 className="text-lg font-semibold text-[#5B532C] mb-4">Key Findings</h3>
    <div className="space-y-3">
      {findings.map((finding, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-6 h-6 bg-[#63A361]/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#63A361]" />
          </div>
          <p className="text-sm text-[#5B532C]/70">{finding}</p>
        </div>
      ))}
    </div>
  </motion.div>
);

// Immediate Actions Section
const ImmediateActionsSection: React.FC<{ actions: string[] }> = ({
  actions,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-6 bg-red-50 rounded-2xl border border-red-200"
  >
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
        <AlertOctagon className="w-5 h-5 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-red-700">
        Immediate Actions Required
      </h3>
    </div>
    <div className="space-y-3">
      {actions.map((action, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-3 bg-white rounded-xl border border-red-100"
        >
          <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
            {i + 1}
          </div>
          <p className="text-sm text-[#5B532C]">{action}</p>
        </div>
      ))}
    </div>
  </motion.div>
);

// Prevention Measures Section
const PreventionMeasuresSection: React.FC<{
  measures: PreventionMeasure[];
}> = ({ measures }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-4"
  >
    <h3 className="text-lg font-semibold text-[#5B532C]">
      Prevention & Treatment Plan
    </h3>
    {measures.map((measure, i) => {
      const TypeIcon = typeColors[measure.type].icon;
      const priorityStyle = priorityColors[measure.priority];
      const typeStyle = typeColors[measure.type];

      return (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="p-5 bg-white rounded-2xl border border-[#5B532C]/20 shadow-sm transition-shadow"
        >
          <div className="flex flex-wrap items-start gap-3 mb-4">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border} border`}
            >
              {measure.priority}
            </span>
            <span
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${typeStyle.bg} ${typeStyle.text}`}
            >
              <TypeIcon className="w-3.5 h-3.5" />
              {measure.type.charAt(0).toUpperCase() + measure.type.slice(1)}
            </span>
          </div>

          <p className="text-[#5B532C] font-medium mb-4">{measure.measure}</p>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#5B532C]/10">
            <div className="text-center">
              <p className="text-xs text-[#5B532C]/50 mb-1">Cost</p>
              <p className="text-sm font-semibold text-[#5B532C]">
                {measure.estimatedCost}
              </p>
            </div>
            <div className="text-center border-x border-[#5B532C]/10">
              <p className="text-xs text-[#5B532C]/50 mb-1">Time</p>
              <p className="text-sm font-semibold text-[#5B532C]">
                {measure.timeToImplement}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#5B532C]/50 mb-1">Effectiveness</p>
              <div className="flex items-center justify-center gap-1">
                <div className="w-16 h-2 bg-[#5B532C]/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#63A361] rounded-full"
                    style={{ width: `${measure.effectiveness}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-[#63A361]">
                  {measure.effectiveness}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      );
    })}
  </motion.div>
);

// Follow-up Section
const FollowUpSection: React.FC<{ recommendations: string[] }> = ({
  recommendations,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-6 bg-[#63A361]/5 rounded-2xl border border-[#63A361]/20"
  >
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 bg-[#63A361]/10 rounded-xl flex items-center justify-center">
        <Clock className="w-5 h-5 text-[#63A361]" />
      </div>
      <h3 className="text-lg font-semibold text-[#5B532C]">
        Follow-up Recommendations
      </h3>
    </div>
    <div className="space-y-3">
      {recommendations.map((rec, i) => (
        <div key={i} className="flex items-start gap-3">
          <ArrowRight className="w-4 h-4 text-[#63A361] mt-0.5 shrink-0" />
          <p className="text-sm text-[#5B532C]/70">{rec}</p>
        </div>
      ))}
    </div>
  </motion.div>
);

// Video Section
const VideoSection: React.FC<{
  videos: ComprehensiveSessionReport["videoRecommendations"];
}> = ({ videos }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-4"
  >
    <h3 className="text-lg font-semibold text-[#5B532C]">Recommended Videos</h3>
    {videos.map((video, i) => (
      <motion.a
        key={i}
        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.searchQuery)}`}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.1 }}
        className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-[#5B532C]/20 hover:border-[#63A361]/40 transition-all group"
      >
        <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-red-500 transition-colors">
          <Play className="w-6 h-6 text-red-500 group-hover:text-white transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[#5B532C] truncate">
            {video.title}
          </h4>
          <p className="text-sm text-[#5B532C]/50">{video.channel}</p>
          <p className="text-xs text-[#5B532C]/40 mt-1">{video.description}</p>
        </div>
        <ExternalLink className="w-4 h-4 text-[#5B532C]/30 group-hover:text-[#63A361]" />
      </motion.a>
    ))}
  </motion.div>
);

// Articles Section
const ArticlesSection: React.FC<{
  articles: ComprehensiveSessionReport["articleLinks"];
}> = ({ articles }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-6 bg-white rounded-2xl border border-[#5B532C]/20 shadow-lg"
  >
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 bg-[#FDE7B3]/50 rounded-xl flex items-center justify-center">
        <BookOpen className="w-5 h-5 text-[#5B532C]" />
      </div>
      <h3 className="text-lg font-semibold text-[#5B532C]">Related Articles</h3>
    </div>
    <div className="space-y-4">
      {articles.map((article, i) => {
        // A model-invented URL looks authoritative and goes nowhere, so an
        // unverified article falls back to a search scoped to the official
        // agriculture portals instead of a fabricated link.
        const searchUrl = article.url
          ? null
          : `https://www.google.com/search?q=${encodeURIComponent(
              `${article.searchHint || article.title} site:icar.org.in OR site:farmer.gov.in OR site:kvk.icar.gov.in`,
            )}`;
        const href = article.url ?? searchUrl;
        const Wrapper = href ? "a" : "div";
        const linkProps = href
          ? {
              href,
              target: "_blank",
              rel: "noopener noreferrer",
            }
          : {};
        return (
          <Wrapper
            key={i}
            {...linkProps}
            className={`block p-4 bg-[#FDE7B3]/10 rounded-xl ${href ? "hover:bg-[#FDE7B3]/25 transition-all cursor-pointer group" : ""}`}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#63A361]/10 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-[#63A361]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-[#5B532C]">
                    {article.title}
                  </h4>
                  {href && (
                    <ExternalLink className="w-3.5 h-3.5 text-[#5B532C]/30 group-hover:text-[#63A361] shrink-0" />
                  )}
                </div>
                <p className="text-xs text-[#63A361] font-medium mt-1">
                  {article.source}
                </p>
                <p className="text-sm text-[#5B532C]/60 mt-1">
                  {article.description}
                </p>
                {article.url ? (
                  <p className="text-xs text-blue-500 mt-1.5 truncate">
                    {article.url}
                  </p>
                ) : (
                  <p className="text-xs text-[#5B532C]/40 mt-1.5">
                    Search official portals →
                  </p>
                )}
              </div>
            </div>
          </Wrapper>
        );
      })}
    </div>
  </motion.div>
);

// Government Resources Section
const GovernmentSection: React.FC<{
  resources: ComprehensiveSessionReport["governmentResources"];
}> = ({ resources }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-6 bg-[#63A361]/5 rounded-2xl border border-[#63A361]/20"
  >
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 bg-[#63A361]/10 rounded-xl flex items-center justify-center">
        <Building2 className="w-5 h-5 text-[#63A361]" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-[#5B532C]">
          Government Support
        </h3>
        <p className="text-sm text-[#5B532C]/50">
          Schemes and assistance available
        </p>
      </div>
    </div>

    <div className="space-y-4">
      {resources.map((resource, i) => (
        <div
          key={i}
          className="p-4 bg-white rounded-xl border border-[#63A361]/20"
        >
          <h4 className="font-semibold text-[#5B532C] mb-2">
            {resource.schemeName}
          </h4>
          <p className="text-sm text-[#5B532C]/70 mb-3">
            {resource.description}
          </p>

          <div className="flex flex-wrap gap-3 text-xs">
            <span className="flex items-center gap-1 px-2 py-1 bg-[#FDE7B3]/30 rounded-lg text-[#5B532C]">
              <Shield className="w-3 h-3" />
              {resource.eligibility}
            </span>
            {resource.contactNumber && (
              <a
                href={`tel:${resource.contactNumber}`}
                className="flex items-center gap-1 px-2 py-1 bg-[#63A361]/10 rounded-lg text-[#63A361] hover:bg-[#63A361]/20"
              >
                <Phone className="w-3 h-3" />
                {resource.contactNumber}
              </a>
            )}
            {resource.websiteUrl && (
              <a
                href={resource.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100"
              >
                <Globe className="w-3 h-3" />
                Website
              </a>
            )}
          </div>

          {resource.compensationDetails && (
            <div className="mt-3 pt-3 border-t border-[#5B532C]/10">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#FFC50F]" />
                <span className="text-sm text-[#5B532C]/70">
                  {resource.compensationDetails}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  </motion.div>
);

export default ComprehensiveReport;
