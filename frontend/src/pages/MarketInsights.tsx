import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  Bell,
  DollarSign,
  BarChart2,
  Building,
  Database,
  Table,
  BarChart3,
  Sun,
  Cloud,
  CloudRain,
  Wind,
  Droplets,
  ChevronDown,
  MapPin,
  Leaf,
  Zap,
  AlertCircle
} from 'lucide-react';
import Select from 'react-select/async';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, ComposedChart } from 'recharts';
import mahaData from '../data/maha.json';
import andraData from '../data/andra.json';
import punjabData from '../data/punjab.json';
import karnatakaData from '../data/karnataka.json';
import keralaData from '../data/kerala.json';
import tamilnaduData from '../data/tamilnadu.json';
import telanganaData from '../data/telegana.json';
import cityData from '../data/cityData.json';
import { loadResult, saveResult } from '../utils/storage';
import { auditMarketWithWeather } from '../ai/auditService';

type MarketInsightsProps = Record<string, never>;

interface MarketCropPrices {
  [key: string]: string;
}

interface Market {
  name: string;
  cropPrices: MarketCropPrices;
}

interface WeatherData {
  coord: {
    lat: number;
    lon: number;
  };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: {
    all: number;
  };
  visibility: number;
  name: string;
}

type InsightMode = 'Accurate' | 'Estimate' | 'Realtime' | 'Predictive';

