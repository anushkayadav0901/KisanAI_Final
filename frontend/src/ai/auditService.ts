import { fetchWeatherData } from './marketService';

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

interface MarketData {
  markets: Array<{
    name: string;
    cropPrices: {
      [key: string]: string;
    };
  }>;
  marketStats: {
    dailyTradingVolume: string;
    activeBuyers: number;
    averagePricePerQuintal: string;
  };
  priceAlerts: Array<{
    crop: string;
    change: string;
    price: string;
    time: string;
    reason: string;
  }>;
}

interface CropWeatherImpact {
  [crop: string]: {
    temperatureEffect: string;
    humidityEffect: string;
    precipitationEffect: string;
    windEffect?: string;
  };
}

const CROP_WEATHER_IMPACTS: CropWeatherImpact = {
  'Wheat': {
    temperatureEffect: "Cool weather generally good for wheat growth",
    humidityEffect: "Higher humidity can cause fungal issues and spoilage",
    precipitationEffect: "Moderate rainfall is beneficial, excess rain can damage"
  },
  'Rice': {
    temperatureEffect: "Needs warmth, optimal growth in warm conditions",
    humidityEffect: "High humidity is beneficial for rice cultivation",
    precipitationEffect: "Requires adequate water supply"
  },
  'Cotton': {
    temperatureEffect: "Warm weather is ideal for cotton growth",
    humidityEffect: "Low humidity preferred to prevent disease",
    precipitationEffect: "Excess rain can be harmful to cotton crops"
  },
  'Sugarcane': {
    temperatureEffect: "Needs heat for optimal growth and sugar content",
    humidityEffect: "Moderate humidity is good for sugarcane",
    precipitationEffect: "Good water availability is essential"
  },
  'Onion': {
    temperatureEffect: "Moderate temperature is preferred for onion cultivation",
    humidityEffect: "High humidity can cause rot problems",
    precipitationEffect: "Excess water causes rot and disease"
  },
  'Tomato': {
    temperatureEffect: "Warm weather is good for tomato growth",
    humidityEffect: "Moderate humidity is optimal",
    precipitationEffect: "Excess rain can cause disease and cracking"
  }
};

export interface CropAnalysis {
  crop: string;
  impact: string;
  recommendation: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  weatherFactors: {
    temperature: string;
    humidity: string;
    precipitation: string;
    wind: string;
  };
}

export const auditMarketWithWeather = async (
  marketData: MarketData,
  city: string
): Promise<{ cropAnalyses: CropAnalysis[]; weatherData: WeatherData; overallAnalysis: string }> => {
  const weatherData = await fetchWeatherData(city);

  const topCrops = getTopCrops(marketData);

  const cropAnalyses = topCrops.map(crop => analyzeCropImpact(weatherData, crop));

  const overallAnalysis = createOverallAnalysis(weatherData, cropAnalyses);

  return {
    cropAnalyses,
    weatherData,
    overallAnalysis
  };
};

const getTopCrops = (marketData: MarketData): string[] => {
  const cropCount: { [crop: string]: number } = {};

  marketData.markets.forEach(market => {
    Object.keys(market.cropPrices).forEach(crop => {
      cropCount[crop] = (cropCount[crop] || 0) + 1;
    });
  });

  const sortedCrops = Object.entries(cropCount)
    .sort((a, b) => b[1] - a[1])
    .map(([crop]) => crop);

  return sortedCrops.slice(0, 3);
};

