"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Leaf,
  Fish,
  TreePine,
  Settings2,
  CheckCircle2,
  ChevronDown,
  Play,
  BookOpen,
  Lightbulb,
  Layers,
  Droplets,
  Store,
  IndianRupee,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Video,
} from "lucide-react"
import {
  getModernFarmingAnalysis,
  type ModernFarmingResponse,
  type ModernFarmingRequest,
} from "../ai/modernFarmingService"
import {
  fetchSubsidies,
  fetchSuccessVideos,
  fetchFarmingInsights,
  type SubsidyResponse,
  type VideoResponse,
  type InsightsResponse,
} from "../ai/farmingDataService"
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import { toast, Toaster } from "react-hot-toast"
import { cn } from "../utils/cn"
import { loadResult, saveResult, clearFeature } from "../utils/storage"

import "./SmartFarming.css"

const techniques = [
  { id: "organic_farming", name: "Organic Farming", icon: Leaf },
  { id: "rainwater_farming", name: "Rainwater Farming", icon: TreePine },
  { id: "integrated_farming", name: "Fish Farming", icon: Fish },
  { id: "other_farming", name: "Other", icon: Settings2 },
] as const

const budgetOptions = [
  { value: "low", label: "Small Scale (< ₹5L)" },
  { value: "medium", label: "Medium Scale (₹5L - ₹20L)" },
  { value: "high", label: "Large Scale (> ₹20L)" },
] as const

// Icon resolver for guide sections
const sectionIcons: Record<string, React.ElementType> = {
  layers: Layers,
  droplets: Droplets,
  "indian-rupee": IndianRupee,
  store: Store,
  "alert-triangle": AlertTriangle,
}

