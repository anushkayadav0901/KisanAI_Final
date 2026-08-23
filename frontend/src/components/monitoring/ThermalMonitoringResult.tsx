import React from "react";
import { motion } from "framer-motion";
import {
  Thermometer,
  Droplets,
  RefreshCw,
  Activity,
  TrendingUp,
  Shield,
  Zap,
  Flame,
  Snowflake,
  Youtube,
  ExternalLink,
  Search,
} from "lucide-react";
import { ThermalMonitoringResult as ThermalResultType } from "../../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Cell,
} from "recharts";

interface Props {
  result: ThermalResultType;
  image: string | null;
  onRetry: () => void;
}

export const ThermalMonitoringResult: React.FC<Props> = ({
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
        border: "border-[#FFC50F]/30",
        icon: "text-[#FFC50F]",
      },
      high: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: "text-red-600",
      },
      none: {
        bg: "bg-[#63A361]/10",
        text: "text-[#63A361]",
        border: "border-[#63A361]/20",
        icon: "text-[#63A361]",
      },
      suspected: {
        bg: "bg-[#FFC50F]/10",
        text: "text-[#FFC50F]",
        border: "border-[#FFC50F]/30",
        icon: "text-[#FFC50F]",
      },
      evident: {
        bg: "bg-red-50",
        text: "text-red-700",
        border: "border-red-200",
        icon: "text-red-600",
      },
    };
    return colors[status.toLowerCase() as keyof typeof colors] || colors.low;
  };

  const temperatureData = [
    { name: "Min", value: result.realTimeMetrics.minTemperature, fill: "#63A361" },
    { name: "Avg", value: result.realTimeMetrics.averageTemperature, fill: "#5B532C" },
    { name: "Max", value: result.realTimeMetrics.maxTemperature, fill: "#ef4444" },
  ];

  const radarData = [
    { metric: "Heat Avg", value: (result.realTimeMetrics.averageTemperature / 50) * 100 },
    { metric: "Hot Density", value: (result.hotSpots / 20) * 100 },
    { metric: "Cold Density", value: (result.coldSpots / 20) * 100 },
    { metric: "Stress Index", value: result.realTimeMetrics.stressIndex },
    { metric: "Confidence", value: result.confidenceLevel },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Premium Header Status */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden p-8 bg-gradient-to-br from-red-600 via-orange-600 to-red-700 rounded-2xl text-white shadow-2xl shadow-red-900/20"
      >
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-yellow-400/10 rounded-full blur-2xl opacity-50" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          {/* Analysis Badge & Image */}
          <div className="relative">
            <div className="w-40 h-40 rounded-[2rem] overflow-hidden border-4 border-white/20 shadow-2xl bg-white/10 backdrop-blur-md">
              <img
                src={image || ""}
                alt="Thermal Scan"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg transform rotate-12">
              <Thermometer className="w-6 h-6 text-red-600" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wide mb-4">
              <Zap className="w-3.5 h-3.5" />
              Thermal Spectrum Analysis
            </span>
            <h2 className="text-4xl font-bold mb-3 text-white">
              Field <span className="text-yellow-300 italic">Thermography</span>
            </h2>
            <p className="text-white/90 text-lg max-w-xl font-medium leading-relaxed">
              Average surface temperature detected at
              <span className="font-bold text-yellow-300"> {result.realTimeMetrics.averageTemperature}°C</span>.
              {result.analysisSummary}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 px-10 py-8 bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-inner">
            <div className="text-3xl font-bold text-yellow-300 uppercase tracking-tight">
              {result.waterStressZones}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
              Stress Band
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Anomalies Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <motion.div
              whileHover={{ y: -5 }}
              className="p-8 bg-white rounded-2xl border border-[#5B532C]/5 shadow-lg shadow-[#5B532C]/10 relative overflow-hidden group"
            >
              <div className="absolute -top-1 -right-1 w-24 h-24 bg-red-50 rounded-full -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-6">Thermal Extremes</h4>
              <div className="flex items-end gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-bold text-[#5B532C]">Hot Spots</span>
                  </div>
                  <div className="text-4xl font-bold text-orange-600">{result.hotSpots}</div>
                </div>
                <div className="flex-1 border-l border-gray-100 pl-8">
                  <div className="flex items-center gap-2 mb-2">
                    <Snowflake className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-bold text-[#5B532C]">Cold Spots</span>
                  </div>
                  <div className="text-4xl font-bold text-blue-600">{result.coldSpots}</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className={`p-8 bg-white rounded-2xl border-2 ${getStatusColor(result.irrigationLeaks).border} shadow-lg shadow-[#5B532C]/10 relative overflow-hidden group`}
            >
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-6">Hydro-Thermal Integrity</h4>
              <div className="flex items-center gap-4 mb-2">
                <div className={`w-10 h-10 ${getStatusColor(result.irrigationLeaks).bg} rounded-xl flex items-center justify-center`}>
                  <Droplets className={`w-6 h-6 ${getStatusColor(result.irrigationLeaks).icon}`} />
                </div>
                <div className={`text-2xl font-bold ${getStatusColor(result.irrigationLeaks).text} uppercase`}>
                  {result.irrigationLeaks === 'none' ? 'Leaks: Clean' : result.irrigationLeaks}
                </div>
              </div>
              <p className="text-[10px] font-bold text-gray-400 leading-snug">
                {result.irrigationLeaks === 'none' ? 'No significant thermal signatures indicating irrigation failure.' : 'Immediate inspection required at identified coordinates.'}
              </p>
            </motion.div>
          </div>

          {/* Charts Card */}
          <div className="p-10 bg-white rounded-[3rem] border border-[#5B532C]/5 shadow-lg shadow-[#5B532C]/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Temp Bar */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-[#5B532C]">Heat Distribution</h3>
                  <TrendingUp className="w-5 h-5 text-red-500" />
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={temperatureData}>
                      <CartesianGrid vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9ca3af' }} />
                      <YAxis hide domain={[0, 60]} />
                      <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={40}>
                        {temperatureData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {temperatureData.map((t, i) => (
                    <div key={i} className="text-center p-3 bg-gray-50 rounded-2xl">
                      <div className="text-lg font-bold text-[#5B532C]">{t.value}°</div>
                      <div className="text-[8px] font-bold text-gray-400 uppercase">{t.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Radar Radar */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-[#5B532C]">Stress Footprint</h3>
                  <Activity className="w-5 h-5 text-purple-500" />
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#f3f4f6" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fontWeight: 'black', fill: '#9ca3af' }} />
                      <Radar
                        name="Profile"
                        dataKey="value"
                        stroke="#ef4444"
                        fill="#ef4444"
                        fillOpacity={0.5}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-[#FDE7B3]/10 rounded-2xl border border-[#FFC50F]/20 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-xs font-bold text-[#5B532C] uppercase tracking-wide mb-4">Variation Analysis</h4>
              <p className="text-sm text-[#5B532C]/70 font-medium leading-relaxed italic">"{result.temperatureVariations}"</p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#5B532C] uppercase tracking-wide mb-4">Growth Integrity</h4>
              <p className="text-sm text-[#5B532C]/70 font-medium leading-relaxed italic">"{result.cropHealthImpact}"</p>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
          <div className="p-8 bg-[#5B532C] rounded-[3rem] text-white shadow-2xl">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
              <Shield className="w-6 h-6 text-[#FFC50F]" />
              Mitigation Strategy
            </h3>
            <div className="space-y-4">
              {result.mitigationStrategies.slice(0, 4).map((m, i) => (
                <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center font-bold">
                    {i + 1}
                  </div>
                  <p className="text-[11px] font-bold leading-relaxed">{m}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CRAWL AREA */}
          <div className="p-8 bg-white rounded-[3rem] border border-[#5B532C]/10 shadow-xl shadow-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-[#5B532C]">Crawl Insights</h3>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />)}
              </div>
            </div>

            <div className="space-y-4">
              <motion.a
                whileHover={{ x: 5 }}
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent("thermal imaging agriculture precision irrigation india")}`}
                target="_blank"
                className="p-4 bg-red-50 rounded-[1.5rem] border border-red-100 block group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-[#5B532C]">Thermal Guide</h4>
                    <p className="text-[9px] text-red-500 font-bold uppercase tracking-wide">Video Guidance</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-red-200" />
                </div>
              </motion.a>

              <div className="mt-4 p-5 bg-[#FDE7B3]/30 rounded-[2rem] border border-[#FFC50F]/20 border-dashed relative">
                <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-white rounded-full mb-3">
                  <Search className="w-3 h-3 text-red-400" />
                  <span className="text-[8px] font-bold text-[#5B532C]/40 uppercase tracking-wide">Global Scan</span>
                </div>
                <p className="text-[11px] text-[#5B532C] font-semibold italic leading-relaxed">
                  "Crawl data from ICAR confirms that {result.waterStressZones} stress signals in mid-day scans often correlate with root-zone moisture deficit. Recommended: Night-time irrigation cycle."
                </p>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRetry}
            className="w-full py-6 bg-white border-2 border-[#5B532C]/10 text-[#5B532C] font-bold rounded-2xl flex items-center justify-center gap-3 shadow-xl uppercase tracking-wide text-xs"
          >
            <RefreshCw className="w-4 h-4 text-red-500" />
            Recalibrate Scan
          </motion.button>
        </div>
      </div>
    </div>
  );
};
