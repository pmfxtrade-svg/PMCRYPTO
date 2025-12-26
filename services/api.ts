import { CoinData } from '../types';

const BASE_URL = 'https://api.coingecko.com/api/v3';

// Simple in-memory cache
const cache: { [key: string]: { data: CoinData[]; timestamp: number } } = {};
const CACHE_DURATION = 90 * 1000; 

// Helper for delay to avoid Rate Limits
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchCoins = async (page: number = 1, perPage: number = 1000): Promise<CoinData[]> => {
  // Key represents the batch page (e.g., Batch 1 = Ranks 1-1000)
  const cacheKey = `coins_p${page}_pp${perPage}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  try {
    // CoinGecko limits per_page to maximum 250.
    // To get 1000 items, we need 4 requests of 250.
    const API_LIMIT = 250;
    const totalChunks = Math.ceil(perPage / API_LIMIT); 
    
    // Calculate the starting 'API Page' based on the 'App Batch Page'
    const startApiPage = (page - 1) * totalChunks + 1;

    const results: CoinData[] = [];

    // SEQUENTIAL FETCHING WITH RETRY LOGIC
    for (let i = 0; i < totalChunks; i++) {
      const currentApiPage = startApiPage + i;
      let chunkSuccess = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 3;

      while (!chunkSuccess && attempts < MAX_ATTEMPTS) {
        attempts++;
        try {
          const res = await fetch(
            `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${API_LIMIT}&page=${currentApiPage}&sparkline=false&price_change_percentage=24h,7d,30d,1y`
          );

          if (!res.ok) {
             if (res.status === 429) {
               console.warn(`Rate limit hit at chunk ${currentApiPage} (Attempt ${attempts}). Waiting longer...`);
               await delay(3000 * attempts); // Increased backoff for 429
               continue;
             }
             
             if (res.status >= 500) {
                console.warn(`Server error ${res.status} at chunk ${currentApiPage}. Retrying...`);
                await delay(2000 * attempts);
                continue;
             }
             
             throw new Error(`API Error: ${res.statusText} (${res.status})`);
          }

          const chunkData = await res.json();
          if (Array.isArray(chunkData)) {
              results.push(...chunkData);
          }
          chunkSuccess = true;

          // Increased delay between chunks to 1000ms (1 second) to be very safe against 429
          await delay(1000); 

        } catch (e: any) {
          console.error(`Attempt ${attempts} failed for chunk ${currentApiPage}:`, e.message);
          
          if (attempts === MAX_ATTEMPTS) {
             throw new Error(`Failed to fetch part of the data (Chunk ${currentApiPage}). Check your connection.`);
          }
          await delay(2000); 
        }
      }
    }

    // Validate we got data
    if (results.length === 0) {
        throw new Error("No data received from API");
    }

    cache[cacheKey] = {
      data: results,
      timestamp: now,
    };

    return results;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

export const searchGlobal = async (query: string): Promise<CoinData[]> => {
  try {
    const searchRes = await fetch(`${BASE_URL}/search?query=${query}`);
    const searchData = await searchRes.json();
    
    if (!searchData.coins || searchData.coins.length === 0) return [];

    const topIds = searchData.coins.slice(0, 6).map((c: any) => c.id).join(',');

    if (!topIds) return [];

    const marketsRes = await fetch(
      `${BASE_URL}/coins/markets?vs_currency=usd&ids=${topIds}&order=market_cap_desc&sparkline=false&price_change_percentage=24h,7d,30d,1y`
    );
    
    if (!marketsRes.ok) throw new Error('Failed to fetch market data for search results');
    
    const marketsData: CoinData[] = await marketsRes.json();
    return marketsData;
  } catch (error) {
    console.error("Global search error:", error);
    return [];
  }
};