const SmartFarming: React.FC = () => {
  const [selectedTechnique, setSelectedTechnique] = useState<string>("")
  const [selectedBudget, setSelectedBudget] =
    useState<ModernFarmingRequest["budget"]>("medium")
  const [farmSize, setFarmSize] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [analysisData, setAnalysisData] =
    useState<ModernFarmingResponse | null>(null)
  const [customFarmingType, setCustomFarmingType] = useState<string>("")
  const [showResults, setShowResults] = useState<boolean>(false)
  const [formCollapsed, setFormCollapsed] = useState(true)

  // Farming data
  const [subsidyData, setSubsidyData] = useState<SubsidyResponse | null>(null)
  const [videoData, setVideoData] = useState<VideoResponse | null>(null)
  const [insightsData, setInsightsData] = useState<InsightsResponse | null>(null)
  const [subsidyLoading, setSubsidyLoading] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)
  const [insightsLoading, setInsightsLoading] = useState(false)

  // UI state
  const [expandedSubsidy, setExpandedSubsidy] = useState<string | null>(null)
  const [showVideoSummary, setShowVideoSummary] = useState(false)
  const [, setExpandedInsight] = useState<number | null>(0)

  // ── Hydrate from localStorage ──
  useEffect(() => {
    const cached = loadResult<{
      inputs: { technique: string; farmSize: string; budget: ModernFarmingRequest["budget"]; custom?: string }
      analysisData: ModernFarmingResponse | null
      showResults: boolean
    }>("smart")
    if (cached) {
      setSelectedTechnique(cached.inputs?.technique || "")
      setFarmSize(cached.inputs?.farmSize || "")
      setSelectedBudget(cached.inputs?.budget || "medium")
      setCustomFarmingType(cached.inputs?.custom || "")
      setAnalysisData(cached.analysisData || null)
      setShowResults(Boolean(cached.showResults && cached.analysisData))
    }
    const cachedSub = loadResult<SubsidyResponse>("smart_subsidies")
    if (cachedSub) setSubsidyData(cachedSub)
    const cachedVid = loadResult<VideoResponse>("smart_videos")
    if (cachedVid) setVideoData(cachedVid)
    const cachedIns = loadResult<InsightsResponse>("smart_insights")
    if (cachedIns) setInsightsData(cachedIns)
  }, [])

  // ── Chart data ──
  const pieChartData = useMemo(() => {
    if (!analysisData) return []
    return [
      { name: "Infrastructure", value: analysisData.techniqueAnalysis.costBreakdown.infrastructure, color: "#3b82f6" },
      { name: "Equipment", value: analysisData.techniqueAnalysis.costBreakdown.equipment, color: "#10b981" },
      { name: "Seeds", value: analysisData.techniqueAnalysis.costBreakdown.seeds, color: "#f59e0b" },
      { name: "Labor", value: analysisData.techniqueAnalysis.costBreakdown.labor, color: "#ef4444" },
      { name: "Maintenance", value: analysisData.techniqueAnalysis.costBreakdown.maintenance, color: "#8b5cf6" },
      { name: "Miscellaneous", value: analysisData.techniqueAnalysis.costBreakdown.miscellaneous, color: "#06b6d4" },
    ]
  }, [analysisData])

  const radarChartData = useMemo(() => {
    if (!analysisData) return []
    return [
      { subject: "Water", A: analysisData.metrics.resourceEfficiency.water, fullMark: 100 },
      { subject: "Labor", A: analysisData.metrics.resourceEfficiency.labor, fullMark: 100 },
      { subject: "Energy", A: analysisData.metrics.resourceEfficiency.energy, fullMark: 100 },
      { subject: "Yield", A: analysisData.metrics.resourceEfficiency.yield, fullMark: 100 },
      { subject: "Sustainability", A: analysisData.metrics.resourceEfficiency.sustainability, fullMark: 100 },
      { subject: "Fertilizer", A: analysisData.metrics.resourceEfficiency.fertilizer, fullMark: 100 },
      { subject: "Pesticide", A: analysisData.metrics.resourceEfficiency.pesticide, fullMark: 100 },
    ]
  }, [analysisData])

  const financialProjectionsData = useMemo(() => {
    if (!analysisData) return []
    return [
      { year: "Year 1", revenue: analysisData.financialProjections.year1.revenue, expenses: analysisData.financialProjections.year1.expenses, profit: analysisData.financialProjections.year1.profit },
      { year: "Year 2", revenue: analysisData.financialProjections.year2.revenue, expenses: analysisData.financialProjections.year2.expenses, profit: analysisData.financialProjections.year2.profit },
      { year: "Year 3", revenue: analysisData.financialProjections.year3.revenue, expenses: analysisData.financialProjections.year3.expenses, profit: analysisData.financialProjections.year3.profit },
    ]
  }, [analysisData])

  // ── Validation ──
  const isFormValid = () => {
    if (!selectedTechnique || !farmSize || farmSize === '0' || Number(farmSize) <= 0) return false
    if (selectedTechnique === "other_farming" && !customFarmingType.trim()) return false
    return true
  }

  const isFarmingRelated = (technique: string): boolean => {
    const farmingKeywords = [
      'organic', 'farming', 'agriculture', 'crop', 'soil', 'irrigation', 'harvest',
      'rainwater', 'fish', 'aquaculture', 'hydroponic', 'vertical', 'greenhouse',
      'sustainable', 'permaculture', 'biodynamic', 'precision', 'smart', 'modern',
      'traditional', 'conventional', 'natural', 'ecological', 'regenerative',
      'livestock', 'dairy', 'poultry', 'aquaponics', 'aeroponics', 'container',
      'rooftop', 'urban', 'rural', 'farm', 'field', 'plantation', 'orchard',
      'vineyard', 'garden', 'cultivation', 'planting', 'seeding', 'fertilizer',
      'compost', 'pesticide', 'herbicide', 'weed', 'pest', 'disease', 'yield',
      'production', 'harvesting', 'storage', 'processing', 'marketing', 'distribution'
    ]
    const nonFarmingKeywords = [
      'porn', 'sex', 'adult', 'gambling', 'casino', 'drug', 'illegal', 'hack',
      'crack', 'virus', 'malware', 'spam', 'scam', 'fraud', 'theft',
      'murder', 'kill', 'violence', 'weapon', 'bomb', 'terrorist',
      'crypto', 'bitcoin', 'facebook', 'twitter', 'instagram', 'tiktok'
    ]
    const t = technique.toLowerCase()
    const hasVowels = /[aeiou]/i.test(t)
    const hasConsonants = /[bcdfghjklmnpqrstvwxyz]/i.test(t)
    const isGibberish = technique.length > 10 && (!hasVowels || !hasConsonants)
    return farmingKeywords.some(k => t.includes(k)) && !nonFarmingKeywords.some(k => t.includes(k)) && !isGibberish
  }

  // ── Reset ──
  const handleReset = () => {
    clearFeature("smart")
    setAnalysisData(null)
    setShowResults(false)
    setSelectedTechnique("")
    setFarmSize("")
    setSelectedBudget("medium")
    setCustomFarmingType("")
    setSubsidyData(null)
    setVideoData(null)
    setInsightsData(null)
    setExpandedSubsidy(null)
    setShowVideoSummary(false)
    setExpandedInsight(0)
    setFormCollapsed(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.success("Ready for a new analysis!", {
      style: { background: "#63A361", color: "#fff", padding: "14px 20px", borderRadius: "8px" },
      duration: 2000,
    })
  }

  // ── Analysis ──
  const handleAnalysis = async () => {
    if (!isFormValid()) {
      if (!selectedTechnique) toast.error("Please select a farming technique", { style: { background: "#FF5757", color: "#fff", padding: "16px", borderRadius: "8px" } })
      else if (!farmSize || farmSize === '0' || Number(farmSize) <= 0) toast.error("Please enter a valid farm size", { style: { background: "#FF5757", color: "#fff", padding: "16px", borderRadius: "8px" } })
      else if (selectedTechnique === "other_farming" && !customFarmingType.trim()) toast.error("Please specify your farming technique", { style: { background: "#FF5757", color: "#fff", padding: "16px", borderRadius: "8px" } })
      return
    }

    const techniqueToValidate = selectedTechnique === "other_farming" ? customFarmingType : selectedTechnique
    if (!isFarmingRelated(techniqueToValidate)) {
      toast.error("Not Applicable: Please enter a valid farming technique.", { style: { background: "#FF8C00", color: "#fff", padding: "16px", borderRadius: "8px" }, duration: 6000 })
      setSelectedTechnique(""); setFarmSize(""); setCustomFarmingType("")
      return
    }

    setLoading(true)
    setFormCollapsed(true)
    const techniqueForApi = selectedTechnique === "other_farming" ? customFarmingType : selectedTechnique

    const analysisPromise = getModernFarmingAnalysis({
      technique: techniqueForApi,
      farmSize,
      budget: selectedBudget,
    })

    toast.promise(analysisPromise, {
      loading: "Generating farming analysis...",
      success: "Analysis completed successfully",
      error: "Failed to generate analysis",
    }, { style: { minWidth: "250px", padding: "16px", borderRadius: "8px" } })

    try {
      const data = await analysisPromise
      setAnalysisData(data)
      setShowResults(true)
      saveResult("smart", {
        inputs: { technique: techniqueForApi, farmSize, budget: selectedBudget, custom: selectedTechnique === "other_farming" ? customFarmingType : undefined },
        analysisData: data as any,
        showResults: true,
      })

      // Parallel fetch
      setSubsidyLoading(true)
      fetchSubsidies(techniqueForApi, undefined, selectedBudget)
        .then((d) => { setSubsidyData(d); saveResult("smart_subsidies", d as any) })
        .catch((e) => console.error("Subsidy error:", e))
        .finally(() => setSubsidyLoading(false))

      setVideoLoading(true)
      fetchSuccessVideos(techniqueForApi)
        .then((d) => { setVideoData(d); saveResult("smart_videos", d as any) })
        .catch((e) => console.error("Video error:", e))
        .finally(() => setVideoLoading(false))

      setInsightsLoading(true)
      fetchFarmingInsights(techniqueForApi, farmSize, selectedBudget)
        .then((d) => { setInsightsData(d); saveResult("smart_insights", d as any) })
        .catch((e) => console.error("Insights error:", e))
        .finally(() => setInsightsLoading(false))
    } catch (err) {
      if (err instanceof Error && err.message.includes("NOT_APPLICABLE")) {
        toast.error("Not Applicable: Please enter a valid farming technique.", { style: { background: "#FF8C00", color: "#fff", padding: "16px", borderRadius: "8px" }, duration: 6000 })
        setSelectedTechnique(""); setFarmSize(""); setCustomFarmingType("")
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to generate analysis.", { style: { background: "#FF5757", color: "#fff", padding: "16px", borderRadius: "8px" }, duration: 5000 })
      }
    } finally {
      setLoading(false)
    }
  }

  const getDisplayTitle = () => {
    if (selectedTechnique === "other_farming" && customFarmingType) {
      // capitalize custom type nicely, like the model did
      return customFarmingType.replace(/\b\w/g, (l: string) => l.toUpperCase());
    }
    const tech = techniques.find(t => t.id === selectedTechnique);
    if (tech) return tech.name;
    return analysisData?.techniqueAnalysis.overview.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || "";
  }
  const techniqueName = getDisplayTitle()

  // ── Render ──
  return (
    <div className="min-h-screen bg-white pt-24 pb-12">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ════════════ FORM SECTION ════════════ */}
        {showResults && analysisData ? (
          /* ── Collapsed bar ── */
          <div className="mb-8 bg-white rounded-2xl border border-[#5B532C]/10 overflow-hidden">
            <button
              onClick={() => setFormCollapsed(!formCollapsed)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#FDFCF8] transition-colors text-left"
            >
              <div className="flex items-center gap-4 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-[#5B532C] truncate">{techniqueName} Analysis</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[#63A361] bg-[#63A361]/10 rounded-full flex-shrink-0">
                  {farmSize} acres
                </span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span role="button" onClick={(e) => { e.stopPropagation(); handleReset() }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5B532C]/70 hover:text-[#5B532C] bg-[#FDE7B3]/30 hover:bg-[#FDE7B3]/60 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Reset
                </span>
                <ChevronDown className={cn("w-5 h-5 text-[#5B532C]/40 transition-transform", !formCollapsed && "rotate-180")} />
              </div>
            </button>

            <AnimatePresence>
              {!formCollapsed && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="px-6 pb-6 pt-2 border-t border-[#5B532C]/10">
                    <p className="text-xs text-[#5B532C]/50 mb-4">Change inputs below and re-analyze</p>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-4">
                      {techniques.map((tech) => (
                        <button key={tech.id} onClick={() => { setSelectedTechnique(tech.id); if (tech.id !== "other_farming") setCustomFarmingType("") }}
                          className={cn("p-3 rounded-xl border-2 text-center text-sm font-medium transition-colors",
                            selectedTechnique === tech.id ? "border-[#63A361] bg-[#63A361]/5 text-[#63A361]" : "border-[#5B532C]/10 text-[#5B532C]/70 hover:border-[#5B532C]/20"
                          )}
                        >{tech.name}</button>
                      ))}
                    </div>
                    {selectedTechnique === "other_farming" && (
                      <input type="text" placeholder="e.g., Vertical Farming, Hydroponics..." value={customFarmingType} onChange={(e) => setCustomFarmingType(e.target.value)}
                        className="w-full px-4 py-2.5 mb-4 rounded-lg border border-[#5B532C]/20 bg-white text-sm text-[#5B532C] placeholder-[#5B532C]/40 focus:outline-none focus:border-[#63A361]"
                      />
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="relative">
                        <input type="number" placeholder="Farm size" value={farmSize}
                          onChange={(e) => { const v = e.target.value; if (v === '' || (!isNaN(Number(v)) && Number(v) >= 0)) setFarmSize(v) }}
                          min="0" className="w-full py-2.5 px-4 pr-14 rounded-lg border border-[#5B532C]/20 bg-white text-sm text-[#5B532C] focus:outline-none focus:border-[#63A361]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#5B532C]/50">acres</span>
                      </div>
                      <select value={selectedBudget} onChange={(e) => setSelectedBudget(e.target.value as ModernFarmingRequest["budget"])}
                        className="w-full py-2.5 px-4 rounded-lg border border-[#5B532C]/20 bg-white text-sm text-[#5B532C] appearance-none cursor-pointer focus:outline-none focus:border-[#63A361]"
                      >
                        {budgetOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                      </select>
                      <button onClick={handleAnalysis} disabled={loading || !isFormValid()}
                        className={cn("py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors",
                          isFormValid() && !loading ? "bg-[#63A361] text-white hover:bg-[#548f52]" : "bg-[#5B532C]/10 text-[#5B532C]/40 cursor-not-allowed"
                        )}
                      >
                        {loading ? (<><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Analyzing...</>) : "Re-analyze"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : !showResults ? (
          /* ── Full input form ── */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 mx-auto mb-10 max-w-4xl sm:px-0">
            <div className="p-8 bg-white rounded-2xl border border-[#5B532C]/10">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#5B532C]/10">
                <div>
                  <h2 className="text-xl font-bold text-[#5B532C]">Configure Your Analysis</h2>
                  <p className="text-sm text-[#5B532C]/60">Select options to get personalized farming insights</p>
                </div>
              </div>

              {/* Technique */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-full bg-[#63A361] text-white text-xs font-bold flex items-center justify-center">1</div>
                  <label className="text-sm font-semibold text-[#5B532C]">Choose Farming Technique</label>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {techniques.map((tech) => (
                    <button key={tech.id} onClick={() => { setSelectedTechnique(tech.id); if (tech.id !== "other_farming") setCustomFarmingType("") }}
                      className={cn("relative p-4 rounded-xl border-2 flex flex-col items-center text-center transition-colors",
                        selectedTechnique === tech.id ? "border-[#63A361] bg-[#63A361]/5" : "border-[#5B532C]/10 bg-white"
                      )}
                    >
                      {selectedTechnique === tech.id && <div className="absolute top-2 right-2"><CheckCircle2 className="w-4 h-4 text-[#63A361]" /></div>}
                      <div className={cn("mb-3 w-12 h-12 rounded-xl flex items-center justify-center", selectedTechnique === tech.id ? "bg-[#63A361]" : "bg-[#FDE7B3]/50")}>
                        <tech.icon className={cn("w-6 h-6", selectedTechnique === tech.id ? "text-white" : "text-[#63A361]")} />
                      </div>
                      <span className={cn("text-sm font-medium", selectedTechnique === tech.id ? "text-[#63A361]" : "text-[#5B532C]")}>{tech.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom type */}
              <AnimatePresence>
                {selectedTechnique === "other_farming" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-8">
                    <div className="p-4 rounded-xl bg-[#FDE7B3]/20 border border-[#FFC50F]/20">
                      <label className="block mb-2 text-sm font-medium text-[#5B532C]">Specify Your Farming Technique</label>
                      <input type="text" placeholder="e.g., Vertical Farming, Hydroponics..." value={customFarmingType} onChange={(e) => setCustomFarmingType(e.target.value)}
                        className={cn("w-full px-4 py-3 rounded-lg border bg-white text-[#5B532C] placeholder-[#5B532C]/40 focus:outline-none",
                          customFarmingType && !isFarmingRelated(customFarmingType) ? "border-red-400" : "border-[#5B532C]/20 focus:border-[#63A361]"
                        )}
                      />
                      {customFarmingType && !isFarmingRelated(customFarmingType) && <p className="mt-2 text-sm text-red-500">Please enter a farming technique related to agriculture</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Farm details */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-full bg-[#63A361] text-white text-xs font-bold flex items-center justify-center">2</div>
                  <label className="text-sm font-semibold text-[#5B532C]">Farm Details</label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-[#5B532C]/70">Farm Size</label>
                    <div className="relative">
                      <input type="number" placeholder="Enter farm size" value={farmSize}
                        onChange={(e) => { const v = e.target.value; if (v === '' || (!isNaN(Number(v)) && Number(v) >= 0)) setFarmSize(v) }}
                        min="0" className="w-full py-3 pl-4 pr-16 rounded-lg border border-[#5B532C]/20 bg-white text-[#5B532C] placeholder-[#5B532C]/40 focus:outline-none focus:border-[#63A361]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#5B532C]/60">acres</span>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-[#5B532C]/70">Budget Range</label>
                    <div className="relative">
                      <select value={selectedBudget} onChange={(e) => setSelectedBudget(e.target.value as ModernFarmingRequest["budget"])}
                        className="w-full py-3 pl-4 pr-4 rounded-lg border border-[#5B532C]/20 bg-white text-[#5B532C] appearance-none cursor-pointer focus:outline-none focus:border-[#63A361]"
                      >
                        {budgetOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B532C]/50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={handleAnalysis} disabled={loading || !isFormValid()}
                className={cn("w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-colors",
                  isFormValid() && !loading ? "bg-[#63A361] text-white" : "bg-[#5B532C]/10 text-[#5B532C]/40 cursor-not-allowed"
                )}
              >
                {loading ? (<><div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Analyzing...</span></>) : (
                  <span>{isFormValid() ? "Generate AI Analysis" : "Complete all fields above"}</span>
                )}
              </button>
            </div>
          </motion.div>
        ) : null}


        {/* ════════════ RESULTS ════════════ */}
        {showResults && analysisData && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-10">

            {/* ── Key Metrics ── */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: "Total Investment", value: `₹${analysisData.techniqueAnalysis.overview.estimatedCost.toLocaleString()}`, sub: `${analysisData.techniqueAnalysis.overview.timeToRoi} ROI`, accent: true },
                { label: "ROI", value: `${analysisData.techniqueAnalysis.overview.roi}%`, sub: `${analysisData.techniqueAnalysis.overview.successRate}% Success Rate`, accent: true },
                { label: "Market Demand", value: `${analysisData.techniqueAnalysis.overview.marketDemand}%`, sub: `${analysisData.techniqueAnalysis.overview.riskLevel} Risk`, accent: false },
                { label: "Sustainability", value: `${analysisData.techniqueAnalysis.overview.sustainabilityScore}%`, sub: "Environmental Impact", accent: true },
              ].map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                  className="p-5 bg-white rounded-2xl border border-[#5B532C]/10"
                >
                  <p className="text-sm font-medium text-[#5B532C]/60 mb-2">{m.label}</p>
                  <p className={cn("text-2xl font-bold mb-1", m.accent ? "text-[#63A361]" : "text-[#5B532C]")}>{m.value}</p>
                  <p className="text-xs text-[#5B532C]/50">{m.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Cost Breakdown */}
              <div className="p-6 bg-white rounded-2xl border border-[#5B532C]/10">
                <h3 className="text-base font-semibold text-[#5B532C] mb-4">Cost Breakdown</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieChartData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                        label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Resource Efficiency */}
              <div className="p-6 bg-white rounded-2xl border border-[#5B532C]/10">
                <h3 className="text-base font-semibold text-[#5B532C] mb-4">Resource Efficiency</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarChartData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="Efficiency" dataKey="A" stroke="#63A361" fill="#63A361" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Financial Projections */}
            <div className="p-6 bg-white rounded-2xl border border-[#5B532C]/10">
              <h3 className="text-base font-semibold text-[#5B532C] mb-4">3-Year Financial Projections</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financialProjectionsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="#63A361" name="Revenue" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" fill="#FFC50F" name="Profit" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ══════════ YEAR-BY-YEAR ROADMAP ══════════ */}
            <div className="bg-white rounded-2xl border border-[#5B532C]/10 overflow-hidden">
              <div className="px-6 py-5 border-b border-[#5B532C]/10">
                <h3 className="text-lg font-bold text-[#5B532C]">Year-by-Year Roadmap</h3>
                <p className="text-sm text-[#5B532C]/50 mt-1">
                  Total duration: {analysisData.implementation.timeline.totalDuration}
                </p>
              </div>

              <div className="divide-y divide-[#5B532C]/8">
                {analysisData.implementation.phases.map((phase, index) => {
                  const colors = ["#63A361", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"]
                  const color = colors[index % colors.length]

                  return (
                    <div key={index} className="px-6 py-5">
                      {/* Phase header row */}
                      <div className="flex items-start gap-4 mb-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: color }}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-semibold text-[#5B532C]">{phase.name}</h4>
                            <span className="px-2 py-0.5 text-xs font-medium text-[#5B532C]/70 bg-[#FDE7B3]/50 rounded-full">{phase.duration}</span>
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ backgroundColor: `${color}15`, color }}>{phase.priority}</span>
                          </div>
                          <p className="text-sm text-[#5B532C]/60 leading-relaxed">{phase.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0 hidden sm:block">
                          <p className="text-sm font-semibold text-[#5B532C]">₹{phase.estimatedCost.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Milestones + Metrics in a clean two-column layout */}
                      <div className="ml-12 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                        <div>
                          <p className="text-xs font-semibold text-[#5B532C]/40 uppercase tracking-wider mb-1.5">Milestones</p>
                          {phase.keyMilestones.map((m: string, mi: number) => (
                            <p key={mi} className="text-xs text-[#5B532C]/60 py-0.5 flex items-start gap-1.5">
                              <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                              {m}
                            </p>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#5B532C]/40 uppercase tracking-wider mb-1.5">Success Metrics</p>
                          {phase.successMetrics.map((s: string, si: number) => (
                            <p key={si} className="text-xs text-[#5B532C]/60 py-0.5 flex items-start gap-1.5">
                              <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0 bg-[#63A361]" />
                              {s}
                            </p>
                          ))}
                        </div>
                      </div>
                      <p className="ml-12 mt-2 text-sm font-semibold text-[#5B532C] sm:hidden">Cost: ₹{phase.estimatedCost.toLocaleString()}</p>
                    </div>
                  )
                })}
              </div>
            </div>


            {/* ══════════ GOVERNMENT SUBSIDIES ══════════ */}
            <div className="bg-white rounded-2xl border border-[#5B532C]/10 overflow-hidden">
              <div className="px-6 py-5 border-b border-[#5B532C]/10">
                <h3 className="text-lg font-bold text-[#5B532C]">Government Subsidies</h3>
                <p className="text-sm text-[#5B532C]/50 mt-1">Available schemes for your farming technique</p>
              </div>

              <div className="p-6">
                {subsidyLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 rounded-full border-3 border-[#63A361]/20 border-t-[#63A361] animate-spin mx-auto mb-3" />
                    <p className="text-sm text-[#5B532C]/50">Finding relevant subsidies...</p>
                  </div>
                ) : subsidyData?.subsidies?.length ? (
                  <div className="space-y-3">
                    {subsidyData.subsidies.map((subsidy) => (
                      <div key={subsidy.id} className="rounded-xl border border-[#5B532C]/10 overflow-hidden subsidy-card">
                        <button
                          onClick={() => setExpandedSubsidy(expandedSubsidy === subsidy.id ? null : subsidy.id)}
                          className="w-full px-5 py-4 flex items-start justify-between text-left hover:bg-[#FDFCF8] transition-colors"
                        >
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm text-[#5B532C]">{subsidy.name}</h4>
                              <span className="px-2 py-0.5 text-[10px] font-medium text-[#63A361] bg-[#63A361]/10 rounded-full">{subsidy.category}</span>
                            </div>
                            <p className="text-xs text-[#5B532C]/50">{subsidy.ministry}</p>
                            <p className="text-sm text-[#5B532C]/70 mt-1 line-clamp-2">{subsidy.summary}</p>
                          </div>
                          <ChevronDown className={cn("w-4 h-4 text-[#5B532C]/30 flex-shrink-0 mt-1 transition-transform", expandedSubsidy === subsidy.id && "rotate-180")} />
                        </button>

                        <AnimatePresence>
                          {expandedSubsidy === subsidy.id && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="px-5 pb-4 space-y-3 border-t border-[#5B532C]/8">
                                {subsidy.benefits && (
                                  <div className="pt-3">
                                    <p className="text-xs font-semibold text-[#5B532C]/40 uppercase mb-1">Benefits</p>
                                    <p className="text-sm text-[#63A361] font-medium">{subsidy.benefits}</p>
                                  </div>
                                )}
                                {subsidy.eligibility?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-[#5B532C]/40 uppercase mb-1">Eligibility</p>
                                    <ul className="space-y-1">
                                      {subsidy.eligibility.map((item: string, idx: number) => (
                                        <li key={idx} className="text-xs text-[#5B532C]/60 flex items-start gap-1.5">
                                          <span className="w-1 h-1 rounded-full bg-[#63A361] mt-1.5 flex-shrink-0" />{item}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {subsidy.applicationProcess?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-[#5B532C]/40 uppercase mb-1">How to Apply</p>
                                    <ol className="space-y-1">
                                      {subsidy.applicationProcess.map((step: string, idx: number) => (
                                        <li key={idx} className="text-xs text-[#5B532C]/60 flex items-start gap-1.5">
                                          <span className="text-[#63A361] font-medium flex-shrink-0">{idx + 1}.</span>{step}
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                )}
                                <div className="flex gap-3 pt-2">
                                  {subsidy.applicationUrl && (
                                    <a href={subsidy.applicationUrl} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#63A361] rounded-lg hover:bg-[#548f52] transition-colors"
                                    >Apply Now <ExternalLink className="w-3 h-3" /></a>
                                  )}
                                  {subsidy.sourceUrl && (
                                    <a href={subsidy.sourceUrl} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5B532C]/70 bg-[#FDE7B3]/30 rounded-lg hover:bg-[#FDE7B3]/50 transition-colors"
                                    >Source <ExternalLink className="w-3 h-3" /></a>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                    {subsidyData.source && (
                      <p className="text-[10px] text-[#5B532C]/30 text-right mt-2">Source: {subsidyData.source} · Updated: {new Date(subsidyData.lastUpdated).toLocaleDateString()}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#5B532C]/50">
                    <p className="text-sm">No subsidies found. Try a different technique.</p>
                  </div>
                )}
              </div>
            </div>


            {/* ══════════ SUCCESS STORY VIDEO ══════════ */}
            <div className="bg-white rounded-2xl border border-[#5B532C]/10 overflow-hidden">
              <div className="px-6 py-5 border-b border-[#5B532C]/10">
                <h3 className="text-lg font-bold text-[#5B532C]">Success Story</h3>
                <p className="text-sm text-[#5B532C]/50 mt-1">Real farmer success with this technique</p>
              </div>

              <div className="p-6">
                {videoLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 rounded-full border-3 border-[#63A361]/20 border-t-[#63A361] animate-spin mx-auto mb-3" />
                    <p className="text-sm text-[#5B532C]/50">Finding success stories...</p>
                  </div>
                ) : videoData?.featuredVideo ? (
                  <div className="space-y-4">
                    {/* Video embed */}
                    <div className="aspect-video rounded-xl overflow-hidden bg-black">
                      <iframe
                        src={videoData.featuredVideo.embedUrl}
                        title={videoData.featuredVideo.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>

                    {/* Video info */}
                    <div>
                      <h4 className="font-semibold text-[#5B532C] text-sm leading-snug">{videoData.featuredVideo.title}</h4>
                      <p className="text-xs text-[#5B532C]/50 mt-1">{videoData.featuredVideo.channel} · {videoData.featuredVideo.views}</p>
                    </div>

                    {/* Summary dropdown */}
                    {videoData.featuredVideo.summary && (
                      <div className="rounded-xl border border-[#5B532C]/10 overflow-hidden">
                        <button onClick={() => setShowVideoSummary(!showVideoSummary)}
                          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#FDFCF8] transition-colors"
                        >
                          <span className="text-sm font-medium text-[#5B532C]">Video Summary & Takeaways</span>
                          <ChevronDown className={cn("w-4 h-4 text-[#5B532C]/30 transition-transform", showVideoSummary && "rotate-180")} />
                        </button>
                        <AnimatePresence>
                          {showVideoSummary && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="px-4 pb-4 border-t border-[#5B532C]/8 pt-3 space-y-3">
                                <p className="text-sm text-[#5B532C]/70 leading-relaxed">{videoData.featuredVideo.summary}</p>
                                {videoData.featuredVideo.keyTakeaways?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-[#5B532C]/40 uppercase mb-1.5">Key Takeaways</p>
                                    <ul className="space-y-1">
                                      {videoData.featuredVideo.keyTakeaways.map((t: string, i: number) => (
                                        <li key={i} className="text-xs text-[#5B532C]/60 flex items-start gap-1.5">
                                          <span className="w-1 h-1 rounded-full bg-[#63A361] mt-1.5 flex-shrink-0" />{t}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Related videos */}
                    {videoData.relatedVideos?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[#5B532C]/40 uppercase mb-2">More Videos</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {videoData.relatedVideos.slice(0, 2).map((video) => (
                            <a key={video.id} href={video.embedUrl.replace('/embed/', '/watch?v=')} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 rounded-xl border border-[#5B532C]/10 hover:bg-[#FDFCF8] transition-colors group"
                            >
                              <div className="w-20 h-14 rounded-lg overflow-hidden bg-[#5B532C]/5 flex-shrink-0 flex items-center justify-center">
                                <Play className="w-5 h-5 text-[#5B532C]/30 group-hover:text-[#63A361] transition-colors" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-[#5B532C] truncate">{video.title}</p>
                                <p className="text-[10px] text-[#5B532C]/50">{video.channel}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#5B532C]/50">
                    <Video className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No success stories found.</p>
                  </div>
                )}
              </div>
            </div>


            {/* ══════════ PRACTICAL FARMING TIPS ══════════ */}
            <div className="bg-white rounded-2xl border border-[#5B532C]/10 overflow-hidden">
              <div className="px-6 py-5 border-b border-[#5B532C]/10">
                <h3 className="text-lg font-bold text-[#5B532C]">Practical Farming Tips</h3>
                <p className="text-sm text-[#5B532C]/50 mt-1">Actionable advice that complements your analysis above</p>
              </div>

              <div className="p-6">
                {insightsLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 rounded-full border-3 border-[#63A361]/20 border-t-[#63A361] animate-spin mx-auto mb-3" />
                    <p className="text-sm text-[#5B532C]/50">Generating practical tips...</p>
                  </div>
                ) : insightsData?.guide ? (
                  <div>
                    {/* Introduction */}
                    {insightsData.guide.introduction && (
                      <p className="text-sm text-[#5B532C]/70 leading-relaxed mb-5 pb-5 border-b border-[#5B532C]/8">
                        {insightsData.guide.introduction}
                      </p>
                    )}

                    {/* Grid of Tip Cards */}
                    <div className="grid lg:grid-cols-2 gap-4">
                      {insightsData.guide.sections?.map((section, idx) => {
                        const IconComp = sectionIcons[section.icon] || Lightbulb

                        return (
                          <div key={idx} className="flex flex-col p-5 rounded-2xl bg-white shadow-sm border border-[#5B532C]/10 hover:shadow-md transition-shadow relative overflow-hidden group">
                            {/* Decorative background element inspired by landing page */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#63A361]/5 rounded-bl-[100px] pointer-events-none transition-transform group-hover:scale-110" />

                            <div className="flex items-center gap-3 mb-3 relative z-10">
                              <div className="w-10 h-10 rounded-xl bg-[#63A361]/10 flex items-center justify-center flex-shrink-0">
                                <IconComp className="w-5 h-5 text-[#63A361]" />
                              </div>
                              <h4 className="text-base font-bold text-[#5B532C]">{section.heading}</h4>
                            </div>

                            <p className="text-sm text-[#5B532C]/70 leading-relaxed mb-4 relative z-10 flex-grow">
                              {section.content}
                            </p>

                            {section.tips?.length > 0 && (
                              <div className="mt-auto pt-3 border-t border-[#5B532C]/5 space-y-2 relative z-10">
                                {section.tips.map((tip: string, tipIdx: number) => (
                                  <div key={tipIdx} className="flex items-start gap-2">
                                    <div className="mt-0.5 w-3.5 h-3.5 rounded-full bg-[#FFC50F]/20 flex items-center justify-center flex-shrink-0">
                                      <div className="w-1.5 h-1.5 rounded-full bg-[#FFC50F]" />
                                    </div>
                                    <span className="text-xs font-medium text-[#5B532C]/80">{tip}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                  </div>
                ) : (
                  <div className="text-center py-8 text-[#5B532C]/50">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Loading farming tips...</p>
                  </div>
                )}
              </div>
            </div>

          </motion.div>
        )}
      </div>
    </div>
  )
}

export default SmartFarming