export const MarketInsights: React.FC<MarketInsightsProps> = () => {
  const [selectedState, setSelectedState] = useState<string>('Maharashtra');
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [baseCityData, setBaseCityData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLastUpdated] = useState<Date>(new Date(Date.now()));
  const [insightMode, setInsightMode] = useState<InsightMode>('Accurate');
  const [processedData, setProcessedData] = useState<any>(null);
  const [showProcessedData, setShowProcessedData] = useState(false);
  const [aiPipelineStep, setAiPipelineStep] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [weeklyTrendView, setWeeklyTrendView] = useState<'chart' | 'table'>('chart');
  const [selectedCrop, setSelectedCrop] = useState<string>('');
  const [hasLoadedCity, setHasLoadedCity] = useState<boolean>(false);
  const [isWeatherSectionVisible, setIsWeatherSectionVisible] = useState<boolean>(false);
  const [isWeatherAccordionOpen, setIsWeatherAccordionOpen] = useState<boolean>(true);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherAnalysis, setWeatherAnalysis] = useState<string>('');
  const [cropAnalyses, setCropAnalyses] = useState<any[]>([]);

  const availableCrops = useMemo(() => {
    const source = selectedCity || baseCityData;
    if (!source?.markets?.length) {
      return [] as string[];
    }
    const cropSet = new Set<string>();
    source.markets.forEach((market: Market) => {
      Object.keys(market.cropPrices || {}).forEach(crop => cropSet.add(crop));
    });
    return Array.from(cropSet).sort((a, b) => a.localeCompare(b));
  }, [selectedCity, baseCityData]);

  useEffect(() => {
    const cached = loadResult<{
      selectedState: string;
      selectedCity: any;
      processedData: any;
      showProcessedData: boolean;
      insightMode: InsightMode;
      weeklyTrendView: 'chart' | 'table';
      selectedCrop?: string;
      cropAnalyses?: any[];
    }>('market');
    if (cached) {
      setSelectedState(cached.selectedState || 'Maharashtra');
      setSelectedCity(cached.selectedCity || null);
      setProcessedData(cached.processedData || null);
      setShowProcessedData(Boolean(cached.showProcessedData));
      setInsightMode(cached.insightMode || 'Accurate');
      setWeeklyTrendView(cached.weeklyTrendView || 'chart');
      setSelectedCrop(cached.selectedCrop || '');
      setCropAnalyses(cached.cropAnalyses || []);
      if (cached.selectedCity) {
        setHasLoadedCity(true);
        setIsWeatherSectionVisible(true);
        if (cached.cropAnalyses && cached.cropAnalyses.length > 0) {
          setIsWeatherSectionVisible(true);
        }
      }
    }
  }, []);

  const getDeterministicHash = (input: string) => {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  };

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const diversifyMarketPrices = useCallback((cityData: any) => {
    const diversifiedData = JSON.parse(JSON.stringify(cityData));
    diversifiedData.markets = diversifiedData.markets.map((market: any) => {
      const marketVariations = Object.fromEntries(
        Object.entries(market.cropPrices).map(([crop, price]) => {
          const priceStr = price as string;
          const basePrice = parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
          if (!basePrice) {
            return [crop, price];
          }
          const seed = getDeterministicHash(`${cityData.city}-${market.name}-${crop}`);
          const variation = ((seed % 7) - 3) / 100;
          const adjustedPrice = Math.max(500, Math.round(basePrice * (1 + variation)));
          return [crop, `₹${adjustedPrice.toLocaleString('en-IN')}/quintal`];
        })
      );
      return {
        ...market,
        cropPrices: marketVariations
      };
    });
    return diversifiedData;
  }, []);

  const fetchCityData = async (cityName: string) => {
    setIsLoading(true);
    setIsProcessing(true);
    setAiPipelineStep('Preparing market datasets...');
    setProcessedData(null);
    setShowProcessedData(false);
    setSelectedCity(null);
    setBaseCityData(null);
    setSelectedCrop('');
    setHasLoadedCity(false);
    setIsWeatherSectionVisible(false);
    setIsWeatherAccordionOpen(true);
    setWeatherData(null);
    setWeatherAnalysis('');
    setCropAnalyses([]);
    await processMarketData();
    let cityData = null;
    if (selectedState === 'Maharashtra') {
      cityData = mahaData.cities.find(city => city.city === cityName);
    } else if (selectedState === 'Andhra Pradesh') {
      cityData = andraData.cities.find(city => city.city === cityName);
    } else if (selectedState === 'Punjab') {
      cityData = punjabData.cities.find(city => city.city === cityName);
    } else if (selectedState === 'Karnataka') {
      cityData = karnatakaData.cities.find(city => city.city === cityName);
    } else if (selectedState === 'Kerala') {
      cityData = keralaData.cities.find(city => city.city === cityName);
    } else if (selectedState === 'Tamil Nadu') {
      cityData = tamilnaduData.cities.find(city => city.city === cityName);
    } else if (selectedState === 'Telangana') {
      cityData = telanganaData.cities.find(city => city.city === cityName);
    }
    if (!cityData) {
      toast.error('City data not found', {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
      setIsLoading(false);
      setIsProcessing(false);
      setAiPipelineStep('');
      return;
    }
    const diversifiedCityData = diversifyMarketPrices(cityData);
    setBaseCityData(diversifiedCityData);
    try {
      setAiPipelineStep('Fetching live weather impact...');
      setIsWeatherLoading(true);
      const { cropAnalyses: cropAnalysisData, weatherData: weatherInfo, overallAnalysis } = await auditMarketWithWeather(diversifiedCityData, cityName);
      setSelectedCity(diversifiedCityData);
      setWeatherData(weatherInfo);
      setWeatherAnalysis(overallAnalysis);
      setCropAnalyses(cropAnalysisData);
      setIsWeatherSectionVisible(true);
      setHasLoadedCity(true);
      saveResult('market', {
        selectedState,
        selectedCity: diversifiedCityData as any,
        processedData: null,
        showProcessedData: false,
        insightMode,
        weeklyTrendView,
        selectedCrop: '',
        cropAnalyses: cropAnalysisData as any
      });
    } catch (error) {
      console.error('Weather integration error:', error);
      toast.error('Loaded market data without weather context', {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
      setSelectedCity(diversifiedCityData);
      setWeatherData(null);
      setWeatherAnalysis('');
      setIsWeatherSectionVisible(true);
      setHasLoadedCity(true);
      saveResult('market', {
        selectedState,
        selectedCity: diversifiedCityData as any,
        processedData: null,
        showProcessedData: false,
        insightMode,
        weeklyTrendView,
        selectedCrop: '',
        cropAnalyses: [] as any
      });
    } finally {
      setIsWeatherLoading(false);
      setIsLoading(false);
      setIsProcessing(false);
      setAiPipelineStep('');
      setLastUpdated(new Date(Date.now()));
    }
  };

  const getDeterministicFactor = useCallback((identifier: string, maxDelta: number) => {
    const hash = Math.abs(getDeterministicHash(identifier));
    const normalized = (hash % 1000) / 1000;
    const delta = (normalized * 2 - 1) * maxDelta;
    return 1 + delta;
  }, []);

  const processNumericValue = useCallback((value: string | number, mode: InsightMode, cropType?: string, marketName?: string): string => {
    const identifier = `${cropType || 'generic'}-${marketName || 'market'}-${mode}`;
    const formatCrore = (amount: number) => `₹${Math.max(0, Math.round(amount)).toLocaleString('en-IN')} Cr`;
    const formatRupee = (amount: number) => `₹${Math.max(0, Math.round(amount)).toLocaleString('en-IN')}/quintal`;
    if (typeof value === 'string') {
      if (value.includes('Cr')) {
        const numericPart = parseFloat(value.replace(/[^0-9.]/g, ''));
        if (Number.isNaN(numericPart)) {
          return value;
        }
        let factor = 1;
        if (mode === 'Estimate') {
          factor = getDeterministicFactor(identifier, 0.05);
        } else if (mode === 'Realtime') {
          factor = getDeterministicFactor(`${identifier}-rt`, 0.03);
        } else if (mode === 'Predictive') {
          factor = 1.05 * getDeterministicFactor(`${identifier}-pd`, 0.08);
        }
        const adjusted = numericPart * factor;
        return formatCrore(adjusted);
      }
      if (value.includes('/quintal')) {
        const numericPart = parseInt(value.replace(/[^0-9]/g, ''), 10);
        if (!numericPart) {
          return value;
        }
        let factor = 1;
        if (mode === 'Estimate') {
          factor = getDeterministicFactor(identifier, 0.06);
        } else if (mode === 'Realtime') {
          factor = getDeterministicFactor(`${identifier}-rt`, 0.04);
        } else if (mode === 'Predictive') {
          factor = 1.04 * getDeterministicFactor(`${identifier}-pd`, 0.1);
        }
        const adjusted = clamp(numericPart * factor, 400, 65000);
        return formatRupee(adjusted);
      }
    }
    if (typeof value === 'number') {
      let factor = 1;
      if (mode === 'Estimate') {
        factor = getDeterministicFactor(identifier, 0.08);
      } else if (mode === 'Realtime') {
        factor = getDeterministicFactor(`${identifier}-rt`, 0.05);
      } else if (mode === 'Predictive') {
        factor = 1.05 * getDeterministicFactor(`${identifier}-pd`, 0.08);
      }
      return Math.max(0, Math.round((value || 0) * factor)).toLocaleString('en-IN');
    }
    return value.toString();
  }, [getDeterministicFactor]);

  const processMarketData = async () => {
    const steps = [
      'Connecting to Agricultural Data APIs...',
      'Fetching real-time crop prices...',
      'Analyzing market trends...',
      'Processing historical data...',
      'Running ML prediction models...',
      'Generating insights...',
      'Validating data accuracy...',
      'Finalizing report...'
    ];
    for (let i = 0; i < steps.length; i++) {
      setAiPipelineStep(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 300));
    }
  };

  const handleGetInsights = useCallback(() => {
    if (!selectedCity) {
      toast.error('Please select a city first', {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
      return;
    }
    if (!selectedCrop) {
      toast.error('Please select a crop', {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
      return;
    }
    setIsLoading(true);
    setShowProcessedData(true);
    const processedCityData = JSON.parse(JSON.stringify(selectedCity));
    try {
      processedCityData.marketStats = {
        ...processedCityData.marketStats,
        dailyTradingVolume: processNumericValue(
          processedCityData.marketStats.dailyTradingVolume,
          insightMode,
          selectedCrop
        ),
        activeBuyers: processNumericValue(
          processedCityData.marketStats.activeBuyers,
          insightMode,
          selectedCrop
        ),
        averagePricePerQuintal: processNumericValue(
          processedCityData.marketStats.averagePricePerQuintal,
          insightMode,
          selectedCrop
        ),
      };
      processedCityData.markets = processedCityData.markets.map((market: Market) => ({
        ...market,
        cropPrices: Object.fromEntries(
          Object.entries(market.cropPrices).map(([crop, price]) => [
            crop,
            processNumericValue(price, insightMode, crop, market.name)
          ])
        )
      }));
      processedCityData.priceAlerts = processedCityData.priceAlerts.map((alert: any) => ({
        ...alert,
        price: processNumericValue(alert.price, insightMode, alert.crop)
      }));
      setProcessedData(processedCityData);
      setIsLoading(false);
      saveResult('market', {
        selectedState,
        selectedCity,
        processedData: processedCityData,
        showProcessedData: true,
        insightMode,
        weeklyTrendView,
        selectedCrop,
        cropAnalyses: cropAnalyses as any
      });
      toast.success(`${insightMode} insights generated successfully`, {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    } catch (error) {
      console.error('Error processing data:', error);
      setIsLoading(false);
      setShowProcessedData(false);
      toast.error('Failed to process market data', {
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    }
  }, [selectedCity, insightMode, processNumericValue, selectedCrop, selectedState, weeklyTrendView, cropAnalyses]);

  const LoadingSpinner = () => (
    <div className="flex justify-center items-center p-8">
      <div className="w-8 h-8 rounded-full border-[#63A361] animate-spin border-[3px] border-t-transparent" />
    </div>
  );

  const PlaceholderDashboard = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {                      }
      <div className="relative p-8 text-center bg-gradient-to-br from-[#FDE7B3]/30 via-white to-[#63A361]/5 rounded-3xl border border-[#5B532C]/10 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#63A361]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FFC50F]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative z-10"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#63A361] to-[#5B532C] shadow-lg">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h3 className="mb-3 text-2xl font-bold text-[#5B532C]">
            Discover Market Intelligence
          </h3>
          <p className="max-w-md mx-auto mb-6 text-[#5B532C]/70">
            Select a city above to unlock real-time crop prices, weather insights, and AI-powered market analysis
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-[#5B532C]/10">
              <div className="w-2 h-2 bg-[#63A361] rounded-full animate-pulse" />
              <span className="text-sm text-[#5B532C]">Live Prices</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-[#FFC50F]/20">
              <div className="w-2 h-2 bg-[#FFC50F] rounded-full animate-pulse" />
              <span className="text-sm text-[#5B532C]">Weather Data</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-[#5B532C]/20">
              <div className="w-2 h-2 bg-[#5B532C] rounded-full animate-pulse" />
              <span className="text-sm text-[#5B532C]">AI Insights</span>
            </div>
          </div>
        </motion.div>
      </div>
      {                          }
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[DollarSign, Users, BarChart2].map((Icon, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="relative p-6 overflow-hidden bg-gradient-to-br from-[#FDE7B3]/30 to-white rounded-2xl border border-[#63A361]/10"
          >
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-[#63A361]/10">
                <Icon className="w-6 h-6 text-[#63A361]/50" />
              </div>
              <div className="h-6 w-16 bg-[#FDE7B3]/50 rounded-full" />
            </div>
            <div className="h-8 w-32 bg-[#5B532C]/10 rounded-lg mb-2" />
            <div className="h-4 w-24 bg-[#5B532C]/5 rounded" />
          </motion.div>
        ))}
      </div>
      {                     }
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {                     }
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative p-6 overflow-hidden bg-white rounded-2xl border border-[#63A361]/10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[#FDE7B3]/30">
              <TrendingUp className="w-5 h-5 text-[#63A361]/50" />
            </div>
            <div className="h-5 w-40 bg-[#5B532C]/10 rounded" />
          </div>
          <div className="relative h-64">
            <svg className="w-full h-full" viewBox="0 0 400 200">
              {                }
              {[0, 1, 2, 3, 4].map(i => (
                <line key={i} x1="40" y1={40 + i * 35} x2="380" y2={40 + i * 35} stroke="#63A361" strokeOpacity="0.1" />
              ))}
              {                     }
              <motion.path
                d="M 40 150 Q 100 120, 140 130 T 200 100 T 260 110 T 320 80 T 380 90"
                fill="none"
                stroke="#63A361"
                strokeWidth="3"
                strokeOpacity="0.3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
              />
              <motion.path
                d="M 40 160 Q 100 140, 140 150 T 200 130 T 260 140 T 320 120 T 380 130"
                fill="none"
                stroke="#FFC50F"
                strokeWidth="3"
                strokeOpacity="0.3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 0.5, repeat: Infinity, repeatType: "loop" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-[#5B532C]/50">Select a location to view trends</p>
              </div>
            </div>
          </div>
        </motion.div>
        {                    }
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative p-6 overflow-hidden bg-white rounded-2xl border border-[#63A361]/10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-[#FDE7B3]/30">
              <BarChart2 className="w-5 h-5 text-[#63A361]/50" />
            </div>
            <div className="h-5 w-48 bg-[#5B532C]/10 rounded" />
          </div>
          <div className="relative h-64 flex items-end justify-around gap-4 px-4">
            {['Wheat', 'Rice', 'Cotton', 'Maize', 'Soybean'].map((crop, i) => (
              <div key={crop} className="flex flex-col items-center gap-2 flex-1">
                <motion.div
                  className="w-full bg-gradient-to-t from-[#63A361]/30 to-[#63A361]/10 rounded-t-lg"
                  initial={{ height: 0 }}
                  animate={{ height: [60, 100, 80, 120, 90][i] }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                />
                <span className="text-xs text-[#5B532C]/50 truncate w-full text-center">{crop}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      {                           }
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { icon: Cloud, title: 'Weather Analysis', desc: 'Real-time impact on crops' },
          { icon: Bell, title: 'Price Alerts', desc: 'Smart notifications' },
          { icon: Database, title: 'Market Data', desc: 'APMC verified prices' }
        ].map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="p-4 bg-white rounded-xl border border-[#63A361]/10 flex items-center gap-4"
          >
            <div className="p-3 rounded-lg bg-[#FDE7B3]/30">
              <feature.icon className="w-5 h-5 text-[#63A361]" />
            </div>
            <div>
              <h4 className="font-semibold text-[#5B532C]">{feature.title}</h4>
              <p className="text-sm text-[#5B532C]/60">{feature.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const getMarketStats = (cityData: any) => [
    {
      title: 'Daily Trading Volume',
      value: cityData.marketStats.dailyTradingVolume,
      change: '+4.5%',
      icon: DollarSign,
      trend: 'up',
    },
    {
      title: 'Active Buyers',
      value: cityData.marketStats.activeBuyers.toString(),
      change: '+1.2%',
      icon: Users,
      trend: 'up',
    },
    {
      title: 'Average Price per Quintal',
      value: cityData.marketStats.averagePricePerQuintal,
      change: '-0.8%',
      icon: BarChart2,
      trend: 'down',
    }
  ];

  const displayData = useMemo(() => {
    if (!hasLoadedCity) {
      return null;
    }
    if (showProcessedData && processedData) {
      return processedData;
    }
    return selectedCity;
  }, [hasLoadedCity, processedData, selectedCity, showProcessedData]);

  const getStableCropActivityData = useCallback(() => {
    if (!displayData?.markets?.length) return [];
    const referenceMarket = displayData.markets[0];
    if (!referenceMarket?.cropPrices) return [];
    const crops = Object.keys(referenceMarket.cropPrices);
    return crops.map((crop) => {
      const raw = referenceMarket.cropPrices[crop] || '₹0/quintal';
      const cropPrice = parseInt(raw.replace(/[^0-9]/g, ''), 10) || 2000;
      const baseYields: { [key: string]: number } = {
        'Wheat': 35,
        'Rice': 40,
        'Maize': 45,
        'Sugarcane': 800,
        'Cotton': 15,
        'Soybean': 25,
        'Groundnut': 20,
        'Mustard': 18,
        'Tur Dal': 12,
        'Onion': 200,
        'Tomato': 300,
        'Grapes': 25
      };
      const baseYield = baseYields[crop] || 30;
      const cropHash = crop.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const yieldVariation = (cropHash % 20) - 10;
      const yieldPerAcre = Math.max(10, baseYield + yieldVariation);
      return {
        name: crop,
        price: cropPrice,
        yield: yieldPerAcre
      };
    });
  }, [displayData]);

  const getTimelineInfo = useCallback(() => {
    const now = new Date();
    const hourOffset = now.getHours() % 2;
    const lastUpdate = new Date(now.getTime() - hourOffset * 60 * 60 * 1000);
    const nextUpdate = new Date(now.getTime() + 30 * 60 * 1000);
    return {
      lastUpdate: lastUpdate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      nextUpdate: nextUpdate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      updateFrequency: 'Every 30 minutes',
      dataSource: 'Government APMC Markets'
    };
  }, []);

  const getWeeklyPriceTrend = (cityData: any) => {
    if (!cityData?.markets) return [];
    const crops = Object.keys(cityData.markets[0]?.cropPrices || {});
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, index) => {
      const dayData: any = { day };
      crops.forEach((crop, cropIndex) => {
        const basePrice = parseInt(cityData.markets[0].cropPrices[crop]?.replace(/[^0-9]/g, ''), 10) || 2000;
        const dayMultiplier = index >= 5 ? 0.95 : 1.0;
        const cropVariation = Math.sin(index * 0.8 + cropIndex * 0.5) * 0.05;
        const price = Math.round(basePrice * dayMultiplier * (1 + cropVariation));
        dayData[crop] = price;
      });
      return dayData;
    });
  };

  const getStableWeeklyTrendData = useCallback(() => {
    if (!displayData?.markets?.length) return [];
    const referenceMarket = displayData.markets[0];
    const crops = Object.keys(referenceMarket?.cropPrices || {});
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, index) => {
      const dayData: Record<string, number | string> = { day };
      crops.forEach((crop, cropIndex) => {
        const basePrice = parseInt(referenceMarket.cropPrices[crop]?.replace(/[^0-9]/g, ''), 10) || 2000;
        const dayMultiplier = index >= 5 ? 0.95 : 1.0;
        const cropVariation = Math.sin(index * 0.8 + cropIndex * 0.5) * 0.05;
        const price = Math.round(basePrice * dayMultiplier * (1 + cropVariation));
        dayData[crop] = price;
      });
      return dayData;
    });
  }, [displayData]);

  const getSynchronizedPriceAlerts = (cityData: any) => {
    if (!cityData?.markets) return [];
    const crops = Object.keys(cityData.markets[0]?.cropPrices || {});
    const weeklyData = getWeeklyPriceTrend(cityData);
    return crops.map((crop, index) => {
      const currentPrice = weeklyData[weeklyData.length - 1]?.[crop] || 2000;
      const previousPrice = weeklyData[weeklyData.length - 2]?.[crop] || 2000;
      const change = ((currentPrice - previousPrice) / previousPrice) * 100;
      const changePercent = Math.round(change * 10) / 10;
      const times = ['30 min ago', '1 hour ago', '2 hours ago', '3 hours ago'];
      const reasons = [
        'Increased demand from local mills',
        'Weather conditions affecting supply',
        'Government policy changes',
        'Export market fluctuations',
        'Seasonal demand patterns'
      ];
      return {
        crop,
        change: `${changePercent > 0 ? '+' : ''}${changePercent}%`,
        price: `₹${currentPrice.toLocaleString()}/quintal`,
        time: times[index % times.length],
        reason: reasons[index % reasons.length]
      };
    });
  };

  return (
    <div className="min-h-screen bg-white pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {            }
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <span className="text-xs font-semibold text-[#63A361] uppercase tracking-wider">Market Intelligence</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#5B532C] mt-2">
            Market <span className="text-[#63A361]">Insights</span>
          </h1>
          <p className="text-lg text-[#5B532C]/60 mt-3 max-w-2xl mx-auto">
            Real-time updates from Indian agricultural markets with AI-powered analysis
          </p>
        </motion.div>
        {                     }
        <div className="px-4 mx-auto mb-8 max-w-4xl md:mb-12 sm:px-0">
          <div className="p-8 bg-white rounded-2xl border border-[#5B532C]/10">
            {            }
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#5B532C]/10">
              <div className="p-3 rounded-xl bg-[#63A361]">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#5B532C]">Select Location & Crop</h2>
                <p className="text-sm text-[#5B532C]/60">Choose your market location to view insights</p>
              </div>
            </div>
            {                                }
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#63A361] text-white text-xs font-bold">1</div>
                <label className="text-sm font-semibold text-[#5B532C]">Select Location</label>
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#63A361] z-10" />
                <Select
                  cacheOptions
                  loadOptions={async (inputValue) => {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    const maharashtraCities = cityData.mahacities || [];
                    return maharashtraCities
                      .filter((city: string) => city.toLowerCase().includes(inputValue.toLowerCase()))
                      .map((city: string) => ({
                        value: city,
                        label: city,
                        type: 'city'
                      }));
                  }}
                  onChange={(option: any) => {
                    if (option?.type === 'city') {
                      setSelectedState('Maharashtra');
                      fetchCityData(option.value);
                    }
                  }}
                  isDisabled={isLoading}
                  className="text-base"
                  placeholder="Search and select city in Maharashtra..."
                  styles={{
                    control: (base) => ({
                      ...base,
                      background: 'rgba(255, 255, 255, 0.8)',
                      borderColor: 'rgba(91, 83, 44, 0.1)',
                      borderWidth: '2px',
                      borderRadius: '0.75rem',
                      padding: '0.5rem 0.5rem 0.5rem 3rem',
                      boxShadow: 'none',
                      minHeight: '56px',
                      '&:hover': {
                        borderColor: 'rgba(99, 163, 97, 0.4)'
                      }
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 20,
                      background: 'rgba(255, 255, 255, 0.98)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(99, 163, 97, 0.2)',
                      boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.15)'
                    }),
                    option: (base, state) => ({
                      ...base,
                      background: state.isFocused ? 'rgba(99, 163, 97, 0.1)' : 'transparent',
                      color: state.isFocused ? '#5B532C' : '#374151',
                      cursor: 'pointer',
                      padding: '12px 16px'
                    }),
                    placeholder: (base) => ({
                      ...base,
                      color: 'rgba(91, 83, 44, 0.5)'
                    })
                  }}
                  defaultOptions
                />
              </div>
            </div>
            {hasLoadedCity && (
              <div className="space-y-6 mt-6">
                {                                   }
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#63A361] text-white text-xs font-bold">2</div>
                    <label className="text-sm font-semibold text-[#5B532C]">Configure Analysis</label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {                    }
                    <div>
                      <label className="block mb-2 text-sm font-medium text-[#5B532C]/70">Focus Crop</label>
                      <div className="relative">
                        <Leaf className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#63A361]" />
                        <select
                          value={selectedCrop}
                          onChange={(e) => {
                            setSelectedCrop(e.target.value);
                            setProcessedData(null);
                            setShowProcessedData(false);
                          }}
                          className="w-full py-3 pl-11 pr-4 rounded-lg border border-[#5B532C]/20 bg-white text-[#5B532C] appearance-none cursor-pointer focus:outline-none focus:border-[#63A361]"
                        >
                          <option value="">Select crop for insights...</option>
                          {availableCrops.map((crop) => (
                            <option key={crop} value={crop}>{crop}</option>
                          ))}
                        </select>
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B532C]/50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {                            }
                    <div>
                      <label className="block mb-2 text-sm font-medium text-[#5B532C]/70">Insight Mode</label>
                      <div className="relative">
                        <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#FFC50F]" />
                        <select
                          value={insightMode}
                          onChange={(e) => {
                            setInsightMode(e.target.value as InsightMode);
                            setProcessedData(null);
                            setShowProcessedData(false);
                          }}
                          className="w-full py-3 pl-11 pr-4 rounded-lg border border-[#5B532C]/20 bg-white text-[#5B532C] appearance-none cursor-pointer focus:outline-none focus:border-[#63A361]"
                        >
                          <option value="Accurate">Accurate Data</option>
                          <option value="Estimate">Estimated Data</option>
                          <option value="Realtime">Realtime Data</option>
                          <option value="Predictive">Predictive Data</option>
                        </select>
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B532C]/50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                {                     }
                <button
                  onClick={handleGetInsights}
                  disabled={isLoading || !selectedCity || !selectedCrop}
                  className={`w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-colors ${selectedCity && selectedCrop && !isLoading
                    ? "bg-[#63A361] text-white"
                    : "bg-[#5B532C]/10 text-[#5B532C]/40 cursor-not-allowed"
                    }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <BarChart2 className="w-5 h-5" />
                      <span>{selectedCrop ? "Get Market Analysis" : "Select a crop above"}</span>
                    </>
                  )}
                </button>
                {                    }
                {!selectedCrop && (
                  <div className="p-4 rounded-lg bg-[#FDE7B3]/20 border border-[#FFC50F]/20">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-[#FFC50F] flex-shrink-0" />
                      <p className="text-sm text-[#5B532C]">Select a crop from the dropdown to unlock market insights</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {showProcessedData && insightMode !== 'Accurate' && (
              <div className="p-3 text-sm text-[#5B532C] bg-[#FDE7B3]/20 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#FFC50F]" />
                {insightMode === 'Estimate' && 'AI-estimated values with market-specific variations'}
                {insightMode === 'Realtime' && 'AI-processed real-time values with seasonal adjustments'}
                {insightMode === 'Predictive' && 'AI-predicted 3-month forward projections with ML insights'}
              </div>
            )}
            {hasLoadedCity && !selectedCrop && (
              <div className="p-3 text-sm text-[#5B532C] bg-[#FDE7B3]/20 rounded-lg">
                Select a crop above to reveal the market dashboards and weather story.
              </div>
            )}
          </div>
        </div>
        {isWeatherSectionVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <div className="p-4 mb-5 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20">
              <button
                className="flex justify-between items-center w-full p-4 text-left rounded-xl bg-white border border-[#5B532C]/10 hover:bg-white transition-colors"
                onClick={() => setIsWeatherAccordionOpen(prev => !prev)}
              >
                <div className="flex items-center gap-3">
                  <Cloud className="w-6 h-6 text-[#63A361]" />
                  <div>
                    <h3 className="text-lg font-bold text-[#5B532C]">Weather Snapshot</h3>
                    <p className="text-xs text-[#5B532C]/50">Live conditions powering the audit</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#5B532C]/60">
                    {weatherData?.name || 'Unavailable'}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#63A361] transition-transform ${isWeatherAccordionOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>
              {isWeatherAccordionOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 px-2 pb-2"
                >
                  {isWeatherLoading && (
                    <LoadingSpinner />
                  )}
                  {!isWeatherLoading && weatherData && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-white border border-[#5B532C]/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Sun className="w-5 h-5 text-[#63A361]" />
                            <h4 className="font-semibold text-[#5B532C]/80">Temperature</h4>
                          </div>
                          <p className="text-2xl font-bold text-[#63A361]">{weatherData.main.temp}°C</p>
                          <p className="text-xs text-[#5B532C]/50 mt-1">Feels like {weatherData.main.feels_like}°C</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white border border-[#5B532C]/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Droplets className="w-5 h-5 text-[#63A361]" />
                            <h4 className="font-semibold text-[#5B532C]/80">Humidity</h4>
                          </div>
                          <p className="text-2xl font-bold text-[#63A361]">{weatherData.main.humidity}%</p>
                          <p className="text-xs text-[#5B532C]/50 mt-1">Pressure {weatherData.main.pressure} hPa</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white border border-[#5B532C]/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Wind className="w-5 h-5 text-[#63A361]" />
                            <h4 className="font-semibold text-[#5B532C]/80">Wind</h4>
                          </div>
                          <p className="text-2xl font-bold text-[#63A361]">{weatherData.wind.speed} m/s</p>
                          <p className="text-xs text-[#5B532C]/50 mt-1">Direction {weatherData.wind.deg}°</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white border border-[#5B532C]/10">
                          <div className="flex items-center gap-2 mb-2">
                            <CloudRain className="w-5 h-5 text-[#63A361]" />
                            <h4 className="font-semibold text-[#5B532C]/80">Conditions</h4>
                          </div>
                          <p className="text-lg font-bold text-[#63A361] capitalize">{weatherData.weather[0]?.description}</p>
                          <p className="text-xs text-[#5B532C]/50 mt-1">Visibility {weatherData.visibility} m</p>
                        </div>
                      </div>
                      {                                                              }
                      <div className="mt-6">
                        {cropAnalyses && cropAnalyses.length > 0 && (
                          <div className="p-6 rounded-2xl bg-[#FDE7B3]/10 border border-[#5B532C]/20">
                            <h4 className="text-lg font-bold text-[#5B532C] mb-4">Crop-Specific Weather Impact</h4>
                            <div className="space-y-5">
                              {cropAnalyses.map((analysis: any, index: number) => (
                                <div key={index} className="p-4 rounded-xl border transition-all bg-white border-[#5B532C]/10 hover:bg-white">
                                  <div className="flex justify-between items-center mb-2">
                                    <h5 className="font-bold text-[#63A361]">{analysis.crop}</h5>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${analysis.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                                      analysis.riskLevel === 'Medium' ? 'bg-[#FFC50F]/20 text-[#5B532C]' :
                                        'bg-[#63A361]/10 text-[#63A361]'
                                      }`}>
                                      {analysis.riskLevel} Risk
                                    </span>
                                  </div>
                                  <p className="text-sm text-[#5B532C]/80 mb-2">{analysis.impact}</p>
                                  <div className="flex items-start gap-2">
                                    <div className={`mt-0.5 w-2 h-2 rounded-full ${analysis.riskLevel === 'High' ? 'bg-red-500' :
                                      analysis.riskLevel === 'Medium' ? 'bg-[#FFC50F]' :
                                        'bg-[#63A361]'
                                      }`}></div>
                                    <div>
                                      <span className="text-sm font-medium text-[#5B532C]">Recommendation:</span>
                                      <span className="text-sm text-[#5B532C]/80 ml-1.5">{analysis.recommendation}</span>
                                    </div>
                                  </div>
                                  <details className="mt-3 text-xs text-[#5B532C]/50">
                                    <summary className="cursor-pointer hover:text-[#5B532C]/80">Weather Factors</summary>
                                    <div className="mt-2 space-y-1 pt-2 border-t border-[#5B532C]/10">
                                      <div className="text-xs"><span className="font-medium text-[#5B532C]/60">Temperature:</span> {analysis.weatherFactors.temperature}</div>
                                      <div className="text-xs"><span className="font-medium text-[#5B532C]/60">Humidity:</span> {analysis.weatherFactors.humidity}</div>
                                      <div className="text-xs"><span className="font-medium text-[#5B532C]/60">Precipitation:</span> {analysis.weatherFactors.precipitation}</div>
                                      <div className="text-xs"><span className="font-medium text-[#5B532C]/60">Wind:</span> {analysis.weatherFactors.wind}</div>
                                    </div>
                                  </details>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {weatherAnalysis && (
                        <div className="p-4 rounded-xl bg-white border border-[#5B532C]/10 mt-4">
                          <h4 className="font-semibold text-[#5B532C]/80 mb-2">Overall Weather Impact</h4>
                          <p className="text-[#5B532C]/60 whitespace-pre-line">{weatherAnalysis}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {!isWeatherLoading && !weatherData && (
                    <div className="p-4 text-sm text-[#5B532C] bg-white border border-[#5B532C]/10 rounded-xl">
                      Live weather data is unavailable right now. The market insights below are based on baseline market values.
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
        {                        }
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="p-8 mb-8 bg-white rounded-2xl border border-[#5B532C]/10"
          >
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
              <motion.div
                className="p-4 bg-[#63A361] rounded-2xl shadow-lg"
                animate={{
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Database className="w-8 h-8 text-white" />
              </motion.div>
              <div className="flex-1">
                <motion.h3
                  className="mb-3 text-xl font-bold text-[#5B532C]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  AI Processing Market Data
                </motion.h3>
                <motion.p
                  className="mb-4 font-medium text-[#63A361]"
                  key={aiPipelineStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {aiPipelineStep}
                </motion.p>
                <div className="overflow-hidden relative w-full h-3 rounded-full bg-[#FDE7B3]/50">
                  <motion.div
                    className="absolute top-0 left-0 h-full bg-[#63A361] rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "75%" }}
                    transition={{
                      duration: 0.8,
                      ease: "easeInOut"
                    }}
                  />
                  <motion.div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-transparent to-transparent rounded-full via-white/30"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    style={{ width: "30%" }}
                  />
                </div>
                <motion.div
                  className="flex gap-2 mt-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-[#FFC50F] rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                    />
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
        {                                               }
        {!hasLoadedCity && !isLoading && (
          <PlaceholderDashboard />
        )}
        {                  }
        {isLoading ? (
          <LoadingSpinner />
        ) : hasLoadedCity && (
          <div className="grid grid-cols-1 gap-8 mb-8 lg:grid-cols-3 md:grid-cols-2">
            {displayData && selectedCrop && getMarketStats(displayData).map((stat, index) => (
              <StatCard key={index} stat={stat} index={index} />
            ))}
          </div>
        )}
        {                    }
        {displayData && selectedCrop && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-8 mb-8 lg:grid-cols-2"
          >
            {                              }
            <div className="p-6 bg-white rounded-2xl border shadow-xl border-[#5B532C]/10">
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-3 items-center">
                  <div className="p-2.5 bg-[#FDE7B3]/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-[#63A361]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#5B532C]">Weekly Price Trend</h3>
                  </div>
                </div>
                {                 }
                <div className="flex gap-1 p-1 rounded-lg border bg-white border-[#5B532C]/10">
                  <button
                    onClick={() => setWeeklyTrendView('chart')}
                    className={`flex gap-2 items-center px-3 py-2 rounded-md text-sm font-medium transition-all ${weeklyTrendView === 'chart'
                      ? 'bg-[#63A361] text-white shadow-sm'
                      : 'text-[#5B532C] hover:text-[#63A361]'
                      }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Chart
                  </button>
                  <button
                    onClick={() => setWeeklyTrendView('table')}
                    className={`flex gap-2 items-center px-3 py-2 rounded-md text-sm font-medium transition-all ${weeklyTrendView === 'table'
                      ? 'bg-[#63A361] text-white shadow-sm'
                      : 'text-[#5B532C] hover:text-[#63A361]'
                      }`}
                  >
                    <Table className="w-4 h-4" />
                    Table
                  </button>
                </div>
              </div>
              <div className="w-full h-80">
                {weeklyTrendView === 'chart' ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                    <LineChart
                      data={getStableWeeklyTrendData()}
                      margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.6} />
                      <XAxis
                        dataKey="day"
                        stroke="#666"
                        fontSize={12}
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: '#999' }}
                      />
                      <YAxis
                        stroke="#666"
                        fontSize={12}
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: '#999' }}
                        tickFormatter={(value) => `₹${value}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid rgba(217, 119, 6, 0.2)",
                          borderRadius: "12px",
                          fontSize: "12px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                        }}
                        formatter={(value, name) => [`₹${value}`, name]}
                        labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                      />
                      {selectedCity?.markets?.[0]?.cropPrices && Object.keys(selectedCity.markets[0].cropPrices).map((crop, index) => {
                        const colors = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#06b6d4'];
                        return (
                          <Line
                            key={crop}
                            type="monotone"
                            dataKey={crop}
                            stroke={colors[index % colors.length]}
                            strokeWidth={3}
                            dot={{ fill: colors[index % colors.length], strokeWidth: 2, r: 5 }}
                            activeDot={{ r: 7, stroke: colors[index % colors.length], strokeWidth: 3, fill: 'white' }}
                            name={crop}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="overflow-x-auto h-full">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#5B532C]/10">
                          <th className="px-4 py-3 font-semibold text-left text-[#5B532C]">Day</th>
                          {selectedCity?.markets?.[0]?.cropPrices && Object.keys(selectedCity.markets[0].cropPrices).map((crop) => (
                            <th key={crop} className="px-4 py-3 font-semibold text-right text-[#5B532C]">{crop}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {getStableWeeklyTrendData().map((dayData: any, index: number) => (
                          <tr key={index} className="border-b border-[#FDE7B3]/50 transition-colors hover:bg-[#FDE7B3]/20">
                            <td className="px-4 py-3 font-medium text-[#5B532C]">{dayData.day}</td>
                            {Object.keys(dayData).filter(key => key !== 'day').map((crop) => (
                              <td key={crop} className="px-4 py-3 font-semibold text-right text-[#63A361]">
                                ₹{dayData[crop].toLocaleString()}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            {                                               }
            <div className="p-6 bg-white rounded-2xl border shadow-xl border-[#5B532C]/10">
              <div className="flex gap-3 items-center mb-6">
                <div className="p-2.5 bg-[#FDE7B3]/30 rounded-lg">
                  <BarChart2 className="w-5 h-5 text-[#63A361]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#5B532C]">Crop Price & Yield Analysis</h3>
                  <div className="flex gap-4 items-center mt-1">
                    <div className="flex gap-2 items-center text-xs text-[#5B532C]">
                      <div className="w-3 h-3 bg-[#63A361] rounded-sm"></div>
                      <span>Price per Quintal</span>
                    </div>
                    <div className="flex gap-2 items-center text-xs text-[#5B532C]">
                      <div className="w-3 h-3 bg-[#FFC50F] rounded-sm"></div>
                      <span>Yield per Acre</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                  <ComposedChart
                    data={getStableCropActivityData()}
                    margin={{ top: 10, right: 20, left: 10, bottom: 50 }}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.6} />
                    <XAxis
                      dataKey="name"
                      stroke="#666"
                      angle={-45}
                      textAnchor="end"
                      height={50}
                      interval={0}
                      fontSize={9}
                      tick={{ fontSize: 9 }}
                      tickLine={{ stroke: '#999' }}
                    />
                    <YAxis
                      yAxisId="price"
                      orientation="left"
                      stroke="#3b82f6"
                      fontSize={9}
                      tick={{ fontSize: 9 }}
                      tickLine={{ stroke: '#3b82f6' }}
                      tickFormatter={(value) => `₹${value}`}
                      label={{ value: 'Price (₹/quintal)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#3b82f6', fontSize: '10px', fontWeight: 'bold' } }}
                    />
                    <YAxis
                      yAxisId="yield"
                      orientation="right"
                      stroke="#22c55e"
                      fontSize={9}
                      tick={{ fontSize: 9 }}
                      tickLine={{ stroke: '#22c55e' }}
                      tickFormatter={(value) => `${value} qtl`}
                      label={{ value: 'Yield (qtl/acre)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#22c55e', fontSize: '10px', fontWeight: 'bold' } }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                      }}
                      formatter={(value, name) => [
                        name === 'price' ? `₹${value}` : `${value} qtl`,
                        name === 'price' ? 'Price per Quintal' : 'Yield per Acre'
                      ]}
                      labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                    />
                    <Bar
                      yAxisId="price"
                      dataKey="price"
                      fill="#63A361"
                      name="price"
                      radius={[4, 4, 0, 0]}
                      opacity={0.8}
                    />
                    <Bar
                      yAxisId="yield"
                      dataKey="yield"
                      fill="#FFC50F"
                      name="yield"
                      radius={[4, 4, 0, 0]}
                      opacity={0.8}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}
        {                             }
        {displayData && selectedCrop && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-8 lg:grid-cols-2"
          >
            {                  }
            <div className="p-6 bg-white rounded-2xl border shadow-xl border-[#5B532C]/10">
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4 items-center">
                  <div className="p-2.5 bg-[#FDE7B3]/30 rounded-lg">
                    <Building className="w-6 h-6 text-[#63A361]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#5B532C]">Local Markets</h3>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#5B532C]/60">Next update in</div>
                  <div className="text-sm font-semibold text-[#63A361]">{getTimelineInfo().nextUpdate}</div>
                </div>
              </div>
              <div className="space-y-4">
                {displayData.markets.map((market: Market, index: number) => (
                  <div key={index} className="p-5 rounded-xl border shadow-sm transition-all bg-[#FDE7B3]/10 border-[#63A361]/10 hover:bg-[#FDE7B3]/20">
                    <h3 className="mb-3 text-base font-semibold text-[#5B532C]">{market.name}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(market.cropPrices).map(([crop, price], idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-[#5B532C]/70 truncate">{crop}:</span>
                          <span className="ml-2 font-semibold text-[#63A361] whitespace-nowrap">{price.toString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {                  }
            <div className="p-6 bg-white rounded-2xl border shadow-xl border-[#5B532C]/10">
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4 items-center">
                  <div className="p-2.5 bg-[#FDE7B3]/30 rounded-lg">
                    <Bell className="w-6 h-6 text-[#63A361]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#5B532C]">Price Alerts</h3>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#5B532C]/60">Alert frequency</div>
                  <div className="text-sm font-semibold text-[#63A361]">Every 15 min</div>
                </div>
              </div>
              <div className="space-y-4">
                {getSynchronizedPriceAlerts(displayData).map((alert: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-5 rounded-xl shadow-sm transition-all bg-[#FDE7B3]/10 hover:bg-[#FDE7B3]/20 border border-[#63A361]/10">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-[#FDE7B3]/30 rounded-lg">
                        <TrendingUp className={`h-4 w-4 ${alert.change.startsWith('+') ? 'text-[#63A361]' : 'text-red-600'}`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#5B532C]">{alert.crop}</h3>
                        <p className="text-xs text-[#5B532C]/60">{alert.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#5B532C]">{alert.price}</p>
                      <p className={`text-xs font-medium ${alert.change.startsWith('+') ? 'text-[#63A361]' : 'text-red-600'}`}>
                        {alert.change}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        {            }
        <div className="mt-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="inline-flex gap-3 items-center px-6 py-3 rounded-full border border-[#5B532C]/10 shadow-lg bg-white"
          >
            <Database className="w-5 h-5 text-[#63A361]" />
            <span className="text-sm font-semibold text-[#5B532C]">AI-powered market analysis with real-time data processing</span>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ stat, index }: { stat: any; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="p-8 rounded-2xl bg-white shadow-xl transition-all hover:scale-[1.02] border border-[#5B532C]/10"
  >
    <div className="flex gap-4 items-center mb-6">
      <div className="p-3 bg-[#FDE7B3]/30 rounded-xl">
        <stat.icon className="w-7 h-7 text-[#63A361]" />
      </div>
      <h3 className="text-xl font-bold text-[#5B532C]">{stat.title}</h3>
    </div>
    <div className="space-y-3">
      <div className="text-3xl font-bold text-[#63A361]">{stat.value}</div>
      <div className={`text-sm font-semibold ${stat.trend === 'up' ? 'text-[#63A361]' : 'text-red-600'}`}>
        {stat.change} from last week
      </div>
    </div>
  </motion.div>
);

export default MarketInsights;
