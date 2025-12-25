export interface CoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number | null;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
  market_cap_change_24h: number | null;
  market_cap_change_percentage_24h: number | null;
  circulating_supply: number;
  total_supply: number;
  max_supply: number | null;
  ath: number;
  ath_change_percentage: number | null;
  ath_date: string;
  atl: number;
  atl_change_percentage: number | null;
  atl_date: string;
  roi: null | {
    times: number;
    currency: string;
    percentage: number;
  };
  last_updated: string;
  // Additional fields we might compute or mock for demo if API limits
  price_change_percentage_7d_in_currency?: number | null;
  price_change_percentage_30d_in_currency?: number | null;
  price_change_percentage_1y_in_currency?: number | null;
}

export type ViewMode = 'grid' | 'table';
export type GridColumns = 1 | 2 | 3 | 4;
export type Theme = 'dark' | 'light';
export type Timeframe = '15' | '60' | '240' | 'D' | 'W' | 'M';
export type ChartScale = 'log' | 'linear';

export interface FavoriteList {
  id: string;
  name: string;
  coinIds: string[];
}

export interface AppSettings {
  favoriteLists: FavoriteList[]; // Changed from simple string[]
  activeListId: string; // To track which list is currently being viewed/filtered
  hiddenCoins: string[]; // "NEW" ignored coins (User action)
  restoredGlobalCoins: string[]; // Allow-list to override "OLD" global ignores
  gridColumns: GridColumns;
  viewMode: ViewMode;
  theme: Theme;
  showAllCharts: boolean;
  timeframe: Timeframe;
  chartScale: ChartScale;
  lastUpdated?: number; // Timestamp for sync conflict resolution
}

export interface ProfitCalcState {
  isOpen: boolean;
  coin: CoinData | null;
}