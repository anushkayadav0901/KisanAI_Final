import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Clock,
  Shield,
  FileSearch,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  BarChart3,
  Zap,
  Calendar,
  RefreshCw,
  Leaf,
  Droplets,
  Sun,
  Wind,
} from "lucide-react";
import { MultiImageAnalysisResult as AnalysisResult } from "../../ai/multiImageAnalysisService";
import { MonitoringType } from "../../types";

interface Props {
  result: AnalysisResult;
  images: string[];
  type: MonitoringType;
  onRetry: () => void;
}

const severityConfig = {
  none: {
    color: "#63A361",
    bg: "bg-[#63A361]/10",
    border: "border-[#63A361]/20",
    label: "None",
    icon: CheckCircle2,
  },
  mild: {
    color: "#FFC50F",
    bg: "bg-[#FFC50F]/20",
    border: "border-[#FFC50F]/30",
    label: "Mild",
    icon: AlertTriangle,
  },
  moderate: {
    color: "#f97316",
    bg: "bg-orange-100",
    border: "border-orange-200",
    label: "Moderate",
    icon: AlertTriangle,
  },
  severe: {
    color: "#ef4444",
    bg: "bg-red-100",
    border: "border-red-200",
    label: "Severe",
    icon: AlertTriangle,
  },
};

const consensusConfig = {
  high: {
    color: "#63A361",
    label: "High Confidence",
    desc: "All images show consistent results",
  },
  medium: {
    color: "#FFC50F",
    label: "Medium Confidence",
    desc: "Most images show similar patterns",
  },
  low: {
    color: "#f97316",
    label: "Lower Confidence",
    desc: "Results vary across images",
  },
};

const spreadConfig = {
  localized: {
    color: "#63A361",
    label: "Localized",
    desc: "Issue is contained to specific areas",
  },
  scattered: {
    color: "#FFC50F",
    label: "Scattered",
    desc: "Issue appears in multiple spots",
  },
  widespread: {
    color: "#ef4444",
    label: "Widespread",
    desc: "Issue covers large areas",
  },
};

const trendConfig = {
  improving: { color: "#63A361", icon: TrendingUp, label: "Improving" },
  stable: { color: "#5B532C", icon: Minus, label: "Stable" },
  worsening: { color: "#ef4444", icon: TrendingDown, label: "Worsening" },
  inconsistent: { color: "#FFC50F", icon: BarChart3, label: "Inconsistent" },
};

