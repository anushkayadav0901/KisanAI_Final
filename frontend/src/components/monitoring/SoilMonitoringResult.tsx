import React from "react";
import { motion } from "framer-motion";
import {
  Layers,
  Droplets,
  RefreshCw,
  Gauge,
  Activity,
  Shield,
  Leaf,
  Youtube,
  BookOpen,
  ExternalLink,
  Search,
} from "lucide-react";
import { SoilMonitoringResult as SoilResultType } from "../../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

interface Props {
  result: SoilResultType;
  image: string | null;
  onRetry: () => void;
}

export const SoilMonitoringResult: React.FC<Props> = ({
  result,
  image,
  onRetry,
}) => {
  const getStatusColor = (status: string) => {
    const colors = {
      optimal: {
        bg: "bg-[#63A361]/10",
        text: "text-[#63A361]",
        border: "border-[#63A361]/20",
        icon: "text-[#63A361]",
      },
      good: {
        bg: "bg-[#63A361]/5",
        text: "text-[#63A361]",
        border: "border-[#63A361]/10",
        icon: "text-[#63A361]",
      },
      fair: {
        bg: "bg-[#FFC50F]/10",
        text: "text-[#FFC50F]",
        border: "border-[#FFC50F]/20",
        icon: "text-[#FFC50F]",
      },
      poor: {
        bg: "bg-red-50",
        text: "text-red-600",
        border: "border-red-100",
        icon: "text-red-500",
      },
      critical: {
        bg: "bg-red-100",
        text: "text-red-700",
        border: "border-red-200",
        icon: "text-red-600",
      },
    };
    return colors[status.toLowerCase() as keyof typeof colors] || colors.fair;
  };

  const soilMetricsData = [
    { name: "Moisture", value: result.realTimeMetrics.moisturePercentage, fill: "#63A361" },
    { name: "Organic", value: result.realTimeMetrics.organicMatterIndicator, fill: "#5B532C" },
    { name: "pH Stability", value: (result.realTimeMetrics.pHEstimate / 14) * 100, fill: "#FFC50F" },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Premium Header Status */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden p-8 bg-gradient-to-br from-[#5B532C] to-[#3d381d] rounded-[2.5rem] text-white shadow-2xl shadow-[#5B532C]/30"
      >
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-[#FFC50F]/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Analysis Badge & Image */}
          <div className="relative">
            <div className="w-40 h-40 rounded-[2rem] overflow-hidden border-4 border-white/10 shadow-2xl bg-white/5 backdrop-blur-md">
              <img
                src={image || ""}
                alt="Soil Sample"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-[#FFC50F] rounded-2xl flex items-center justify-center shadow-lg transform -rotate-12">
              <Layers className="w-6 h-6 text-[#5B532C]" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
              <Activity className="w-3.5 h-3.5" />
              Subterranean Intelligence
            </span>
            <h2 className="text-4xl font-black mb-3">
              {result.soilType} <span className="text-[#FDE7B3] italic">Analysis</span>
            </h2>
            <p className="text-white/80 text-lg max-w-xl font-medium leading-relaxed">
              {result.analysisSummary}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 px-10 py-8 bg-white/5 backdrop-blur-lg rounded-[2.5rem] border border-white/10 shadow-inner">
            <div className="text-6xl font-black text-[#63A361]">
              {result.confidenceLevel}
              <span className="text-xl ml-1 text-white/50">%</span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
              Reliability
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Top Row Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <motion.div
              whileHover={{ y: -5 }}
              className={`p-6 bg-white rounded-[2rem] border-2 ${getStatusColor(result.moistureLevel).border} shadow-xl shadow-gray-50 flex flex-col items-center text-center`}
            >
              <div className={`w-12 h-12 ${getStatusColor(result.moistureLevel).bg} rounded-2xl flex items-center justify-center mb-4`}>
                <Droplets className={`w-6 h-6 ${getStatusColor(result.moistureLevel).icon}`} />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Moisture</span>
              <div className="text-2xl font-black text-[#5B532C] uppercase">{result.moistureLevel}</div>
              <div className="text-xs font-bold text-[#63A361] mt-1">{result.realTimeMetrics.moisturePercentage}% Content</div>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className={`p-6 bg-white rounded-[2rem] border-2 ${getStatusColor(result.fertilityEstimate).border} shadow-xl shadow-gray-50 flex flex-col items-center text-center`}
            >
              <div className={`w-12 h-12 ${getStatusColor(result.fertilityEstimate).bg} rounded-2xl flex items-center justify-center mb-4`}>
                <Leaf className={`w-6 h-6 ${getStatusColor(result.fertilityEstimate).icon}`} />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Fertility</span>
              <div className="text-2xl font-black text-[#5B532C] uppercase">{result.fertilityEstimate}</div>
              <div className="text-xs font-bold text-[#63A361] mt-1">Health Index High</div>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className={`p-6 bg-white rounded-[2rem] border-2 border-purple-100 shadow-xl shadow-gray-50 flex flex-col items-center text-center`}
            >
              <div className={`w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-4`}>
                <Gauge className={`w-6 h-6 text-purple-600`} />
              </div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">pH Balance</span>
              <div className="text-2xl font-black text-purple-600 uppercase">{result.realTimeMetrics.pHEstimate}</div>
              <div className="text-xs font-bold text-gray-400 mt-1">Optimal Neutral</div>
            </motion.div>
          </div>

          {/* Composition Chart */}
          <div className="p-10 bg-white rounded-[3rem] border border-[#5B532C]/5 shadow-2xl shadow-[#5B532C]/5">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-black text-[#5B532C]">Nutrient & Component Profile</h3>
              <Activity className="w-5 h-5 text-[#63A361]" />
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={soilMetricsData}>
                  <CartesianGrid vertical={false} stroke="#5B532C" strokeOpacity={0.05} strokeDasharray="5 5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#5B532C', opacity: 0.5 }} dy={10} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip
                    cursor={{ fill: '#FDE7B3', opacity: 0.2 }}
                    contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={50}>
                    {soilMetricsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-8 p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#FDE7B3]/20">
              <p className="text-sm text-[#5B532C]/70 font-medium leading-relaxed italic">
                "{result.compositionNotes}"
              </p>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Actions & Guidance */}
        <div className="space-y-8">
          {/* Prevention & Optimization */}
          <div className="p-8 bg-[#63A361] rounded-[3rem] text-white shadow-2xl shadow-[#63A361]/20">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3">
              <Shield className="w-6 h-6 text-[#FFC50F]" />
              Optimization Plan
            </h3>
            <div className="space-y-4">
              {result.improvementSuggestions.slice(0, 3).map((item, i) => (
                <div key={i} className="flex gap-4 p-4 bg-white/10 rounded-2xl border border-white/10 hover:bg-white/15 transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-[#FFC50F] flex items-center justify-center font-black text-[#5B532C] shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-xs font-bold leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CRAWL RESULTS */}
          <div className="p-8 bg-white rounded-[3rem] border border-[#5B532C]/10 shadow-xl shadow-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-[#5B532C]">Soil Wisdom</h3>
              <div className="px-3 py-1 bg-amber-100 rounded-full text-[9px] font-black text-amber-700 uppercase">Live Crawl</div>
            </div>

            <div className="space-y-4">
              <motion.a
                whileHover={{ scale: 1.02, x: 5 }}
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent("Soil improvement for " + result.soilType + " India Krishi Vigyan")}`}
                target="_blank"
                className="p-4 bg-red-50 rounded-[1.5rem] border border-red-100 block group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-black text-[#5B532C]">Soil Prep Video</h4>
                    <p className="text-[9px] text-red-700/50 font-bold">Expert Demo</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-red-200" />
                </div>
              </motion.a>

              <motion.a
                whileHover={{ scale: 1.02, x: 5 }}
                href={`https://www.google.com/search?q=${encodeURIComponent("ICAR guide soil health card " + result.soilType)}`}
                target="_blank"
                className="p-4 bg-[#5B532C]/5 rounded-[1.5rem] border border-[#5B532C]/10 block group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#5B532C] rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-black text-[#5B532C]">Scientific Guide</h4>
                    <p className="text-[9px] text-[#5B532C]/40 font-bold">ICAR Resources</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#5B532C]/20" />
                </div>
              </motion.a>

              <div className="mt-4 p-5 bg-[#FDE7B3]/20 rounded-[2rem] border border-[#FFC50F]/20">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-3 h-3 text-[#5B532C]/40" />
                  <span className="text-[8px] font-black text-[#5B532C]/40 uppercase tracking-widest">Global Scan</span>
                </div>
                <p className="text-[10px] text-[#5B532C] font-semibold italic leading-relaxed">
                  "Most {result.soilType} in India lacks organic carbon. Adding farmyard manure (FYM) or green manuring is crawl-recommended for {result.fertilityEstimate} land."
                </p>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRetry}
            className="w-full py-5 bg-white border-2 border-[#5B532C]/10 text-[#5B532C] font-black rounded-[2.5rem] flex items-center justify-center gap-3 shadow-xl transition-all uppercase tracking-widest text-xs"
          >
            <RefreshCw className="w-4 h-4 text-[#63A361]" />
            New Sample
          </motion.button>
        </div>
      </div>
    </div>
  );
};