const analyzeCropImpact = (weatherData: WeatherData, crop: string): CropAnalysis => {
  const { temp, humidity } = weatherData.main;
  const weatherDesc = weatherData.weather[0].description.toLowerCase();

  const impact = CROP_WEATHER_IMPACTS[crop] || {
    temperatureEffect: "Weather impact not specified for this crop",
    humidityEffect: "Weather impact not specified for this crop",
    precipitationEffect: "Weather impact not specified for this crop"
  };

  let riskLevel: 'Low' | 'Medium' | 'High';
  if ((temp > 35 || temp < 10) && humidity > 80) {
    riskLevel = 'High';
  } else if (temp > 30 || temp < 15 || humidity > 70) {
    riskLevel = 'Medium';
  } else {
    riskLevel = 'Low';
  }

  let impactText = `Current weather conditions are ${riskLevel.toLowerCase()} risk for ${crop}. `;

  if (temp > 35) {
    impactText += `High temperature (${temp}°C) may stress the crop. `;
  } else if (temp < 10) {
    impactText += `Low temperature (${temp}°C) may slow growth. `;
  } else if (temp > 30) {
    impactText += `Temperature (${temp}°C) is at upper tolerance limit. `;
  }

  if (humidity > 80) {
    impactText += `High humidity (${humidity}%) may cause fungal issues. `;
  } else if (humidity < 30) {
    impactText += `Low humidity (${humidity}%) may stress the crop. `;
  }

  if (weatherDesc.includes('rain') || weatherDesc.includes('storm')) {
    impactText += `Precipitation may affect crop quality and harvesting. `;
  }

  let recommendation: string;
  if (riskLevel === 'High') {
    switch (crop) {
      case 'Wheat':
        recommendation = "Apply fungicide immediately to prevent disease spread due to high humidity.";
        break;
      case 'Rice':
        recommendation = "Drain excess water to prevent root rot in current high humidity conditions.";
        break;
      case 'Cotton':
        recommendation = "Cover plants to protect from rain and prevent fungal infection.";
        break;
      case 'Sugarcane':
        recommendation = "Reduce irrigation to avoid waterlogging in rainy conditions.";
        break;
      case 'Onion':
        recommendation = "Improve drainage to prevent bulb rot from high moisture levels.";
        break;
      case 'Tomato':
        recommendation = "Apply protective spray to prevent fungal diseases in humid conditions.";
        break;
      default:
        recommendation = "Take immediate protective measures to prevent crop damage.";
    }
  } else if (riskLevel === 'Medium') {
    switch (crop) {
      case 'Wheat':
        recommendation = "Monitor for early signs of heat stress and adjust irrigation schedule.";
        break;
      case 'Rice':
        recommendation = "Maintain adequate water levels while checking for pest activity.";
        break;
      case 'Cotton':
        recommendation = "Monitor for pest activity which increases in current conditions.";
        break;
      case 'Sugarcane':
        recommendation = "Continue regular irrigation and watch for nutrient deficiency signs.";
        break;
      case 'Onion':
        recommendation = "Check soil moisture levels and adjust irrigation accordingly.";
        break;
      case 'Tomato':
        recommendation = "Ensure proper ventilation in growing areas to reduce humidity effects.";
        break;
      default:
        recommendation = "Monitor crops closely and maintain regular farming practices.";
    }
  } else {
    switch (crop) {
      case 'Wheat':
        recommendation = "Optimal weather for wheat growth - continue with nitrogen application.";
        break;
      case 'Rice':
        recommendation = "Favorable conditions for rice - maintain consistent water levels.";
        break;
      case 'Cotton':
        recommendation = "Ideal weather for cotton development - continue with growth management.";
        break;
      case 'Sugarcane':
        recommendation = "Perfect conditions for sugarcane growth - no additional action required.";
        break;
      case 'Onion':
        recommendation = "Excellent weather for onion maturation - continue with normal schedule.";
        break;
      case 'Tomato':
        recommendation = "Great conditions for tomato development - maintain regular care routine.";
        break;
      default:
        recommendation = "Weather conditions are favorable for crop growth - continue regular practices.";
    }
  }

  return {
    crop,
    impact: impactText,
    recommendation,
    riskLevel,
    weatherFactors: {
      temperature: `${impact.temperatureEffect}. Current: ${temp}°C (feels like ${weatherData.main.feels_like}°C)`,
      humidity: `${impact.humidityEffect}. Current: ${humidity}%`,
      precipitation: `${impact.precipitationEffect}. Current: ${weatherDesc}`,
      wind: `Wind: ${weatherData.wind.speed} m/s at ${weatherData.wind.deg}° direction`
    }
  };
};

const createOverallAnalysis = (weatherData: WeatherData, cropAnalyses: CropAnalysis[]): string => {
  const { temp, humidity } = weatherData.main;
  const weatherDesc = weatherData.weather[0].description;
  const windSpeed = weatherData.wind.speed;

  let analysis = `Weather Analysis for ${weatherData.name}:\n`;
  analysis += `Temperature: ${temp}°C (feels like ${weatherData.main.feels_like}°C)\n`;
  analysis += `Humidity: ${humidity}%\n`;
  analysis += `Conditions: ${weatherDesc}\n`;
  analysis += `Wind: ${windSpeed} m/s\n\n`;

  analysis += `Top 3 Crops Analysis:\n`;
  cropAnalyses.forEach((cropItem, index) => {
    analysis += `${index + 1}. ${cropItem.crop}: ${cropItem.riskLevel} Risk\n`;
  });

  analysis += `\nRecommendation: ${cropAnalyses.some(a => a.riskLevel === 'High') ?
    'High risk conditions detected. Take immediate protective measures for crops.' :
    'Overall conditions are manageable. Monitor crops regularly.'}`;

  return analysis;
};