export const MultiImageAnalysisResult: React.FC<Props> = ({
  result,
  images,
  type,
  onRetry,
}) => {
  const [expandedFinding, setExpandedFinding] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<"overview" | "findings" | "plan">(
    "overview",
  );

  const severity = severityConfig[result.aggregatedMetrics.severityLevel];
  const consensus = consensusConfig[result.consensusLevel];
  const spread = spreadConfig[result.aggregatedMetrics.spreadPattern];
  const trend = result.progressionAnalysis
    ? trendConfig[result.progressionAnalysis.trend]
    : null;
  const SeverityIcon = severity.icon;

  const getTypeIcon = () => {
    switch (type) {
      case "crop":
        return Leaf;
      case "soil":
        return Droplets;
      case "thermal":
        return Sun;
      case "field":
        return Wind;
      default:
        return Leaf;
    }
  };

  const TypeIcon = getTypeIcon();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Image Gallery */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6 bg-white rounded-2xl border border-[#5B532C]/10 shadow-lg"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#FDE7B3]/50 rounded-xl flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-[#63A361]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#5B532C]">
              Analyzed Images
            </h3>
            <p className="text-sm text-[#5B532C]/50">
              Multiple angles provide comprehensive insights
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-xl overflow-hidden border-2 border-[#63A361]/20"
            >
              <img
                src={image}
                alt={`Analysis ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 px-2 py-1 bg-[#63A361] text-white text-xs font-bold rounded-lg">
                #{index + 1}
              </div>
              {result.findings[index] && (
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-white/90 text-[#5B532C] text-xs font-medium rounded-lg">
                  {result.findings[index].confidence}% match
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1.5 bg-[#FDE7B3]/20 rounded-2xl">
        {[
          { id: "overview", label: "Overview", icon: Target },
          { id: "findings", label: "Image Findings", icon: ImageIcon },
          { id: "plan", label: "Action Plan", icon: Zap },
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
      </div>

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
            {/* Summary Card */}
            <div className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#63A361]/10 rounded-xl flex items-center justify-center shrink-0">
                  <FileSearch className="w-6 h-6 text-[#63A361]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#5B532C] mb-2">
                    Analysis Summary
                  </h3>
                  <p className="text-[#5B532C]/70 leading-relaxed">
                    {result.analysisSummary}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Health Score */}
              <MetricCard
                icon={Shield}
                label="Health Score"
                value={`${result.aggregatedMetrics.healthScore}/100`}
                color={
                  result.aggregatedMetrics.healthScore >= 70
                    ? "#63A361"
                    : result.aggregatedMetrics.healthScore >= 40
                      ? "#FFC50F"
                      : "#ef4444"
                }
                subtext={
                  result.aggregatedMetrics.healthScore >= 70
                    ? "Good"
                    : result.aggregatedMetrics.healthScore >= 40
                      ? "Fair"
                      : "Poor"
                }
              />

              {/* Confidence */}
              <MetricCard
                icon={Target}
                label="AI Confidence"
                value={`${result.overallConfidence}%`}
                color={consensus.color}
                subtext={consensus.label}
              />

              {/* Severity */}
              <MetricCard
                icon={SeverityIcon}
                label="Severity"
                value={severity.label}
                color={severity.color}
                subtext={`${result.aggregatedMetrics.affectedAreaPercentage}% affected`}
              />

              {/* Spread Pattern */}
              <MetricCard
                icon={MapPin}
                label="Spread Pattern"
                value={spread.label}
                color={spread.color}
                subtext={spread.desc}
              />
            </div>

            {/* Primary & Secondary Issues */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-5 bg-white rounded-2xl border border-[#5B532C]/10 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#5B532C]">
                    Primary Issue
                  </h3>
                </div>
                <p className="text-[#5B532C] font-medium">
                  {result.primaryIssue}
                </p>
              </div>

              {result.secondaryIssues.length > 0 && (
                <div className="p-5 bg-white rounded-2xl border border-[#5B532C]/10 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#FFC50F]/20 rounded-xl flex items-center justify-center">
                      <TypeIcon className="w-5 h-5 text-[#FFC50F]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#5B532C]">
                      Secondary Issues
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {result.secondaryIssues.map((issue, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-sm text-[#5B532C]/70"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#FFC50F]" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Progression Analysis */}
            {trend && (
              <div
                className={`p-5 rounded-2xl border ${trend.color === "#63A361" ? "bg-[#63A361]/5 border-[#63A361]/20" : trend.color === "#ef4444" ? "bg-red-50 border-red-200" : "bg-[#FFC50F]/10 border-[#FFC50F]/30"}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center`}
                    style={{ backgroundColor: `${trend.color}20` }}
                  >
                    <trend.icon
                      className="w-5 h-5"
                      style={{ color: trend.color }}
                    />
                  </div>
                  <div>
                    <h3
                      className="text-lg font-semibold"
                      style={{ color: trend.color }}
                    >
                      {trend.label}
                    </h3>
                    <p className="text-sm text-[#5B532C]/50">
                      Trend across images
                    </p>
                  </div>
                </div>
                {result.progressionAnalysis && (
                  <p className="text-[#5B532C]/70">
                    {result.progressionAnalysis.progressionNotes}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "findings" && (
          <motion.div
            key="findings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {result.findings.map((finding, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl border border-[#5B532C]/10 shadow-lg overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedFinding(expandedFinding === index ? null : index)
                  }
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-[#FDE7B3]/5 transition-colors"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                    <img
                      src={images[index]}
                      alt={`Finding ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-[#63A361] text-white text-xs font-bold rounded">
                        Image #{finding.imageIndex + 1}
                      </span>
                      <span className="text-sm text-[#5B532C]/50">
                        Confidence: {finding.confidence}%
                      </span>
                    </div>
                    <p className="text-sm text-[#5B532C]/70 line-clamp-2">
                      {finding.keyObservations[0]}
                    </p>
                  </div>
                  {expandedFinding === index ? (
                    <ChevronUp className="w-5 h-5 text-[#5B532C]/40" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#5B532C]/40" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedFinding === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-0 border-t border-[#5B532C]/10">
                        <div className="pt-4 space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold text-[#5B532C] mb-2">
                              Key Observations
                            </h4>
                            <ul className="space-y-2">
                              {finding.keyObservations.map((obs, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-[#5B532C]/70"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-[#63A361] mt-0.5 shrink-0" />
                                  {obs}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {finding.discrepancies &&
                            finding.discrepancies.length > 0 && (
                              <div className="p-3 bg-[#FFC50F]/10 rounded-xl">
                                <h4 className="text-sm font-semibold text-[#5B532C] mb-2">
                                  Variations from Other Images
                                </h4>
                                <ul className="space-y-1">
                                  {finding.discrepancies.map((disc, i) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-2 text-sm text-[#5B532C]/60"
                                    >
                                      <AlertTriangle className="w-4 h-4 text-[#FFC50F] mt-0.5 shrink-0" />
                                      {disc}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === "plan" && (
          <motion.div
            key="plan"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Immediate Actions */}
            <ActionSection
              title="Immediate Actions"
              icon={Zap}
              iconColor="#ef4444"
              bgColor="bg-red-50"
              borderColor="border-red-200"
              actions={result.immediateActions}
              timeFrame="Do within 24-48 hours"
            />

            {/* Short Term Plan */}
            <ActionSection
              title="Short-Term Plan"
              icon={Clock}
              iconColor="#FFC50F"
              bgColor="bg-[#FFC50F]/10"
              borderColor="border-[#FFC50F]/30"
              actions={result.shortTermPlan}
              timeFrame="Next 1-2 weeks"
            />

            {/* Long Term Strategy */}
            <ActionSection
              title="Long-Term Strategy"
              icon={Calendar}
              iconColor="#63A361"
              bgColor="bg-[#63A361]/10"
              borderColor="border-[#63A361]/20"
              actions={result.longTermStrategy}
              timeFrame="Ongoing maintenance"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRetry}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#63A361] text-white rounded-xl font-semibold hover:bg-[#4a8a4d] transition-colors shadow-md"
        >
          <RefreshCw className="w-4 h-4" />
          Analyze New Images
        </motion.button>
      </div>
    </motion.div>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  subtext: string;
}> = ({ icon: Icon, label, value, color, subtext }) => (
  <div className="p-5 bg-white rounded-2xl border border-[#5B532C]/10 shadow-sm">
    <div className="flex items-center gap-2 mb-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <span className="text-xs text-[#5B532C]/50 uppercase tracking-wider">
        {label}
      </span>
    </div>
    <p className="text-2xl font-bold" style={{ color }}>
      {value}
    </p>
    <p className="text-xs text-[#5B532C]/50 mt-1">{subtext}</p>
  </div>
);

// Action Section Component
const ActionSection: React.FC<{
  title: string;
  icon: React.ElementType;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  actions: string[];
  timeFrame: string;
}> = ({
  title,
  icon: Icon,
  iconColor,
  bgColor,
  borderColor,
  actions,
  timeFrame,
}) => (
  <div className={`p-6 rounded-2xl border ${bgColor} ${borderColor}`}>
    <div className="flex items-center gap-3 mb-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${iconColor}20` }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-[#5B532C]">{title}</h3>
        <p className="text-xs text-[#5B532C]/50">{timeFrame}</p>
      </div>
    </div>
    <div className="space-y-3">
      {actions.map((action, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[#5B532C]/10"
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: iconColor }}
          >
            <span className="text-white text-xs font-bold">{i + 1}</span>
          </div>
          <p className="text-sm text-[#5B532C]/70">{action}</p>
        </motion.div>
      ))}
    </div>
  </div>
);

export default MultiImageAnalysisResult;
