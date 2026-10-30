/**
 * Weather for the household's home, from Open-Meteo (free, no API key). Forecasts are cached for 30
 * minutes per location; everything here is metric (°C, mm, km/h).
 */

export interface ForecastDay {
  /** `YYYY-MM-DD` in the home's timezone. */
  date: string;
  code: number;
  maxC: number;
  minC: number;
  rainMm: number;
  /** 0–100, or null when the model doesn't give one. */
  rainChance: number | null;
  windKmh: number;
}

export interface Forecast {
  current: { tempC: number; code: number } | null;
  days: ForecastDay[];
}

export interface GeocodedPlace {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
}

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

const num = (value: unknown, fallback = 0) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

/** Ten-day forecast for a point, or null if the weather service is unreachable. */
export async function getForecast(latitude: number, longitude: number): Promise<Forecast | null> {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(3),
    longitude: longitude.toFixed(3),
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
    current: "temperature_2m,weather_code",
    timezone: "auto",
    forecast_days: "10",
  });
  try {
    const res = await fetch(`${FORECAST_URL}?${params}`, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const data = await res.json();
    const d = data?.daily;
    if (!d || !Array.isArray(d.time)) return null;
    const days: ForecastDay[] = d.time.map((date: string, i: number) => ({
      date,
      code: num(d.weather_code?.[i]),
      maxC: num(d.temperature_2m_max?.[i]),
      minC: num(d.temperature_2m_min?.[i]),
      rainMm: num(d.precipitation_sum?.[i]),
      rainChance: typeof d.precipitation_probability_max?.[i] === "number" ? d.precipitation_probability_max[i] : null,
      windKmh: num(d.wind_speed_10m_max?.[i]),
    }));
    const current = data?.current
      ? { tempC: num(data.current.temperature_2m), code: num(data.current.weather_code) }
      : null;
    return { current, days };
  } catch {
    return null;
  }
}

/** Town/postcode search for picking the home's location. */
export async function searchPlaces(query: string): Promise<GeocodedPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({ name: q, count: "6", language: "en", format: "json" });
  try {
    const res = await fetch(`${GEOCODE_URL}?${params}`, { next: { revalidate: 86_400 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.results)) return [];
    return data.results.map(
      (r: {
        name: string;
        admin1?: string;
        country?: string;
        latitude: number;
        longitude: number;
        timezone?: string;
      }) => ({
        name: [r.name, r.admin1, r.country].filter((part, i, all) => part && all.indexOf(part) === i).join(", "),
        latitude: r.latitude,
        longitude: r.longitude,
        timezone: r.timezone ?? null,
      }),
    );
  } catch {
    return [];
  }
}

/** WMO weather code → short description and Material Symbols icon. */
export function describeWeather(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Clear", icon: "sunny" };
  if (code <= 2) return { label: "Partly cloudy", icon: "partly_cloudy_day" };
  if (code === 3) return { label: "Overcast", icon: "cloud" };
  if (code === 45 || code === 48) return { label: "Fog", icon: "foggy" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: "rainy_light" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: "Rain", icon: "rainy" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: "Snow", icon: "weather_snowy" };
  if (code >= 95) return { label: "Thunderstorms", icon: "thunderstorm" };
  return { label: "Cloudy", icon: "cloud" };
}

export type WeatherAlertKind = "frost" | "rain" | "wind" | "heat" | "dry";

export interface WeatherAlert {
  kind: WeatherAlertKind;
  /** First forecast day it applies to. */
  date: string;
  title: string;
  tip: string;
}

const FROST_C = 0;
const HARD_FROST_C = -3;
const HEAVY_RAIN_MM = 15;
const STRONG_WIND_KMH = 50;
const HEAT_C = 30;
const DRY_DAYS = 7;

/**
 * Weather worth acting on around the home in the coming days, each with what to do about it — at most one
 * alert per kind, dated to when it first hits.
 */
export function weatherAlerts(days: ForecastDay[]): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const first = (test: (d: ForecastDay) => boolean) => days.find(test);

  const frost = first((d) => d.minC <= FROST_C);
  if (frost) {
    const hard = days.some((d) => d.minC <= HARD_FROST_C);
    alerts.push({
      kind: "frost",
      date: frost.date,
      title: hard ? `Hard frost, down to ${Math.round(Math.min(...days.map((d) => d.minC)))}°C` : "Frost on the way",
      tip: "Drain and cover outdoor taps, bring in tender pots, and check the boiler and pipe lagging.",
    });
  }

  const rain = first((d) => d.rainMm >= HEAVY_RAIN_MM);
  if (rain) {
    alerts.push({
      kind: "rain",
      date: rain.date,
      title: `Heavy rain, about ${Math.round(rain.rainMm)} mm`,
      tip: "Clear gutters and drains beforehand, and leave outdoor painting or sealing for a dry day.",
    });
  }

  const wind = first((d) => d.windKmh >= STRONG_WIND_KMH);
  if (wind) {
    alerts.push({
      kind: "wind",
      date: wind.date,
      title: `Strong wind, gusting to ${Math.round(wind.windKmh)} km/h`,
      tip: "Tie down or store garden furniture, trampolines and bins; check loose fence panels.",
    });
  }

  const heat = first((d) => d.maxC >= HEAT_C);
  if (heat) {
    alerts.push({
      kind: "heat",
      date: heat.date,
      title: `Hot spell, up to ${Math.round(Math.max(...days.map((d) => d.maxC)))}°C`,
      tip: "Water the garden early or late, and service fans or air conditioning before you need them.",
    });
  }

  const dryRun = days.slice(0, DRY_DAYS);
  if (dryRun.length === DRY_DAYS && dryRun.every((d) => d.rainMm < 1) && dryRun.some((d) => d.maxC >= 20)) {
    alerts.push({
      kind: "dry",
      date: dryRun[0]!.date,
      title: "A dry week ahead",
      tip: "Good for outdoor painting, decking and fence treatment; keep new planting watered.",
    });
  }

  return alerts;
}

/** Plain-text forecast for the maintenance assistant's prompt. */
export function forecastForPrompt(placeName: string, forecast: Forecast): string {
  const lines = forecast.days.map((d) => {
    const { label } = describeWeather(d.code);
    const chance = d.rainChance != null ? `, ${d.rainChance}% chance of rain` : "";
    return `${d.date}: ${label}, ${Math.round(d.minC)}–${Math.round(d.maxC)}°C, ${d.rainMm.toFixed(1)} mm rain${chance}, wind up to ${Math.round(d.windKmh)} km/h`;
  });
  const alerts = weatherAlerts(forecast.days).map((a) => `- ${a.date}: ${a.title}`);
  return [
    `Home: ${placeName}`,
    "Daily forecast:",
    ...lines,
    ...(alerts.length ? ["Notable weather:", ...alerts] : []),
  ].join("\n");
}
