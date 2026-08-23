import React from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Bug,
  Droplets,
  Activity,
  TrendingUp,
  Shield,
  CheckCircle2,
  Target,
  RefreshCw,
  Search,
  Youtube,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { CropMonitoringResult as CropResultType } from "../../types";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Props {
  result: CropResultType;
  image: string | null;
  onRetry: () => void;
}

export const CropMonitoringResult: React.FC<Props> = ({
  result,
  image,
  onRetry,
}) => {
  const getSeverityColor = (severity: string) => {
    const colors = {
      none: {
        bg: "bg-[#63A361]/10",
        text: "text-[#63A361]",
        border: "border-[#63A361]/20",
        icon: "text-[#63A361]",
        ring: "ring-[#63A361]/20",
      },
      mild: {
        bg: "bg-[#FFC50F]/10",
        text: "text-[#FFC50F]",
        border: "border-[#FFC50F]/20",
        icon: "text-[#FFC50F]",
        ring: "ring-[#FFC50F]/20",
      },
      moderate: {
        bg: "bg-[#FFC50F]/15",
        text: "text-orange-600",
        border: "border-orange-200",
        icon: "text-orange-500",
        ring: "ring-orange-200",
      },
      severe: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: "text-red-600",
        ring: "ring-red-200",
      },
      low: {
        bg: "bg-[#63A361]/10",
        text: "text-[#63A361]",
        border: "border-[#63A361]/20",
        icon: "text-[#63A361]",
        ring: "ring-[#63A361]/20",
      },
      medium: {
        bg: "bg-[#FFC50F]/10",
        text: "text-[#FFC50F]",
        border: "border-[#FFC50F]/20",
        icon: "text-[#FFC50F]",
        ring: "ring-[#FFC50F]/20",
      },
      high: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: "text-red-600",
        ring: "ring-red-200",
      },
    };
    return colors[severity as keyof typeof colors] || colors.none;
  };

  const healthData = [
    {
      name: "Health Score",
      value: result.realTimeMetrics.healthScore,
      fill: "#63A361",
    },
    {
      name: "Stress Level",
      value: result.realTimeMetrics.stressLevel,
      fill: "#FFC50F",
    },
    {
      name: "Yield Impact",
      value: result.realTimeMetrics.yieldImpact,
      fill: "#5B532C",
    },
  ];

  const affectedAreaData = [
    { name: "Healthy", value: 100 - result.affectedArea, fill: "#63A361" },
    { name: "Affected", value: result.affectedArea, fill: "#FFC50F" },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Premium Header Status */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden p-8 bg-gradient-to-br from-[#63A361] to-[#4a8a4d] rounded-2xl text-white shadow-lg shadow-[#5B532C]/10"
      >
        {/* Abstract Deco Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-yellow-400/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Analysis Badge & Image */}
          <div className="relative">
            <div className="w-40 h-40 rounded-[2rem] overflow-hidden border-4 border-white/20 shadow-2xl bg-white/10 backdrop-blur-md">
              <img
                src={image || ""}
                alt="Analyzed"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg transform rotate-12">
              <CheckCircle2 className="w-6 h-6 text-[#63A361]" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
              <Activity className="w-3.5 h-3.5" />
              Intelligence Harvest
            </span>
            <h2 className="text-4xl font-bold mb-3">
              {result.cropType}{" "}
              <span className="text-[#FDE7B3] italic">Report</span>
            </h2>
            <p className="text-white/90 text-lg max-w-xl font-medium leading-relaxed">
              {result.analysisSummary}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 px-10 py-8 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-inner">
            <div className="text-6xl font-bold text-[#FFC50F]">
              {result.realTimeMetrics.healthScore}
              <span className="text-xl ml-1 text-white/50">%</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
              Vigor Score
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Core Stats */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              className={`p-8 bg-white rounded-2xl border-2 ${getSeverityColor(result.diseaseSeverity).border} shadow-lg shadow-[#5B532C]/10 relative overflow-hidden group transition-all`}
            >
              <div className={`absolute top-0 right-0 p-5 ${getSeverityColor(result.diseaseSeverity).bg} rounded-bl-[2.5rem] opacity-0 group-hover:opacity-100 transition-all duration-500`}>
                <AlertTriangle className={`w-8 h-8 ${getSeverityColor(result.diseaseSeverity).icon}`} />
              </div>
              <h3 className="text-xs font-bold text-[#5B532C]/30 uppercase tracking-[0.2em] mb-6">Primary Diagnosis</h3>
              <div className={`text-3xl font-bold ${getSeverityColor(result.diseaseSeverity).text} mb-3`}>
                {result.diseaseDetected}
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${getSeverityColor(result.diseaseSeverity).bg} ${getSeverityColor(result.diseaseSeverity).text}`}>
                  {result.diseaseSeverity}
                </span>
                <span className="text-xs font-bold text-[#5B532C]/40 uppercase tracking-widest">Active Phase</span>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              className={`p-8 bg-white rounded-2xl border-2 ${getSeverityColor(result.pestSeverity).border} shadow-lg shadow-[#5B532C]/10 relative overflow-hidden group transition-all`}
            >
              <div className={`absolute top-0 right-0 p-5 ${getSeverityColor(result.pestSeverity).bg} rounded-bl-[2.5rem] opacity-0 group-hover:opacity-100 transition-all duration-500`}>
                <Bug className={`w-8 h-8 ${getSeverityColor(result.pestSeverity).icon}`} />
              </div>
              <h3 className="text-xs font-bold text-[#5B532C]/30 uppercase tracking-[0.2em] mb-6">Infestation Assessment</h3>
              <div className={`text-3xl font-bold ${getSeverityColor(result.pestSeverity).text} mb-3`}>
                {result.pestInfestation}
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${getSeverityColor(result.pestSeverity).bg} ${getSeverityColor(result.pestSeverity).text}`}>
                  {result.pestSeverity} LEVEL
                </span>
              </div>
            </motion.div>
          </div>

          {/* Charts Card */}
          <div className="p-10 bg-white rounded-[3rem] border border-[#5B532C]/5 shadow-lg shadow-[#5B532C]/10 relative overflow-hidden">
            {/* Decorative Grid Line */}
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#5B532C]/5 hidden md:block" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Vitality Metric */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-[#5B532C]">Vitality Metrics</h3>
                  <TrendingUp className="w-5 h-5 text-[#63A361]" />
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={healthData}>
                      <CartesianGrid vertical={false} stroke="#5B532C" strokeOpacity={0.05} strokeDasharray="5 5" />
                      <XAxis dataKey="name" hide />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip
                        cursor={{ fill: 'transparent' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-[#5B532C] text-white p-3 rounded-2xl text-[10px] font-bold shadow-xl">
                                {payload[0].value}%
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="value" radius={[15, 15, 15, 15]} barSize={24}>
                        {healthData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {healthData.map((h, i) => (
                    <div key={i} className="text-center">
                      <div className="text-lg font-bold" style={{ color: h.fill }}>{h.value}%</div>
                      <div className="text-[8px] font-bold text-[#5B532C]/40 uppercase">{h.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact Pie */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-[#5B532C]">Tissue Impact</h3>
                  <Target className="w-5 h-5 text-orange-500" />
                </div>
                <div className="h-56 flex items-center justify-center relative">
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-bold text-[#5B532C]">{result.affectedArea}%</span>
                    <span className="text-[8px] font-bold text-[#5B532C]/30 uppercase tracking-widest">AFFECTED</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={affectedAreaData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={12}
                        dataKey="value"
                        stroke="none"
                      >
                        {affectedAreaData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Environmental Conditions */}
          <div className="p-10 bg-[#FDE7B3]/10 rounded-[3rem] border border-[#5B532C]/10">
            <h3 className="text-xl font-bold text-[#5B532C] mb-8 flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-md">
                <Droplets className="w-5 h-5 text-[#63A361]" />
              </div>
              Environment Analysis
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {result.environmentalFactors.map((f, i) => (
                <div key={i} className="p-6 bg-white rounded-3xl border border-[#5B532C]/5 shadow-xl shadow-[#5B532C]/5 hover:scale-[1.03] transition-transform">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-[#5B532C] uppercase tracking-wider">{f.factor}</span>
                    <div className={`w-2.5 h-2.5 rounded-full ${f.status === 'optimal' ? 'bg-[#63A361]' : f.status === 'warning' ? 'bg-[#FFC50F]' : 'bg-red-500'} shadow-sm`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Guidance & Resources */}
        <div className="space-y-8">
          {/* Precision Action Plan */}
          <div className="p-8 bg-[#5B532C] rounded-[3rem] text-white shadow-lg shadow-[#5B532C]/10">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
              <Shield className="w-6 h-6 text-[#FFC50F]" />
              Precision Treatment
            </h3>
            <div className="space-y-6">
              {result.treatmentRecommendations.slice(0, 4).map((rec, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-[#FFC50F] shrink-0 group-hover:bg-[#FFC50F] group-hover:text-brown-900 transition-all">
                    0{i + 1}
                  </div>
                  <p className="text-xs font-bold text-white/90 leading-relaxed pt-1.5">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CRAWL RESULTS: Web & Video Guidance */}
          <div className="p-8 bg-white rounded-[3rem] border-2 border-[#63A361]/20 shadow-2xl shadow-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-lg font-bold text-[#5B532C]">Guidance Crawl</h3>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#63A361] animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}
              </div>
            </div>

            <div className="space-y-6 flex-1">
              {/* Simulated Web Crawl 1: YouTube */}
              <motion.a
                whileHover={{ scale: 1.03, x: 5 }}
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(result.diseaseDetected + " treatment for " + result.cropType + " ICAR KVK India")}`}
                target="_blank"
                className="p-5 bg-red-50 rounded-[2rem] border border-red-100 block group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-500 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 group-hover:rotate-6 transition-transform">
                    <Youtube className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Video Tutorial</span>
                      <ExternalLink className="w-3 h-3 text-red-300" />
                    </div>
                    <h4 className="text-sm font-bold text-[#5B532C] leading-snug">
                      Watch: {result.diseaseDetected} Management
                    </h4>
                    <p className="text-[10px] text-red-700/60 font-bold mt-1">Sourced from Dr. Krishi / DD Kisan</p>
                  </div>
                </div>
              </motion.a>

              {/* Simulated Web Crawl 2: ICAR / Articles */}
              <motion.a
                whileHover={{ scale: 1.03, x: 5 }}
                href={`https://www.google.com/search?q=${encodeURIComponent("ICAR guide for " + result.diseaseDetected + " " + result.cropType)}`}
                target="_blank"
                className="p-5 bg-[#63A361]/5 rounded-[2rem] border border-[#63A361]/10 block group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#63A361] rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 group-hover:-rotate-6 transition-transform">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold text-[#63A361] uppercase tracking-widest">Article Library</span>
                      <ExternalLink className="w-3 h-3 text-[#63A361]/40" />
                    </div>
                    <h4 className="text-sm font-bold text-[#5B532C] leading-snug">
                      ICAR Research: {result.diseaseDetected}
                    </h4>
                    <p className="text-[10px] text-[#63A361] font-bold mt-1">Sourced from ICAR / TNAU AgriTech</p>
                  </div>
                </div>
              </motion.a>

              {/* Crawl Summary Bubble */}
              <div className="mt-4 p-6 bg-[#FDE7B3]/30 rounded-2xl border border-[#FFC50F]/20 relative">
                <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-white/50 rounded-full mb-3">
                  <Search className="w-3 h-3 text-[#5B532C]/40" />
                  <span className="text-[8px] font-bold text-[#5B532C]/40 uppercase tracking-[0.2em]">Crawl Insight</span>
                </div>
                <p className="text-[11px] text-[#5B532C] font-semibold italic leading-relaxed">
                  "Web scan complete. Farmers with {result.cropType} experiencing {result.diseaseDetected} report 85% success using
                  <span className="text-[#63A361] font-bold"> Integrated Pest Management (IPM)</span>. Priority: Remove infected foliage immediately."
                </p>
              </div>
            </div>
          </div>

          {/* New Session Button */}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRetry}
            className="w-full py-6 bg-white border-2 border-[#5B532C]/10 text-[#5B532C] font-bold rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-gray-200 transition-all uppercase tracking-[0.2em] text-xs hover:bg-[#5B532C]/5"
          >
            <RefreshCw className="w-4 h-4 text-[#63A361]" />
            New Diagnosis
          </motion.button>
        </div>
      </div>
    </div>
  );
};
