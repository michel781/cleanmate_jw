'use client';

import { useEffect, useState } from 'react';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'snowy';

interface WeatherCache {
  weather: Weather;
  fetchedAt: number;
  lat?: number;
  lon?: number;
}

const CACHE_KEY = 'cleanmate.weather.v1';
const CACHE_TTL_MS = 60 * 60 * 1000;

export function timeOfDayFromHour(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 19) return 'evening';
  return 'night';
}

function seededWeather(d = new Date()): Weather {
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const r = Math.abs(Math.sin(seed) * 10000) % 1;
  if (r < 0.55) return 'sunny';
  if (r < 0.80) return 'cloudy';
  if (r < 0.93) return 'rainy';
  return 'snowy';
}

function readCache(): WeatherCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherCache;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(c: WeatherCache) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    // ignore quota
  }
}

function mapOwmCode(id: number): Weather {
  if (id >= 200 && id < 600) return 'rainy';
  if (id >= 600 && id < 700) return 'snowy';
  if (id >= 700 && id < 800) return 'cloudy';
  if (id === 800) return 'sunny';
  return 'cloudy';
}

async function fetchWeatherFromApi(lat: number, lon: number): Promise<Weather | null> {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const id = json?.weather?.[0]?.id;
    if (typeof id !== 'number') return null;
    return mapOwmCode(id);
  } catch {
    return null;
  }
}

export interface UseWeatherResult {
  now: Date;
  hour: number;
  minute: number;
  timeOfDay: TimeOfDay;
  weather: Weather;
  source: 'api' | 'seed' | 'cache';
}

export function useWeather(): UseWeatherResult {
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<Weather>(() => seededWeather());
  const [source, setSource] = useState<'api' | 'seed' | 'cache'>('seed');

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setWeather(cached.weather);
      setSource('cache');
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation && process.env.NEXT_PUBLIC_OPENWEATHER_KEY) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const w = await fetchWeatherFromApi(pos.coords.latitude, pos.coords.longitude);
          if (w) {
            setWeather(w);
            setSource('api');
            writeCache({ weather: w, fetchedAt: Date.now(), lat: pos.coords.latitude, lon: pos.coords.longitude });
          }
        },
        () => { /* permission denied — keep seed/cache */ },
        { maximumAge: CACHE_TTL_MS, timeout: 8000 }
      );
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return {
    now,
    hour: now.getHours(),
    minute: now.getMinutes(),
    timeOfDay: timeOfDayFromHour(now.getHours()),
    weather,
    source,
  };
}
