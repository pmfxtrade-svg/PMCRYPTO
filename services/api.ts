import { CoinData } from '../types';

const BASE_URL = 'https://api.coingecko.com/api/v3';

// Helper for delay to avoid Rate Limits (Increased to prevent 429 errors)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchCoins = async (page: number = 1, perPage: number = 1000): Promise<CoinData[]> => {
  // NOTE: We moved caching logic to App.tsx to maintain a "Master List" state.
  // This file now focuses purely on reliable data fetching.

  try {
    // CoinGecko allows max 250 items per request.
    const API_LIMIT = 250;
    // Calculate how many API calls we need to fulfill the requested 'perPage' (e.g. 1000 / 250 = 4 calls)
    const totalChunks = Math.ceil(perPage / API_LIMIT); 
    // Calculate the starting API page index. 
    // If App asks for Page 1 (items 1-1000), we fetch API pages 1, 2, 3, 4.
    // If App asks for Page 2 (items 1001-2000), we fetch API pages 5, 6, 7, 8.
    const startApiPage = (page - 1) * totalChunks + 1;
    
    const results: CoinData[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const currentApiPage = startApiPage + i;
      let chunkSuccess = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 3; // Increased retry attempts

      while (!chunkSuccess && attempts < MAX_ATTEMPTS) {
        attempts++;
        try {
          const res = await fetch(
            `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${API_LIMIT}&page=${currentApiPage}&sparkline=false&price_change_percentage=24h,7d,30d,1y`
          );

          if (!res.ok) {
             if (res.status === 429) {
               // Aggressive backoff for rate limits
               await delay(2000 * attempts); 
               continue;
             }
             throw new Error(`API Error: ${res.status}`);
          }

          const chunkData = await res.json();
          if (Array.isArray(chunkData)) {
              results.push(...chunkData);
          }
          chunkSuccess = true;
          
          // CRITICAL: Delay between chunks to prevent "Failed to fetch" / Network congestion
          // Even if successful, wait 1.5 seconds before asking for the next 250 items.
          if (i < totalChunks - 1) {
            await delay(1500);
          }

        } catch (e: any) {
          console.warn(`Attempt ${attempts} failed for API page ${currentApiPage}:`, e.message);
          if (attempts === MAX_ATTEMPTS) {
             console.error(`Giving up on API page ${currentApiPage}`);
             // We don't throw here to avoid killing the whole batch. We just return what we have.
          } else {
             await delay(3000); 
          }
        }
      }
    }

    return results;

  } catch (error) {
    console.error('Fetch error:', error);
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