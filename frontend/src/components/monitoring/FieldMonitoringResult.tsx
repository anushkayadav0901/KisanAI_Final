import React from "react";
import { motion } from "framer-motion";
import {
  Sprout,
  AlertTriangle,
  TrendingUp,
  Target,
  RefreshCw,
  Activity,
  Shield,
  Map,
  Youtube,
  ExternalLink,
  Search,
} from "lucide-react";
import { FieldMonitoringResult as FieldResultType } from "../../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

interface Props {
  result: FieldResultType;
  image: string | null;
  onRetry: () => void;
}

export const FieldMonitoringResult: React.FC<Props> = ({
  result,
  image,
  onRetry,
}) => {
  const getStatusColor = (status: string) => {
    const colors = {
      low: {
        bg: "bg-[#63A361]/10",
        text: "text-[#63A361]",
        border: "border-[#63A361]/20",
        icon: "text-[#63A361]",
      },
      medium: {
        bg: "bg-[#FFC50F]/10",
        text: "text-[#FFC50F]",
        border: "border-[#FFC50F]/20",
        icon: "text-[#FFC50F]",
      },
      high: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: "text-red-600",
      },
      uniform: {
        bg: "bg-[#63A361]/10",
        text: "text-[#63A361]",
        border: "border-[#63A361]/20",
        icon: "text-[#63A361]",
      },
      patchy: {
        bg: "bg-[#FFC50F]/10",
        text: "text-[#FFC50F]",
        border: "border-[#FFC50F]/20",
        icon: "text-[#FFC50F]",
      },
      irregular: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: "text-red-600",
      },
    };
    return colors[status.toLowerCase() as keyof typeof colors] || colors.low;
  };

  const coverageData = [
    { name: "Crop", value: result.realTimeMetrics.coveragePercentage, fill: "#63A361" },
    { name: "Weed", value: result.realTimeMetrics.weedCoverage, fill: "#FFC50F" },
    { name: "Soil", value: result.realTimeMetrics.bareSoil, fill: "#5B532C" },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Premium Header Status */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden p-8 bg-gradient-to-br from-[#63A361] to-[#4a8a4d] rounded-2xl text-white shadow-lg shadow-[#5B532C]/10"
      >
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-[#FFC50F]/5 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Analysis Badge & Image */}
          <div className="relative">
            <div className="w-40 h-40 rounded-[2rem] overflow-hidden border-4 border-white/10 shadow-2xl bg-white/5 backdrop-blur-md">
              <img
                src={image || ""}
                alt="Field Survey"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg transform rotate-12">
              <Map className="w-6 h-6 text-[#FDE7B3]" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
              <Target className="w-3.5 h-3.5" />
              Agronomic Survey
            </span>
            <h2 className="text-4xl font-bold mb-3 text-white">
              {result.cropGrowthStage} <span className="text-green-300 italic">Phase</span>
            </h2>
            {/* Not an NDVI reading: NDVI needs multispectral bands this pipeline
                never sees. It is a vigour score estimated from an RGB photo, and
                it is labelled as one. */}
            <p className="text-white/90 text-lg max-w-xl font-medium leading-relaxed">
              Estimated vigour score
              <span className="font-bold text-green-300"> {result.vegetationIndex}</span>
              <span className="text-white/60 text-sm font-normal"> (visual estimate, not satellite NDVI)</span>.
              {" "}{result.analysisSummary}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 px-10 py-8 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-inner">
            <div className="text-3xl font-bold text-green-300 uppercase tracking-tighter">
              {result.fieldUniformity}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
              Pattern
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Top Row Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <motion.div
              className="p-8 bg-white rounded-2xl border border-[#5B532C]/5 shadow-lg shadow-[#5B532C]/10 flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                <Sprout className="w-6 h-6 text-[#63A361]" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Coverage</span>
              <div className="text-2xl font-bold text-[#5B532C]">{result.realTimeMetrics.coveragePercentage}%</div>
              <p className="text-[10px] font-bold text-green-600 mt-1">Excellent Population</p>
            </motion.div>

            <motion.div
              className={`p-8 bg-white rounded-2xl border-2 ${getStatusColor(result.weedDensity).border} shadow-lg shadow-[#5B532C]/10 flex flex-col items-center text-center`}
            >
              <div className={`w-12 h-12 ${getStatusColor(result.weedDensity).bg} rounded-2xl flex items-center justify-center mb-4`}>
                <AlertTriangle className={`w-6 h-6 ${getStatusColor(result.weedDensity).icon}`} />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Weed Load</span>
              <div className={`text-2xl font-bold ${getStatusColor(result.weedDensity).text} uppercase`}>{result.weedDensity}</div>
              <p className="text-[10px] font-bold text-gray-400 mt-1">{result.realTimeMetrics.weedCoverage}% Density</p>
            </motion.div>

            <motion.div
              className="p-8 bg-white rounded-2xl border border-[#5B532C]/5 shadow-lg shadow-[#5B532C]/10 flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 bg-[#5B532C]/10 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-[#5B532C]" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Yield Forecast</span>
              <div className="text-2xl font-bold text-[#5B532C] underline decoration-[#63A361] decoration-4 underline-offset-4">{result.yieldPrediction}</div>
            </motion.div>
          </div>

          {/* Charts Row */}
          <div className="p-10 bg-white rounded-[3rem] border border-[#5B532C]/5 shadow-lg shadow-[#5B532C]/10">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl font-bold text-[#5B532C]">Areal Distribution</h3>
              <Activity className="w-5 h-5 text-green-500" />
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coverageData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9ca3af' }} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[15, 15, 15, 15]} barSize={60}>
                    {coverageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8">
              {coverageData.map((c, i) => (
                <div key={i} className="flex flex-col items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-xl font-bold" style={{ color: c.fill }}>{c.value}%</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{c.name} Content</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visible Issues */}
          <div className="p-8 bg-[#FDE7B3]/20 rounded-2xl border border-[#FFC50F]/30 border-dashed">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-[#FFC50F] rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                <AlertTriangle className="w-6 h-6 text-[#5B532C]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#5B532C] mb-1">Anomaly Detection</h4>
                <p className="text-xs text-[#5B532C]/70 font-medium leading-relaxed italic">"{result.visibleIssues}"</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
          <div className="p-8 bg-[#63A361] rounded-2xl text-white shadow-lg shadow-[#5B532C]/10">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
              <Shield className="w-6 h-6 text-green-300" />
              Intervention
            </h3>
            <div className="space-y-4">
              {result.interventionPlans.slice(0, 4).map((p, i) => (
                <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                    {i + 1}
                  </div>
                  <p className="text-[11px] font-bold leading-relaxed">{p}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CRAWL RESULTS */}
          <div className="p-8 bg-white rounded-[3rem] border border-[#5B532C]/10 shadow-xl shadow-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-[#5B532C]">Aero Guidance</h3>
              <div className="px-3 py-1 bg-green-100 rounded-full text-[9px] font-bold text-green-700 uppercase">Live Crawl</div>
            </div>

            <div className="space-y-4">
              <motion.a
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent("precision agriculture drone field analysis management india")}`}
                target="_blank"
                className="p-4 bg-red-50 rounded-[1.5rem] border border-red-100 block group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-[#5B532C]">Field Expert</h4>
                    <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest">Video Guidance</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-red-200" />
                </div>
              </motion.a>

              <div className="mt-4 p-5 bg-[#FDE7B3]/30 rounded-[2rem] border border-[#FFC50F]/20 relative">
                <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-white rounded-full mb-3 shadow-sm">
                  <Search className="w-3 h-3 text-green-500" />
                  <span className="text-[8px] font-bold text-[#5B532C]/40 uppercase tracking-widest">General Guidance</span>
                </div>
                {/* Stated as the general agronomic principle it is. The earlier
                    copy attributed this to "crawl data from ISRO & ICAR", which
                    was never true — nothing here queries either organisation. */}
                <p className="text-[11px] text-[#5B532C] font-semibold italic leading-relaxed">
                  "{result.fieldUniformity} fields at the {result.cropGrowthStage} stage
                  generally respond well to variable rate application (VRA). Check your
                  state agriculture department for current equipment subsidies."
                </p>
              </div>
            </div>
          </div>

          <motion.button
            onClick={onRetry}
            className="w-full py-3.5 bg-white border border-[#5B532C]/15 text-[#5B532C] font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-[#FDE7B3]/30 transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4 text-[#63A361]" />
            New Field Scan
          </motion.button>
        </div>
      </div>
    </div>
  );
};
