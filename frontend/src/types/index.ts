// Translation types removed - using direct text instead

// Monitoring Types
export type MonitoringType = 'crop' | 'soil' | 'thermal' | 'field';

export interface EnvironmentalFactor {
  factor: string;
  status: 'optimal' | 'warning' | 'critical';
}

// Crop Monitoring Result
export interface CropMonitoringResult {
  cropType: string;
  diseaseDetected: string;
  diseaseSeverity: 'none' | 'mild' | 'moderate' | 'severe';
  pestInfestation: string;
  pestSeverity: 'none' | 'low' | 'medium' | 'high';
  nutrientDeficiency: string;
  cropHealth: 'excellent' | 'good' | 'fair' | 'poor';
  affectedArea: number;
  environmentalFactors: EnvironmentalFactor[];
  realTimeMetrics: {
    healthScore: number;
    stressLevel: number;
    yieldImpact: number;
  };
  treatmentRecommendations: string[];
  preventiveMeasures: string[];
  confidenceLevel: number;
  analysisSummary: string;
}

// Soil Monitoring Result
export interface SoilMonitoringResult {
  soilType: string;
  texture: 'fine' | 'medium' | 'coarse';
  colorDescription: string;
  moistureLevel: 'low' | 'medium' | 'high';
  fertilityEstimate: 'low' | 'medium' | 'high';
  erosionRisk: 'low' | 'medium' | 'high';
  salinityIssue: 'none' | 'suspected' | 'evident';
  compositionNotes: string;
  environmentalFactors: EnvironmentalFactor[];
  realTimeMetrics: {
    moisturePercentage: number;
    organicMatterIndicator: number;
    pHEstimate: number;
  };
  improvementSuggestions: string[];
  preventionMeasures: string[];
  confidenceLevel: number;
  analysisSummary: string;
}

// Thermal Monitoring Result
export interface ThermalMonitoringResult {
  temperatureRange: string;
  hotSpots: number;
  coldSpots: number;
  waterStressZones: 'low' | 'medium' | 'high';
  irrigationLeaks: 'none' | 'suspected' | 'evident';
  temperatureVariations: string;
  cropHealthImpact: string;
  environmentalFactors: EnvironmentalFactor[];
  realTimeMetrics: {
    averageTemperature: number;
    maxTemperature: number;
    minTemperature: number;
    stressIndex: number;
  };
  mitigationStrategies: string[];
  monitoringRecommendations: string[];
  confidenceLevel: number;
  analysisSummary: string;
}

// Field Monitoring Result
export interface FieldMonitoringResult {
  cropGrowthStage: string;
  weedDensity: 'low' | 'medium' | 'high';
  yieldPrediction: string;
  fieldUniformity: 'uniform' | 'patchy' | 'irregular';
  visibleIssues: string;
  vegetationIndex: number;
  environmentalFactors: EnvironmentalFactor[];
  realTimeMetrics: {
    coveragePercentage: number;
    weedCoverage: number;
    bareSoil: number;
  };
  precisionFarmingTips: string[];
  interventionPlans: string[];
  confidenceLevel: number;
  analysisSummary: string;
}

// Union type for all monitoring results
export type MonitoringResult = 
  | CropMonitoringResult 
  | SoilMonitoringResult 
  | ThermalMonitoringResult 
  | FieldMonitoringResult;