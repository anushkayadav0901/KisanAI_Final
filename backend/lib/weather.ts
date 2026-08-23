import { WEATHER_API_KEY } from "../config.js";

const OWM_BASE = "https://api.openweathermap.org/data/2.5/weather";

export interface WeatherCondition {
    id: number;
    main: string;
    description: string;
    icon: string;
}

export interface NormalisedWeather {
    coord: { lon: number; lat: number };
    weather: WeatherCondition[];
    main: {
        temp: number;
        feels_like: number;
        temp_min: number;
        temp_max: number;
        pressure: number;
        humidity: number;
    };
    wind: { speed: number; deg: number; gust?: number };
    clouds: { all: number };
    visibility: number;
    name: string;
}

interface OwmApiResponse {
    cod: number | string;
    message?: string;
    coord?: { lon: number; lat: number };
    weather?: WeatherCondition[];
    main?: {
        temp?: number;
        feels_like?: number;
        temp_min?: number;
        temp_max?: number;
        pressure?: number;
        humidity?: number;
    };
    wind?: { speed?: number; deg?: number; gust?: number };
    clouds?: { all?: number };
    visibility?: number;
    name?: string;
}

export async function fetchWeather(queryParams: string | URLSearchParams): Promise<NormalisedWeather> {
    if (!WEATHER_API_KEY) {
        throw Object.assign(new Error("WEATHER_API_KEY not configured"), { status: 500 });
    }

    const url = `${OWM_BASE}?${queryParams}&units=metric&appid=${WEATHER_API_KEY}`;
    const response = await fetch(url);
    const data = (await response.json()) as OwmApiResponse;

    if (data.cod !== 200) {
        throw Object.assign(
            new Error(data.message || "Weather API error"),
            { status: 400 }
        );
    }

    return normalise(data);
}

function normalise(data: OwmApiResponse): NormalisedWeather {
    const main = data.main ?? {};
    const round = (n: number | undefined): number => Math.round(n ?? NaN);

    return {
        coord: data.coord ?? { lon: 0, lat: 0 },
        weather: data.weather ?? [],
        main: {
            temp:       round(main.temp),
            feels_like: round(main.feels_like),
            temp_min:   round(main.temp_min),
            temp_max:   round(main.temp_max),
            pressure:   round(main.pressure),
            humidity:   round(main.humidity),
        },
        wind: data.wind
            ? {
                  speed: Math.round(data.wind.speed ?? 0),
                  deg:   Math.round(data.wind.deg ?? 0),
                  ...(data.wind.gust !== undefined && { gust: Math.round(data.wind.gust) }),
              }
            : { speed: 0, deg: 0 },
        clouds:     { all: Math.round(data.clouds?.all ?? 0) },
        visibility: Math.round(data.visibility || 0),
        name: data.name ?? "",
    };
}
