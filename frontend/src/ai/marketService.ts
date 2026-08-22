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

// Backend API URL - NO VITE_ PREFIX!
const API_BASE_URL = import.meta.env.PROD 
  ? '/api'
  : 'http://localhost:3000/api';

/**
 * Fetch weather data via backend proxy
 * NO MOCK DATA - Only real API responses
 */
export const fetchWeatherData = async (city: string): Promise<WeatherData> => {
  const response = await fetch(`${API_BASE_URL}/weather/${encodeURIComponent(city)}`);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Weather API error: ${response.status}`);
  }
  
  const data = await response.json();
  return normalizeWeatherData(data);
};

const normalizeWeatherData = (data: WeatherData): WeatherData => {
  return {
    ...data,
    main: {
      ...data.main,
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      temp_min: Math.round(data.main.temp_min),
      temp_max: Math.round(data.main.temp_max),
      pressure: Math.round(data.main.pressure),
      humidity: Math.round(data.main.humidity)
    },
    wind: data.wind
      ? {
          ...data.wind,
          speed: Math.round(data.wind.speed),
          deg: Math.round((data.wind.deg ?? 0)),
          gust: data.wind.gust !== undefined ? Math.round(data.wind.gust) : undefined
        }
      : { speed: 0, deg: 0 },
    clouds: data.clouds
      ? {
          ...data.clouds,
          all: Math.round(data.clouds.all)
        }
      : { all: 0 },
    visibility: Math.round(data.visibility || 0)
  };
};

export default { fetchWeatherData };
