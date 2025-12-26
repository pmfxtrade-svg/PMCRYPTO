import { CoinData } from '../types';

const BASE_URL = 'https://api.coingecko.com/api/v3';
const STORAGE_PREFIX = 'pmcrypto_cache_';
const CACHE_DURATION = 30 * 60 * 1000; // 30 Minutes

// Helper for delay to avoid Rate Limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- LocalStorage Helpers ---

const getCachedData = (key: string) => {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    if (!item) return null;
    return JSON.parse(item) as { data: CoinData[]; timestamp: number };
  } catch {
    return null;
  }
};

const setCachedData = (key: string, data: CoinData[]) => {
  try {
    const payload = { data, timestamp: Date.now() };
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload));
  } catch (e) {
    console.warn('LocalStorage limit reached. Clearing old PMcrypto cache...');
    // Simple garbage collection: remove all app-specific keys to make space
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(STORAGE_PREFIX)) localStorage.removeItem(k);
      });
      // Try saving again for the current request
      const payload = { data, timestamp: Date.now() };
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload));
    } catch (e2) {
      console.error('Could not save to local storage even after cleanup.', e2);
    }
  }
};

export const fetchCoins = async (page: number = 1, perPage: number = 500): Promise<CoinData[]> => {
  const cacheKey = `coins_p${page}_pp${perPage}`;
  const cached = getCachedData(cacheKey);
  const now = Date.now();

  // 1. Return fresh cache immediately if valid
  if (cached && (now - cached.timestamp < CACHE_DURATION)) {
    return cached.data;
  }

  try {
    const API_LIMIT = 250;
    const totalChunks = Math.ceil(perPage / API_LIMIT); 
    const startApiPage = (page - 1) * totalChunks + 1;
    const results: CoinData[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const currentApiPage = startApiPage + i;
      let chunkSuccess = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 2;

      while (!chunkSuccess && attempts < MAX_ATTEMPTS) {
        attempts++;
        try {
          const res = await fetch(
            `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${API_LIMIT}&page=${currentApiPage}&sparkline=false&price_change_percentage=24h,7d,30d,1y`
          );

          if (!res.ok) {
             if (res.status === 429) {
               await delay(5000 * attempts); 
               continue;
             }
             throw new Error(`API Error: ${res.status}`);
          }

          const chunkData = await res.json();
          if (Array.isArray(chunkData)) {
              results.push(...chunkData);
          }
          chunkSuccess = true;
          await delay(500); // Politeness delay
        } catch (e: any) {
          console.warn(`Attempt ${attempts} failed for page ${currentApiPage}:`, e.message);
          if (attempts === MAX_ATTEMPTS) {
             // If this is the final attempt and it failed, re-throw to trigger the outer catch
             // which handles returning stale cache.
             throw e;
          }
          await delay(2000); 
        }
      }
    }

    if (results.length > 0) {
      setCachedData(cacheKey, results);
      return results;
    }
    
    // If results is empty but no error thrown (unlikely in this loop structure but possible)
    return cached ? cached.data : [];

  } catch (error) {
    console.error('Fetch error:', error);
    
    // 2. Fallback: If API fails (Network/Rate Limit), return expired cache if we have it.
    // This prevents the app from crashing or showing an error screen on reload.
    if (cached) {
      console.info('Returning stale cache data due to fetch error.');
      return cached.data;
    }
    
    // If no cache and network failed, we must return empty array or throw.
    // Returning empty array allows the app to continue running without crashing.
    return [];
  }
};

export const searchGlobal = async (query: string): Promise<CoinData[]> => {
  try {
    const searchRes = await fetch(`${BASE_URL}/search?query=${query}`);
    const searchData = await searchRes.json();
    if (!searchData.coins || searchData.coins.length === 0) return [];
    const topIds = searchData.coins.slice(0, 10).map((c: any) => c.id).join(',');
    if (!topIds) return [];
    const marketsRes = await fetch(
      `${BASE_URL}/coins/markets?vs_currency=usd&ids=${topIds}&order=market_cap_desc&sparkline=false&price_change_percentage=24h,7d,30d,1y`
    );
    return await marketsRes.json();
  } catch (error) {
    return [];
  }
};