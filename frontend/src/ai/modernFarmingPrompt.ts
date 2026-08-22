import type { ModernFarmingRequest } from "./modernFarmingService"

export const generateModernFarmingPrompt = ({ technique, farmSize, budget }: ModernFarmingRequest): string => {
  return `You are a world-class agricultural technology consultant with 25+ years of experience. Generate a comprehensive, data-rich farming analysis report in JSON format.

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON - no markdown, no explanations, no additional text
- Provide rich, detailed data with specific numbers, percentages, and metrics
- Include comprehensive market analysis, cost breakdowns, and performance data
- All data must be realistic and based on current agricultural practices
- Response must be parseable by JSON.parse()

FARMING ANALYSIS REQUEST:
Technique: ${technique}
Farm Size: ${farmSize} acres  
Budget Range: ${budget}

JSON STRUCTURE:
{
  "techniqueAnalysis": {
    "overview": {
      "name": "string",
      "estimatedCost": number,
      "roi": number,
      "successRate": number,
      "timeToRoi": "string",
      "sustainabilityScore": number,
      "marketDemand": number,
      "profitabilityIndex": number,
      "riskLevel": "Low/Medium/High",
      "recommendedCrops": ["string", "string", "string"]
    },
    "costBreakdown": {
      "infrastructure": number,
      "equipment": number,
      "seeds": number,
      "labor": number,
      "maintenance": number,
      "miscellaneous": number
    },
    "marketAnalysis": {
      "demandTrend": "Growing/Stable/Declining",
      "priceStability": number,
      "competitionLevel": "Low/Medium/High",
      "exportPotential": number,
      "localMarketShare": number
    }
  },
  "implementation": {
    "phases": [
      {
        "name": "string",
        "duration": "string", 
        "description": "string",
        "keyMilestones": ["string", "string", "string"],
        "estimatedCost": number,
        "priority": "High/Medium/Low",
        "dependencies": ["string"],
        "successMetrics": ["string", "string"]
      }
    ],
    "timeline": {
      "totalDuration": "string",
      "criticalPath": ["string", "string"],
      "milestoneDates": {
        "planningComplete": "string",
        "infrastructureReady": "string",
        "firstHarvest": "string",
        "fullOperation": "string"
      }
    }
  },
  "metrics": {
    "resourceEfficiency": {
      "water": number,
      "labor": number,
      "energy": number,
      "yield": number,
      "sustainability": number,
      "fertilizer": number,
      "pesticide": number
    },
    "environmentalImpact": {
      "carbonFootprint": number,
      "waterConservation": number,
      "soilHealth": number,
      "biodiversity": number,
      "pollutionReduction": number
    },
    "performance": {
      "yieldPerAcre": number,
      "qualityGrade": "A/B/C",
      "harvestFrequency": "string",
      "storageRequirement": "string",
      "transportation": "string"
    }
  },
  "financialProjections": {
    "year1": {
      "revenue": number,
      "expenses": number,
      "profit": number,
      "breakEven": "string"
    },
    "year2": {
      "revenue": number,
      "expenses": number,
      "profit": number,
      "growth": number
    },
    "year3": {
      "revenue": number,
      "expenses": number,
      "profit": number,
      "cumulativeROI": number
    }
  },
  "riskAssessment": {
    "weatherRisk": number,
    "marketRisk": number,
    "technicalRisk": number,
    "financialRisk": number,
    "mitigationStrategies": ["string", "string", "string"]
  },
  "technologyRecommendations": {
    "essential": ["string", "string"],
    "optional": ["string", "string"],
    "future": ["string", "string"]
  },
  "marketInsights": {
    "priceTrends": {
      "current": number,
      "projected6Months": number,
      "projected1Year": number,
      "volatility": number
    },
    "demandForecast": {
      "shortTerm": "string",
      "mediumTerm": "string",
      "longTerm": "string"
    }
  }
}

PROFESSIONAL GUIDELINES:
1. Provide specific, realistic numbers for all financial projections
2. Include detailed cost breakdowns with actual equipment costs
3. Add market analysis with current price trends and demand forecasts
4. Include risk assessment with specific mitigation strategies
5. Provide technology recommendations with specific equipment names
6. Include seasonal variations and regional considerations
7. Add performance metrics with industry benchmarks
8. Include financial projections for 3 years with growth rates
9. Provide specific crop recommendations with yield expectations
10. Include export potential and market opportunities

RESPONSE FORMAT: Return ONLY the JSON object, no other text.`
}