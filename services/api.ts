import { CoinData } from '../types';

const BASE_URL = 'https://api.coingecko.com/api/v3';

// Simple in-memory cache to prevent hitting rate limits
// Key will now include page number to cache specific 2000-item chunks
const cache: { [key: string]: { data: CoinData[]; timestamp: number } } = {};
const CACHE_DURATION = 90 * 1000; // Increased to 90 seconds to reduce API load

export const fetchCoins = async (page: number = 1, perPage: number = 2000): Promise<CoinData[]> => {
  const cacheKey = `coins_p${page}_pp${perPage}`;
  const now = Date.now();

  if (cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
    return cache[cacheKey].data;
  }

  try {
    // CoinGecko limits per_page to maximum 250.
    // To get 2000 items, we need to fetch 8 chunks of 250.
    const API_LIMIT = 250;
    const totalChunks = Math.ceil(perPage / API_LIMIT); // 2000 / 250 = 8 chunks
    
    // Calculate the starting 'API Page' based on the 'App Page'
    // App Page 1 -> API Pages 1..8
    // App Page 2 -> API Pages 9..16
    const startApiPage = (page - 1) * totalChunks + 1;

    const promises = [];
    for (let i = 0; i < totalChunks; i++) {
      const currentApiPage = startApiPage + i;
      promises.push(
        fetch(
          `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${API_LIMIT}&page=${currentApiPage}&sparkline=false&price_change_percentage=24h,7d,30d,1y`
        ).then(async (res) => {
          if (!res.ok) {
             if (res.status === 429) throw new Error('API Rate Limit. Please wait 1 minute.');
             throw new Error(`API Error: ${res.statusText}`);
          }
          return res.json();
        })
      );
    }

    // Wait for all requests to complete
    const results = await Promise.all(promises);
    
    // Flatten the array of arrays
    const data: CoinData[] = results.flat();
    
    // Validate we got data
    if (data.length === 0) {
        throw new Error("No data received from API");
    }

    cache[cacheKey] = {
      data,
      timestamp: now,
    };

    return data;
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