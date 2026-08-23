import { generateModernFarmingPrompt } from "./modernFarmingPrompt";

const API_BASE_URL = import.meta.env.PROD 
  ? '/api'
  : 'http://localhost:3000/api';

export interface ModernFarmingRequest {
  technique: string;
  farmSize: string;
  budget: "low" | "medium" | "high";
}

export interface ModernFarmingResponse {
  techniqueAnalysis: {
    overview: {
      name: string;
      estimatedCost: number;
      roi: number;
      successRate: number;
      timeToRoi: string;
      sustainabilityScore: number;
      marketDemand: number;
      profitabilityIndex: number;
      riskLevel: string;
      recommendedCrops: string[];
    };
    costBreakdown: {
      infrastructure: number;
      equipment: number;
      seeds: number;
      labor: number;
      maintenance: number;
      miscellaneous: number;
    };
    marketAnalysis: {
      demandTrend: string;
      priceStability: number;
      competitionLevel: string;
      exportPotential: number;
      localMarketShare: number;
    };
  };
  implementation: {
    phases: Array<{
      name: string;
      duration: string;
      description: string;
      keyMilestones: string[];
      estimatedCost: number;
      priority: string;
      dependencies: string[];
      successMetrics: string[];
    }>;
    timeline: {
      totalDuration: string;
      criticalPath: string[];
      milestoneDates: {
        planningComplete: string;
        infrastructureReady: string;
        firstHarvest: string;
        fullOperation: string;
      };
    };
  };
  metrics: {
    resourceEfficiency: {
      water: number;
      labor: number;
      energy: number;
      yield: number;
      sustainability: number;
      fertilizer: number;
      pesticide: number;
    };
    environmentalImpact: {
      carbonFootprint: number;
      waterConservation: number;
      soilHealth: number;
      biodiversity: number;
      pollutionReduction: number;
    };
    performance: {
      yieldPerAcre: number;
      qualityGrade: string;
      harvestFrequency: string;
      storageRequirement: string;
      transportation: string;
    };
  };
  financialProjections: {
    year1: {
      revenue: number;
      expenses: number;
      profit: number;
      breakEven: string;
    };
    year2: {
      revenue: number;
      expenses: number;
      profit: number;
      growth: number;
    };
    year3: {
      revenue: number;
      expenses: number;
      profit: number;
      cumulativeROI: number;
    };
  };
  riskAssessment: {
    weatherRisk: number;
    marketRisk: number;
    technicalRisk: number;
    financialRisk: number;
    mitigationStrategies: string[];
  };
  technologyRecommendations: {
    essential: string[];
    optional: string[];
    future: string[];
  };
  marketInsights: {
    priceTrends: {
      current: number;
      projected6Months: number;
      projected1Year: number;
      volatility: number;
    };
    demandForecast: {
      shortTerm: string;
      mediumTerm: string;
      longTerm: string;
    };
  };
}

const isFarmingRelated = (technique: string, farmSize: string): boolean => {
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
  ];
  
  const techniqueLower = technique.toLowerCase();
  const farmSizeNum = parseFloat(farmSize);
  
  const hasFarmingKeyword = farmingKeywords.some(keyword => 
    techniqueLower.includes(keyword)
  );
  
  const isValidFarmSize = !isNaN(farmSizeNum) && farmSizeNum > 0 && farmSizeNum <= 10000;
  
  const nonFarmingKeywords = [
    'porn', 'sex', 'adult', 'gambling', 'casino', 'drug', 'illegal', 'hack',
    'crack', 'virus', 'malware', 'spam', 'scam', 'fraud', 'theft', 'robbery',
    'murder', 'kill', 'violence', 'weapon', 'bomb', 'terrorist', 'extremist',
    'political', 'election', 'vote', 'government', 'policy', 'law', 'legal',
    'medical', 'health', 'disease', 'cancer', 'treatment', 'therapy', 'surgery',
    'finance', 'investment', 'stock', 'trading', 'crypto', 'bitcoin', 'money',
    'entertainment', 'movie', 'music', 'game', 'sport', 'football', 'basketball',
    'technology', 'programming', 'coding', 'software', 'app', 'website', 'internet',
    'social', 'facebook', 'twitter', 'instagram', 'tiktok', 'youtube', 'video'
  ];
  
  const hasNonFarmingKeyword = nonFarmingKeywords.some(keyword => 
    techniqueLower.includes(keyword)
  );
  
  const hasVowels = /[aeiou]/i.test(techniqueLower);
  const hasConsonants = /[bcdfghjklmnpqrstvwxyz]/i.test(techniqueLower);
  const isGibberish = technique.length > 10 && (!hasVowels || !hasConsonants);
  
  return hasFarmingKeyword && isValidFarmSize && !hasNonFarmingKeyword && !isGibberish;
};

export const getModernFarmingAnalysis = async (request: ModernFarmingRequest): Promise<ModernFarmingResponse> => {

  if (!isFarmingRelated(request.technique, request.farmSize)) {
    throw new Error("NOT_APPLICABLE: Query is not related to farming or agriculture");
  }

  const prompt = generateModernFarmingPrompt(request);

  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "You are a world-class agricultural technology consultant with 25+ years of experience. Generate comprehensive farming analysis reports in JSON format only. Always return valid, parseable JSON."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          model: "moonshotai/kimi-k2-instruct-0905",
          temperature: 0.7,
          max_tokens: 4096
        })
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Empty response from AI");
      }

      let responseText = content.trim();

      if (responseText.includes("```")) {
        responseText = responseText
          .replace(/```json\n?/, "")
          .replace(/\n?```$/, "")
          .trim();
      }

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseText = jsonMatch[0];
      }

      if (!responseText.startsWith('{') || !responseText.endsWith('}')) {
        throw new Error(`Attempt ${attempt}: Incomplete JSON response from AI`);
      }

      const parsedResponse = JSON.parse(responseText) as ModernFarmingResponse;

      if (!parsedResponse.techniqueAnalysis || !parsedResponse.implementation || !parsedResponse.metrics) {
        throw new Error(`Attempt ${attempt}: AI response missing required analysis sections`);
      }

      if (!parsedResponse.techniqueAnalysis.overview || !parsedResponse.implementation.phases || !parsedResponse.metrics.resourceEfficiency) {
        throw new Error(`Attempt ${attempt}: AI response missing critical analysis data`);
      }

      if (parsedResponse.implementation.phases.length < 3) {
        throw new Error(`Attempt ${attempt}: Insufficient implementation phases provided`);
      }

      if (parsedResponse.techniqueAnalysis.overview.estimatedCost <= 0) {
        throw new Error(`Attempt ${attempt}: Invalid cost estimate provided`);
      }

      return parsedResponse;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      console.error(`Attempt ${attempt} failed:`, lastError.message);
      
      if (attempt === maxRetries) {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error(`Failed to get valid AI response after ${maxRetries} attempts. Last error: ${lastError?.message}`);
};

export default { getModernFarmingAnalysis };
