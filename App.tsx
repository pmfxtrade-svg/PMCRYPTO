import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  LayoutGrid, List, Settings, Filter, Search, ChevronLeft, ChevronRight, 
  RefreshCcw, Star, EyeOff, TrendingUp, DollarSign, ExternalLink, 
  MoreHorizontal, Calculator, Copy, Download, Upload, AlertCircle, X,
  Sun, Moon, Activity, Clock, BarChart2, Maximize2, Minimize2, Copy as CopyIcon,
  BrainCircuit, Sparkles, Plus, Check, Trash2, ChevronDown, Database, Cloud, CloudOff,
  Globe, Ban, Undo2, History
} from 'lucide-react';
import { fetchCoins, searchGlobal } from './services/api';
import { CoinData, AppSettings, ProfitCalcState, GridColumns, Theme, Timeframe, ChartScale, FavoriteList } from './types';
import TradingViewWidget from './components/TradingViewWidget';
import { supabase } from './services/supabaseClient';
import { IGNORED_COINS_GLOBAL } from './constants/ignoredCoins';

// ----------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value);
};

const formatCompactNumber = (number: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1
  }).format(number);
};

// Helper to format coin ID to readable string (e.g. "binance-peg-weth" -> "Binance Peg Weth")
const formatCoinIdName = (id: string) => {
  return id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Generate or retrieve a unique client ID for this browser to store settings in DB
const getClientId = () => {
  let id = localStorage.getItem('pmcrypto_client_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('pmcrypto_client_id', id);
  }
  return id;
};

// Constants for Permanent Lists
const DEFAULT_PERMANENT_LISTS: FavoriteList[] = [
  { id: 'list_general', name: 'General', coinIds: [] },
  { id: 'list_to_ath', name: 'To Ath', coinIds: [] },
  { id: 'list_performance', name: 'Performance', coinIds: [] }
];

// Optimized Set for Global Ignore List to improve filter performance
const IGNORED_COINS_SET = new Set(IGNORED_COINS_GLOBAL);

// ----------------------------------------------------------------------
// SUB-COMPONENTS
// ----------------------------------------------------------------------

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 rounded-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"><X size={20} /></button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const Drawer = ({ isOpen, onClose, coin, settings }: { isOpen: boolean; onClose: () => void; coin: CoinData | null, settings: AppSettings }) => {
  if (!isOpen || !coin) return null;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      
      {/* Panel - Full Screen Width (95vw) */}
      <div className="relative w-full md:w-[95vw] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-shrink-0">
          <div className="flex items-center gap-4">
             <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
             <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{coin.name}</h2>
                <span className="text-sm text-slate-500 uppercase font-medium">{coin.symbol}</span>
             </div>
             
             {/* Quick Stats in Header */}
             <div className="hidden md:flex items-center gap-6 ml-8 px-6 border-l border-slate-300 dark:border-slate-700">
                <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">24h Low</div>
                    <div className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatCurrency(coin.low_24h)}</div>
                </div>
                 <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">24h High</div>
                    <div className="font-mono font-bold text-slate-700 dark:text-slate-300">{formatCurrency(coin.high_24h)}</div>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition">
            <X size={28} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
           {/* Price Info Row */}
           <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-bold text-slate-900 dark:text-white tracking-tight">{formatCurrency(coin.current_price)}</span>
                  <span className={`text-xl font-medium px-2.5 py-0.5 rounded-full ${coin.price_change_percentage_24h && coin.price_change_percentage_24h >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {coin.price_change_percentage_24h ? (coin.price_change_percentage_24h >= 0 ? '+' : '') + coin.price_change_percentage_24h.toFixed(2) : '0.00'}%
                  </span>
              </div>
           </div>

           {/* Chart - Increased Height to 65vh */}
           <div className="h-[65vh] w-full border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-inner bg-slate-50 dark:bg-slate-950">
              <TradingViewWidget 
                symbol={coin.symbol} 
                isVisible={true} 
                theme={settings.theme}
                interval={settings.timeframe}
                scale={settings.chartScale}
                chartType="price"
              />
           </div>

           {/* Detailed Stats Grid - Expanded for wide view */}
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                 <div className="text-xs text-slate-500 mb-1">Market Cap</div>
                 <div className="font-mono font-bold text-lg">{formatCompactNumber(coin.market_cap)}</div>
                 <div className="text-xs text-blue-500 mt-1 font-medium">Rank #{coin.market_cap_rank}</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                 <div className="text-xs text-slate-500 mb-1">Volume (24h)</div>
                 <div className="font-mono font-bold text-lg">{formatCompactNumber(coin.total_volume)}</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                 <div className="text-xs text-slate-500 mb-1">All Time High</div>
                 <div className="font-mono font-bold text-lg">{formatCompactNumber(coin.ath)}</div>
                 <div className="text-xs text-red-500 mt-1">{coin.ath_change_percentage?.toFixed(1)}%</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                 <div className="text-xs text-slate-500 mb-1">Circulating Supply</div>
                 <div className="font-mono font-bold text-lg">{formatCompactNumber(coin.circulating_supply)}</div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                 <div className="text-xs text-slate-500 mb-1">Total Supply</div>
                 <div className="font-mono font-bold text-lg">{formatCompactNumber(coin.total_supply)}</div>
              </div>
               <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                 <div className="text-xs text-slate-500 mb-1">ATH Date</div>
                 <div className="font-mono font-bold text-sm text-slate-600 dark:text-slate-300">{new Date(coin.ath_date).toLocaleDateString()}</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const PercentageBadge = ({ value }: { value: number | null | undefined }) => {
  if (value === undefined || value === null) return <span className="text-slate-400 font-mono">-</span>;
  const isUp = value >= 0;
  return (
    <span className={`font-bold font-mono ${isUp ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
      {isUp ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
};

// --- Coin Card Component ---
interface CoinCardProps {
  coin: CoinData;
  settings: AppSettings;
  onFavoriteClick: (coinId: string) => void;
  hideCoin: (id: string) => void;
  openProfitCalc: (coin: CoinData) => void;
  onCopyAnalysis: (coin: CoinData) => void;
  simulationAmount: number;
}

const CoinCard: React.FC<CoinCardProps> = ({ coin, settings, onFavoriteClick, hideCoin, openProfitCalc, onCopyAnalysis, simulationAmount }) => {
  // Tabs: 'price' (default chart), 'market_cap' (chart), 'simultaneous' (both charts)
  const [activeTab, setActiveTab] = useState<'price' | 'market_cap' | 'simultaneous'>('price');
  const cardRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIntersecting] = useState(false);

  // Check if coin is in ANY favorite list
  const isFavorite = settings.favoriteLists.some(list => list.coinIds.includes(coin.id));

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIntersecting(entry.isIntersecting);
      },
      { rootMargin: '200px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);
  
  // Calculations
  const athDrop = coin.ath_change_percentage ?? 0;
  const toAth = coin.current_price > 0 ? ((coin.ath - coin.current_price) / coin.current_price) * 100 : 0;
  const circPercentage = coin.total_supply ? (coin.circulating_supply / coin.total_supply) * 100 : 0;
  const multiplier = coin.current_price > 0 ? coin.ath / coin.current_price : 0;
  const potentialValue = simulationAmount * multiplier;

  const StatItem = ({ label, value, colorClass = "text-slate-800 dark:text-slate-200", subValue, subColorClass }: { label: string, value: string, colorClass?: string, subValue?: string, subColorClass?: string }) => (
    <div className="flex flex-col mb-1 last:mb-0">
      <div className="flex justify-between items-baseline gap-1 text-[9px] xl:text-[10px] 2xl:text-xs">
        <span className="text-slate-500 font-medium">{label}:</span>
        <span className={`font-bold font-mono ${colorClass}`}>{value}</span>
      </div>
       {subValue && (
        <div className="flex justify-between items-baseline gap-1 text-[9px] xl:text-[10px] 2xl:text-xs mt-0.5">
          <span className="text-slate-400">{subValue.includes('To') ? '' : ''}</span>
          <span className={`font-bold font-mono ${subColorClass || colorClass}`}>{subValue}</span>
        </div>
      )}
    </div>
  );

  const PercentageStat = ({ label, value }: { label: string, value: number | null | undefined }) => {
     const val = value ?? 0;
     const isUp = val >= 0;
     return (
       <div className="flex justify-between items-baseline gap-1 text-[9px] xl:text-[10px] 2xl:text-xs mb-1 last:mb-0">
         <span className="text-slate-500 font-medium">{label}:</span>
         <span className={`font-bold font-mono ${isUp ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
           {isUp ? '+' : ''}{val.toFixed(1)}%
         </span>
       </div>
     );
  };

  const renderStatsGrid = () => (
    <div className="w-full grid grid-cols-5 gap-1.5 text-[10px] xl:text-xs content-start flex-shrink-0 border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
      {/* Col 1: Time Changes */}
      <div className="flex flex-col pr-1 border-r border-slate-100 dark:border-slate-800">
        <PercentageStat label="7d" value={coin.price_change_percentage_7d_in_currency} />
        <PercentageStat label="30d" value={coin.price_change_percentage_30d_in_currency} />
        <PercentageStat label="1y" value={coin.price_change_percentage_1y_in_currency} />
      </div>

      {/* Col 2: ATH Info */}
      <div className="flex flex-col px-1 border-r border-slate-100 dark:border-slate-800">
        <StatItem label="ATH" value={formatCompactNumber(coin.ath)} />
        <div className="flex justify-between items-baseline gap-1 mb-1">
            <span className="text-slate-500 font-medium">Drop:</span>
            <span className="text-red-500 font-bold font-mono text-[9px] xl:text-[10px]">{athDrop.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between items-baseline gap-1">
            <span className="text-slate-500 font-medium whitespace-nowrap">To ATH:</span>
            <span className="text-green-600 dark:text-green-400 font-bold font-mono text-[9px] xl:text-[10px]">+{toAth.toFixed(0)}%</span>
        </div>
      </div>

      {/* Col 3: Market Info */}
      <div className="flex flex-col px-1 border-r border-slate-100 dark:border-slate-800">
          <StatItem label="Cap" value={formatCompactNumber(coin.market_cap)} />
          <StatItem label="Vol" value={formatCompactNumber(coin.total_volume)} />
          <div className="flex justify-between items-baseline gap-1 mt-1">
            <span className="text-slate-500 font-medium">Rank:</span>
            <span className="text-blue-500 font-bold text-[9px]">#{coin.market_cap_rank}</span>
          </div>
      </div>

      {/* Col 4: Supply */}
      <div className="flex flex-col px-1 border-r border-slate-100 dark:border-slate-800">
        <StatItem label="Total" value={formatCompactNumber(coin.total_supply)} />
        <StatItem label="Circ" value={formatCompactNumber(coin.circulating_supply)} />
        <div className="flex justify-between items-baseline gap-1 mt-1">
            <span className="text-slate-500 font-medium">Circ %:</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold font-mono text-[9px] xl:text-[10px]">{circPercentage.toFixed(1)}%</span>
        </div>
      </div>

        {/* Col 5: Investment/Sim (To ATH) */}
        <div className="flex flex-col pl-1">
          <StatItem label="Inv" value={`$${simulationAmount}`} />
          <StatItem label="Val" value={formatCurrency(potentialValue)} colorClass="text-blue-600 dark:text-blue-400" />
          <StatItem label="X" value={`${multiplier.toFixed(1)}x`} colorClass="text-green-600 dark:text-green-400" />
        </div>
    </div>
  );

  return (
    <div ref={cardRef} className="aspect-square bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm flex flex-col relative group transition-shadow hover:shadow-md">
      
      {/* Header */}
      <div className="p-3 flex justify-between items-start flex-shrink-0 z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg leading-none text-slate-900 dark:text-white">{coin.symbol.toUpperCase()}</span>
              <button className="text-slate-400 hover:text-slate-600" title="Copy Symbol">
                <CopyIcon size={12} />
              </button>
            </div>
            <div className="flex items-center gap-1">
               <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] px-1 rounded">#{coin.market_cap_rank}</span>
               <span className="text-xs text-slate-500 truncate max-w-[80px]">{coin.name}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => onFavoriteClick(coin.id)}>
             <Star size={18} className={isFavorite ? "text-yellow-400 fill-yellow-400" : "text-slate-300 dark:text-slate-600 hover:text-yellow-400"} />
          </button>
          <button onClick={() => onCopyAnalysis(coin)} className="text-slate-300 dark:text-slate-600 hover:text-purple-500" title="AI Analysis">
             <BrainCircuit size={18} />
          </button>
          <button onClick={() => hideCoin(coin.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-500">
             <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 px-3 relative">
        
        {/* Large Price Display */}
        <div className="flex justify-between items-end mb-2 border-b border-slate-100 dark:border-slate-800 pb-2 flex-shrink-0">
          <span className="text-2xl xl:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(coin.current_price)}
          </span>
          <span className={`text-sm font-bold ${coin.price_change_percentage_24h && coin.price_change_percentage_24h >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {coin.price_change_percentage_24h ? (coin.price_change_percentage_24h >= 0 ? '+' : '') + coin.price_change_percentage_24h.toFixed(1) : '0.0'}% (24h)
          </span>
        </div>

        {/* Stats Grid */}
        {renderStatsGrid()}

        {/* Dynamic Content Area (Charts) */}
        <div className="flex-1 w-full min-h-0 overflow-hidden relative mb-2 rounded bg-slate-50 dark:bg-slate-950/50">
          
          {/* Price Chart View */}
          {activeTab === 'price' && (
            <TradingViewWidget 
               symbol={coin.symbol} 
               isVisible={isIntersecting} 
               theme={settings.theme}
               interval={settings.timeframe}
               scale={settings.chartScale}
               chartType="price"
            />
          )}

          {/* Market Cap Chart View */}
          {activeTab === 'market_cap' && (
             <TradingViewWidget 
                symbol={coin.symbol} 
                isVisible={isIntersecting} 
                theme={settings.theme}
                interval={settings.timeframe}
                scale={settings.chartScale}
                chartType="market_cap"
             />
          )}

          {/* Simultaneous View (Split Screen) */}
          {activeTab === 'simultaneous' && (
             <div className="flex flex-col h-full gap-1">
                <div className="flex-1 border-b border-slate-200 dark:border-slate-800 relative">
                   <div className="absolute top-1 left-1 z-10 text-[10px] bg-slate-200 dark:bg-slate-800 px-1 rounded opacity-70 pointer-events-none">Price</div>
                   <TradingViewWidget 
                      symbol={coin.symbol} 
                      isVisible={isIntersecting} 
                      theme={settings.theme}
                      interval={settings.timeframe}
                      scale={settings.chartScale}
                      chartType="price"
                   />
                </div>
                <div className="flex-1 relative">
                   <div className="absolute top-1 left-1 z-10 text-[10px] bg-slate-200 dark:bg-slate-800 px-1 rounded opacity-70 pointer-events-none">M.Cap</div>
                   <TradingViewWidget 
                      symbol={coin.symbol} 
                      isVisible={isIntersecting} 
                      theme={settings.theme}
                      interval={settings.timeframe}
                      scale={settings.chartScale}
                      chartType="market_cap"
                   />
                </div>
             </div>
          )}
        </div>

      </div>

      {/* Footer Buttons */}
      <div className="p-3 pt-0 flex flex-col gap-2 flex-shrink-0 mt-auto">
        
        {/* Row 1: External Links */}
        <div className="flex gap-2">
           <a href={`https://www.coingecko.com/en/coins/${coin.id}`} target="_blank" rel="noreferrer" className="flex-1 py-1.5 text-center text-xs font-medium border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
             CoinGecko
           </a>
           <a href={`https://coinmarketcap.com/currencies/${coin.id}`} target="_blank" rel="noreferrer" className="flex-1 py-1.5 text-center text-xs font-medium border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
             CMC
           </a>
           <button onClick={() => openProfitCalc(coin)} className="flex-1 py-1.5 text-center text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition">
             CryptoPective
           </button>
        </div>

        {/* Row 2: Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800/50 rounded-lg p-1 gap-1">
          <button 
            onClick={() => setActiveTab('price')} 
            className={`flex-1 py-1 text-[10px] sm:text-xs font-bold rounded transition ${activeTab === 'price' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
          >
            قیمت
          </button>
          <button 
            onClick={() => setActiveTab('market_cap')} 
             className={`flex-1 py-1 text-[10px] sm:text-xs font-bold rounded transition ${activeTab === 'market_cap' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
          >
            ارزش بازار
          </button>
           <button 
            onClick={() => setActiveTab('simultaneous')} 
             className={`flex-1 py-1 text-[10px] sm:text-xs font-bold rounded transition ${activeTab === 'simultaneous' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
          >
            همزمان
          </button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// MAIN APP COMPONENT
// ----------------------------------------------------------------------

const App: React.FC = () => {
  // -- State --
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isGlobalSearch, setIsGlobalSearch] = useState(false); // New flag for global search mode
  const [targetRankToOpen, setTargetRankToOpen] = useState<number | null>(null); // To auto-open drawer after jump

  // Settings / Persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('pmcrypto_settings');
    const parsed = saved ? JSON.parse(saved) : {};
    
    // Initial lists merging logic
    let initialLists: FavoriteList[] = parsed.favoriteLists || [];
    
    // Ensure the 3 permanent lists exist
    DEFAULT_PERMANENT_LISTS.forEach(defList => {
       if (!initialLists.find(l => l.id === defList.id)) {
           // If migrating from old "favorites" (string[]), add them to General
           if (defList.id === 'list_general' && parsed.favorites && Array.isArray(parsed.favorites)) {
               initialLists.push({ ...defList, coinIds: parsed.favorites });
           } else {
               initialLists.push(defList);
           }
       }
    });

    return {
      favoriteLists: initialLists,
      activeListId: parsed.activeListId || 'list_general',
      hiddenCoins: parsed.hiddenCoins || [],
      restoredGlobalCoins: parsed.restoredGlobalCoins || [],
      gridColumns: parsed.gridColumns || 3,
      viewMode: parsed.viewMode || 'grid',
      theme: parsed.theme || 'light',
      showAllCharts: parsed.showAllCharts || false,
      timeframe: parsed.timeframe || 'M',
      chartScale: parsed.chartScale || 'log',
      lastUpdated: parsed.lastUpdated || Date.now() // Init timestamp
    };
  });
  
  const [dbStatus, setDbStatus] = useState<'synced' | 'pending' | 'error' | 'offline'>('offline');

  const [filterType, setFilterType] = useState<'all' | 'gainers' | 'ath_drop' | 'favorites'>('all');
  
  // Modals & Drawers
  const [profitModal, setProfitModal] = useState<ProfitCalcState>({ isOpen: false, coin: null });
  const [drawerState, setDrawerState] = useState<{isOpen: boolean, coin: CoinData | null}>({ isOpen: false, coin: null });
  const [favModal, setFavModal] = useState<{isOpen: boolean, coinId: string | null}>({ isOpen: false, coinId: null });
  const [newListName, setNewListName] = useState('');
  
  // Ignored Management States
  const [showIgnoreModal, setShowIgnoreModal] = useState(false);
  const [ignoreModalTab, setIgnoreModalTab] = useState<'new' | 'old'>('new');
  const [ignoreSearch, setIgnoreSearch] = useState('');

  // Database Modal
  const [showDbModal, setShowDbModal] = useState(false);

  // Global Simulation Amount State
  const [simulationAmount, setSimulationAmount] = useState<number>(100);
  const [investAmount, setInvestAmount] = useState<string>('1000');

  // -- Effects --
  useEffect(() => {
    // Only load paginated data if NOT in global search mode
    if (!isGlobalSearch) {
      loadData();
    }
  }, [page, isGlobalSearch]);

  // Effect to handle Auto-Open Drawer when Target Rank is found
  useEffect(() => {
    if (targetRankToOpen !== null && !loading && coins.length > 0) {
      const targetCoin = coins.find(c => c.market_cap_rank === targetRankToOpen);
      if (targetCoin) {
        setDrawerState({ isOpen: true, coin: targetCoin });
        setTargetRankToOpen(null); // Reset after opening
      }
    }
  }, [coins, loading, targetRankToOpen]);

  // Handle Search Input clear (Revert to pagination)
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val === '' && isGlobalSearch) {
      setIsGlobalSearch(false);
    }
  };

  // Handle Enter Key for Smart Search
  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      const term = searchTerm.trim();
      const num = parseInt(term);
      
      // Case 1: Numeric Search (Rank Jump)
      // Rank 1-1000 -> Page 1, Rank 1001-2000 -> Page 2, etc.
      // Page = Math.floor((Rank - 1) / 1000) + 1
      if (!isNaN(num) && num > 0) {
        // UPDATED: Use 1000 instead of 100 for page calculation
        const targetPage = Math.floor((num - 1) / 1000) + 1;
        setPage(targetPage);
        setTargetRankToOpen(num); // Set flag to open drawer when data arrives
        setIsGlobalSearch(false); // Ensure we are in pagination mode
        setSearchTerm(''); // Clear search term so the grid shows the page content
        return;
      }

      // Case 2: String Search (Global API Search)
      setLoading(true);
      setError(null);
      setIsGlobalSearch(true);
      try {
        const results = await searchGlobal(term);
        setCoins(results);
        if (results.length === 0) {
           setError(`No results found for "${term}"`);
        }
      } catch (err: any) {
        setError("Search failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Helper to Modify Settings and Update Timestamp
  const modifySettings = useCallback((updates: Partial<AppSettings> | ((prev: AppSettings) => Partial<AppSettings>)) => {
    setSettings(prev => {
      const changes = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...changes, lastUpdated: Date.now() };
    });
  }, []);

  // Load Settings from Supabase on Mount
  useEffect(() => {
    const loadRemoteSettings = async () => {
      const clientId = getClientId();
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('settings')
          .eq('client_id', clientId)
          .single();

        if (data && data.settings) {
          console.log("Settings loaded from Supabase");
          
          const remoteSettings = data.settings as AppSettings;
          
          setSettings(prev => {
             // SMART MERGE: Only apply remote if it's newer than local
             // This prevents overwriting fresh local changes with stale/empty remote data
             const remoteTime = remoteSettings.lastUpdated || 0;
             const localTime = prev.lastUpdated || 0;

             if (remoteTime > localTime) {
                 console.log(`Applying remote settings (Remote: ${remoteTime} > Local: ${localTime})`);
                 return { ...prev, ...remoteSettings };
             } else {
                 console.log(`Keeping local settings (Local: ${localTime} >= Remote: ${remoteTime})`);
                 return prev;
             }
          });

          setDbStatus('synced');
        } else if (error && error.code === 'PGRST116') {
          // No settings found (Row doesn't exist yet)
          // We will create it on the first save
          setDbStatus('synced'); // Technically synced as we have "latest" (empty)
        } else {
            console.error("Error loading settings:", error);
            setDbStatus('error');
        }
      } catch (e) {
        console.error("Supabase connection error:", e);
        setDbStatus('error');
      }
    };
    loadRemoteSettings();
  }, []);

  // Save Settings (LocalStorage + Supabase with Debounce)
  useEffect(() => {
    // 1. Local Save (Immediate)
    localStorage.setItem('pmcrypto_settings', JSON.stringify(settings));
    
    // Apply Theme
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 2. Remote Save (Debounced)
    // This saves the ENTIRE settings object, which includes 'favoriteLists' and 'hiddenCoins'.
    // Thus fulfilling the requirement to persist these in Supabase permanently.
    setDbStatus('pending');
    const timer = setTimeout(async () => {
      const clientId = getClientId();
      try {
        // We use upsert. Requires 'client_id' to be a unique key in the DB.
        const { error } = await supabase
          .from('app_settings')
          .upsert(
            { client_id: clientId, settings: settings },
            { onConflict: 'client_id' }
          );
        
        if (error) {
            console.error("Supabase save error:", error);
            setDbStatus('error');
        } else {
            setDbStatus('synced');
        }
      } catch (e) {
         console.error("Supabase save exception:", e);
         setDbStatus('error');
      }
    }, 1500); // 1.5s debounce

    return () => clearTimeout(timer);
  }, [settings]);

  // -- Handlers --

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // API now defaults to 1000 items, but passing page is still required
      const data = await fetchCoins(page);
      setCoins(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const createFavoriteList = () => {
    if (!newListName.trim()) return;
    const newList: FavoriteList = {
      id: Date.now().toString(),
      name: newListName,
      coinIds: []
    };
    modifySettings(prev => ({
      favoriteLists: [...prev.favoriteLists, newList]
    }));
    setNewListName('');
  };

  const toggleCoinInList = (listId: string, coinId: string) => {
    modifySettings(prev => {
      const lists = prev.favoriteLists.map(list => {
        if (list.id === listId) {
          const isPresent = list.coinIds.includes(coinId);
          return {
            ...list,
            coinIds: isPresent 
              ? list.coinIds.filter(id => id !== coinId) 
              : [...list.coinIds, coinId]
          };
        }
        return list;
      });
      return { favoriteLists: lists };
    });
  };

  const deleteList = (listId: string) => {
    // Prevent deleting default lists
    if (listId.startsWith('list_')) {
        alert("This is a permanent system list and cannot be deleted.");
        return;
    }
    if (confirm("Delete this list?")) {
      modifySettings(prev => ({
        favoriteLists: prev.favoriteLists.filter(l => l.id !== listId)
      }));
    }
  };

  const hideCoin = (id: string) => {
    modifySettings(prev => ({ hiddenCoins: [...prev.hiddenCoins, id] }));
  };
  
  const restoreUserHiddenCoin = (id: string) => {
      modifySettings(prev => ({
          hiddenCoins: prev.hiddenCoins.filter(cId => cId !== id)
      }));
  };

  const toggleRestoredGlobal = (id: string) => {
      modifySettings(prev => {
          const isRestored = prev.restoredGlobalCoins.includes(id);
          return {
              restoredGlobalCoins: isRestored 
                ? prev.restoredGlobalCoins.filter(cId => cId !== id) // Re-ignore
                : [...prev.restoredGlobalCoins, id] // Restore
          };
      });
  };

  const restoreHidden = () => {
    modifySettings({ hiddenCoins: [] });
  };

  const toggleTheme = () => {
    modifySettings(prev => ({ theme: prev.theme === 'dark' ? 'light' : 'dark' }));
  };

  const toggleAllCharts = () => {
    modifySettings(prev => ({ showAllCharts: !prev.showAllCharts }));
  };

  const setTimeframe = (tf: Timeframe) => {
    modifySettings({ timeframe: tf });
  };

  const toggleScale = () => {
    modifySettings(prev => ({ chartScale: prev.chartScale === 'log' ? 'linear' : 'log' }));
  };

  const handleCopyAnalysis = (coin: CoinData) => {
    const prompt = `Please act as a professional crypto analyst. Provide a comprehensive technical and fundamental analysis for ${coin.name} (${coin.symbol.toUpperCase()}).

Current Data:
- Price: ${formatCurrency(coin.current_price)}
- 24h Change: ${coin.price_change_percentage_24h?.toFixed(2)}%
- Market Cap: ${formatCompactNumber(coin.market_cap)}
- Total Volume: ${formatCompactNumber(coin.total_volume)}
- Distance from ATH: ${coin.ath_change_percentage?.toFixed(2)}% (ATH: ${formatCurrency(coin.ath)})

Key Request:
1. Analyze the short-term and long-term price structure.
2. Identify key support and resistance levels.
3. Review any recent news or fundamental developments.
4. Provide a risk assessment and potential outlook.

Thank you.`;

    navigator.clipboard.writeText(prompt).then(() => {
      alert(`Analysis prompt for ${coin.name} copied to clipboard! You can now paste it into Gemini.`);
    });
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "pmcrypto_settings.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        // Basic validation
        if (imported.favoriteLists || imported.favorites) {
            // Handle migration if importing old config
             if (imported.favorites && !imported.favoriteLists) {
                imported.favoriteLists = [{ id: 'list_general', name: 'General', coinIds: imported.favorites }];
                delete imported.favorites;
             }
            modifySettings(imported); // Use modifySettings to update timestamp
            alert('Settings imported successfully!');
        } else {
            throw new Error();
        }
      } catch (e) {
        alert('Invalid file format or corrupt data.');
      }
    };
    reader.readAsText(file);
  };
  
  const handleCopySQL = () => {
    const sql = `
-- Create a table for storing user settings and favorites
create table if not exists public.app_settings (
  id bigint generated by default as identity primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  settings jsonb not null default '{}'::jsonb,
  client_id text
);

-- IMPORTANT: Make client_id unique to enable UPSERT operations
alter table public.app_settings add constraint app_settings_client_id_key unique (client_id);

-- Enable Row Level Security (RLS)
alter table public.app_settings enable row level security;

-- Create a policy to allow public access (demo mode)
create policy "Enable public access for all operations"
on public.app_settings
as permissive
for all
to public
using (true)
with check (true);
    `;
    navigator.clipboard.writeText(sql.trim()).then(() => {
        alert("SQL Code copied to clipboard!");
    });
  };

  // -- Derived State --
  const filteredCoins = useMemo(() => {
    // If Global Search mode is active, we don't want to filter by the term locally 
    // unless we want to refine the search results.
    // BUT: For numeric rank jump, we DO want to filter locally.
    
    // Check if numeric (Rank Jump Mode)
    const isNumericSearch = !isNaN(parseInt(searchTerm));

    // FILTER COINS:
    // 1. Exclude user-hidden coins (settings.hiddenCoins)
    // 2. Exclude globally ignored coins (IGNORED_COINS_SET) UNLESS they are in restoredGlobalCoins
    let result = coins.filter(c => {
      // If hidden by user, exclude
      if (settings.hiddenCoins.includes(c.id)) return false;
      
      // If in global ignore list...
      if (IGNORED_COINS_SET.has(c.id)) {
          // ...but is restored, keep it
          if (settings.restoredGlobalCoins.includes(c.id)) return true;
          // ...otherwise exclude
          return false;
      }
      
      return true;
    });

    if (searchTerm) {
      const lower = searchTerm.toLowerCase().trim();
      
      // If we are in global search mode (string search), 'coins' already contains only the results.
      // We shouldn't filter them out unless the user types more. 
      // However, usually API returns matches.
      
      // If Numeric Search (Rank Jump): We MUST filter to show only that rank on the current page.
      if (isNumericSearch) {
         result = result.filter(c => c.market_cap_rank.toString() === lower);
      } else if (!isGlobalSearch) {
         // Standard local filter (filtering current page 100 items)
         result = result.filter(c => 
           c.name.toLowerCase().includes(lower) || 
           c.symbol.toLowerCase().includes(lower)
         );
      }
    }

    switch (filterType) {
      case 'favorites':
        // Filter by the currently active list ID
        const activeList = settings.favoriteLists.find(l => l.id === settings.activeListId);
        if (activeList) {
          result = result.filter(c => activeList.coinIds.includes(c.id));
        }
        break;
      case 'gainers':
        result = result.sort((a, b) => (b.price_change_percentage_24h ?? -Infinity) - (a.price_change_percentage_24h ?? -Infinity));
        break;
      case 'ath_drop':
        result = result.sort((a, b) => (a.ath_change_percentage ?? 0) - (b.ath_change_percentage ?? 0));
        break;
    }

    return result;
  }, [coins, searchTerm, filterType, settings.favoriteLists, settings.activeListId, settings.hiddenCoins, settings.restoredGlobalCoins, isGlobalSearch]);

  // -- Render Helpers --

  const renderFavoriteModal = () => {
      if (!favModal.isOpen || !favModal.coinId) return null;
      const coin = coins.find(c => c.id === favModal.coinId);
      if (!coin) return null;

      return (
        <Modal isOpen={favModal.isOpen} onClose={() => setFavModal({isOpen: false, coinId: null})} title={`Manage Favorites: ${coin.name}`}>
            <div className="space-y-4">
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {settings.favoriteLists.map(list => {
                        const isChecked = list.coinIds.includes(coin.id);
                        const isPermanent = list.id.startsWith('list_'); // Check if permanent list
                        return (
                            <label key={list.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-500'}`}>
                                        {isChecked && <Check size={12} />}
                                    </div>
                                    <span className="font-medium">{list.name}</span>
                                    <span className="text-xs text-slate-400">({list.coinIds.length})</span>
                                </div>
                                <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={isChecked}
                                    onChange={() => toggleCoinInList(list.id, coin.id)}
                                />
                                {!isPermanent && (
                                    <button 
                                      onClick={(e) => { e.preventDefault(); deleteList(list.id); }}
                                      className="text-slate-400 hover:text-red-500 p-1"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </label>
                        )
                    })}
                </div>
                
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="New List Name..." 
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-sm outline-none focus:border-blue-500"
                        />
                        <button 
                            onClick={createFavoriteList}
                            disabled={!newListName.trim()}
                            className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
      );
  };

  const renderProfitCalculator = () => {
    if (!profitModal.coin) return null;
    const current = profitModal.coin.current_price;
    const ath = profitModal.coin.ath;
    const amount = parseFloat(investAmount) || 0;
    const coinsOwned = amount / current;
    const potentialValue = coinsOwned * ath;
    const profit = potentialValue - amount;
    const xMultiplier = ath / current;

    return (
      <Modal 
        isOpen={profitModal.isOpen} 
        onClose={() => setProfitModal({ isOpen: false, coin: null })} 
        title={`Profit Calculator: ${profitModal.coin.name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Investment Amount ($)</label>
            <input 
              type="number" 
              value={investAmount} 
              onChange={(e) => setInvestAmount(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none p-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="bg-slate-100 dark:bg-slate-900/50 p-3 rounded-none space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Current Price:</span>
              <span className="text-slate-900 dark:text-slate-200">{formatCurrency(current)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">ATH Price:</span>
              <span className="text-slate-900 dark:text-slate-200">{formatCurrency(ath)}</span>
            </div>
            <div className="border-t border-slate-300 dark:border-slate-700 my-2 pt-2">
               <div className="flex justify-between font-bold text-green-600 dark:text-green-400">
                <span>Potential Profit:</span>
                <span>+{formatCurrency(profit)} ({xMultiplier ? xMultiplier.toFixed(1) : '-'}x)</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    );
  };
  
  const renderIgnoredManagementModal = () => {
    return (
        <Modal 
            isOpen={showIgnoreModal} 
            onClose={() => setShowIgnoreModal(false)} 
            title="Ignored Coins Management"
        >
            <div className="flex flex-col h-[60vh]">
                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
                    <button 
                        onClick={() => setIgnoreModalTab('new')}
                        className={`flex-1 pb-2 text-sm font-bold border-b-2 transition ${ignoreModalTab === 'new' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        NEW (User Hidden) <span className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 rounded-full ml-1">{settings.hiddenCoins.length}</span>
                    </button>
                    <button 
                        onClick={() => setIgnoreModalTab('old')}
                        className={`flex-1 pb-2 text-sm font-bold border-b-2 transition ${ignoreModalTab === 'old' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                    >
                        OLD (Global Blocked) <span className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 rounded-full ml-1">{IGNORED_COINS_GLOBAL.length}</span>
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder={`Search ${ignoreModalTab === 'new' ? 'hidden' : 'blocked'} coins...`}
                        value={ignoreSearch}
                        onChange={(e) => setIgnoreSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                    {ignoreModalTab === 'new' ? (
                        // NEW TAB: User Hidden Coins
                        settings.hiddenCoins.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-sm">No coins hidden by you.</div>
                        ) : (
                            settings.hiddenCoins
                                .filter(id => id.includes(ignoreSearch.toLowerCase()))
                                .map(id => {
                                    const coinInfo = coins.find(c => c.id === id); // Try to find live info
                                    return (
                                        <div key={id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-2">
                                                {coinInfo && <img src={coinInfo.image} className="w-5 h-5 rounded-full" />}
                                                <span className="text-sm font-medium">{coinInfo ? coinInfo.name : formatCoinIdName(id)}</span>
                                            </div>
                                            <button 
                                                onClick={() => restoreUserHiddenCoin(id)}
                                                className="text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 text-xs flex items-center gap-1 font-medium bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded"
                                            >
                                                <Undo2 size={12} /> Restore
                                            </button>
                                        </div>
                                    )
                                })
                        )
                    ) : (
                        // OLD TAB: Global Ignored Coins
                        IGNORED_COINS_GLOBAL
                             .filter(id => id.includes(ignoreSearch.toLowerCase()))
                             .map(id => {
                                 const isRestored = settings.restoredGlobalCoins.includes(id);
                                 return (
                                     <div key={id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-700">
                                         <div className="flex flex-col">
                                            <span className="text-sm font-medium">{formatCoinIdName(id)}</span>
                                            <span className="text-xs text-slate-400">{id}</span>
                                         </div>
                                         <button 
                                             onClick={() => toggleRestoredGlobal(id)}
                                             className={`text-xs flex items-center gap-1 font-medium px-2 py-1 rounded transition ${
                                                 isRestored 
                                                 ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100' 
                                                 : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-500 hover:bg-green-100'
                                             }`}
                                         >
                                             {isRestored ? <><Ban size={12} /> Re-Block</> : <><Undo2 size={12} /> Restore</>}
                                         </button>
                                     </div>
                                 )
                             })
                    )}
                </div>
            </div>
        </Modal>
    );
  };
  
  const renderDatabaseModal = () => (
      <Modal isOpen={showDbModal} onClose={() => setShowDbModal(false)} title="Database Setup Required">
        <div className="space-y-4">
           <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded text-sm border border-blue-100 dark:border-blue-800">
             Supabase protects your data by default. To allow this app to save settings remotely, you must run the SQL below to create tables and enable public access.
           </div>
           
           <div className="relative group">
              <pre className="bg-slate-900 text-slate-300 p-3 rounded text-xs font-mono overflow-x-auto border border-slate-700">
{`-- Create a table for storing user settings and favorites
create table if not exists public.app_settings (
  id bigint generated by default as identity primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  settings jsonb not null default '{}'::jsonb,
  client_id text
);

-- IMPORTANT: Make client_id unique to enable UPSERT operations
alter table public.app_settings add constraint app_settings_client_id_key unique (client_id);

-- Enable Row Level Security (RLS)
alter table public.app_settings enable row level security;

-- Create a policy to allow public access (demo mode)
create policy "Enable public access for all operations"
on public.app_settings
as permissive
for all
to public
using (true)
with check (true);`}
              </pre>
              <button 
                onClick={handleCopySQL}
                className="absolute top-2 right-2 p-1 bg-slate-700 text-white rounded hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition"
              >
                <Copy size={14} />
              </button>
           </div>
           
           <div className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
             <p><strong>Instructions:</strong></p>
             <ol className="list-decimal pl-4 space-y-1">
               <li>Click <strong>Copy SQL</strong> (hover over the code block).</li>
               <li>Go to your <a href="https://supabase.com/dashboard/project/pwsarhttuhdlwjsfigcx/sql" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Supabase SQL Editor</a>.</li>
               <li>Paste the code and click <strong>Run</strong>.</li>
               <li>Come back here and try adding a wallet!</li>
             </ol>
           </div>
        </div>
      </Modal>
  );

  // -- Main Render --
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans selection:bg-blue-500/30 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="w-full px-4 md:px-6 py-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Logo & Title */}
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 dark:bg-gradient-to-br dark:from-blue-600 dark:to-indigo-600 p-2 rounded-none shadow-lg">
                <TrendingUp className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  PMcrypto
                </h1>
                <p className="text-xs text-slate-500">Professional Market Analytics</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-1 md:justify-end items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
              
              {/* Search */}
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Search Rank or Name (Enter)" 
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  onKeyDown={handleSearchKeyDown}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition-all w-32 md:w-64 dark:text-white text-slate-900"
                  title="Enter rank number (e.g. 2000) to jump to page, or text to search globally"
                />
              </div>

              <div className="h-6 w-px bg-slate-300 dark:bg-slate-800 mx-1"></div>

              {/* Simulation Amount Input */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-none overflow-hidden">
                <div className="px-2 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-r border-slate-300 dark:border-slate-600">
                  <DollarSign size={14} />
                </div>
                <input 
                  type="number" 
                  min="1"
                  value={simulationAmount}
                  onChange={(e) => setSimulationAmount(Number(e.target.value))}
                  className="w-16 bg-transparent text-xs font-mono font-bold px-2 py-1.5 focus:outline-none text-slate-900 dark:text-white"
                  title="Simulation Investment Amount"
                />
              </div>

              {/* Timeframe Selector */}
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-none p-1 border border-slate-200 dark:border-slate-700">
                {(['15', '60', '240', 'D', 'W', 'M'] as const).map((tf) => (
                  <button 
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-0.5 text-xs font-mono font-bold rounded-none transition ${
                      settings.timeframe === tf 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tf === '60' ? '1H' : tf === '240' ? '4H' : tf}
                  </button>
                ))}
              </div>

              {/* Scale Selector */}
              <button
                onClick={toggleScale}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-none border border-slate-200 dark:border-slate-700 transition ${
                  settings.chartScale === 'log'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Toggle Logarithmic/Linear Scale"
              >
                <BarChart2 size={14} />
                {settings.chartScale === 'log' ? 'LOG' : 'LIN'}
              </button>

               {/* View Toggles */}
               <div className="flex bg-slate-100 dark:bg-slate-800 rounded-none p-1 border border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => modifySettings({ viewMode: 'grid' })}
                  className={`p-1.5 rounded-none ${settings.viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                  title="Grid View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => modifySettings({ viewMode: 'table' })}
                  className={`p-1.5 rounded-none ${settings.viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                  title="Table View"
                >
                  <List size={18} />
                </button>
              </div>

              {/* Filters */}
              <div className="relative flex">
                <select 
                  className="appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-l-none pl-3 pr-8 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                >
                  <option value="all">All Coins</option>
                  <option value="gainers">Top Gainers</option>
                  <option value="ath_drop">Dip from ATH</option>
                  <option value="favorites">Favorites</option>
                </select>
                
                {/* Secondary Select for Favorite Lists */}
                {filterType === 'favorites' && (
                     <select 
                        className="appearance-none border-l-0 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-none px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                        value={settings.activeListId}
                        onChange={(e) => modifySettings({ activeListId: e.target.value })}
                     >
                        {settings.favoriteLists.map(list => (
                            <option key={list.id} value={list.id}>{list.name}</option>
                        ))}
                     </select>
                )}
                
                <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={14} />
              </div>

              {/* Grid Columns (Only in Grid Mode) */}
              {settings.viewMode === 'grid' && (
                <div className="hidden md:flex gap-1">
                  {[1, 2, 3, 4].map(col => (
                    <button
                      key={col}
                      onClick={() => modifySettings({ gridColumns: col as GridColumns })}
                      className={`w-7 h-7 flex items-center justify-center text-xs font-mono rounded-none border ${
                        settings.gridColumns === col 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              )}

              {/* Global Chart Toggle */}
              {settings.viewMode === 'grid' && (
                <button 
                  onClick={toggleAllCharts}
                  className={`p-2 rounded-none transition ${settings.showAllCharts ? 'bg-blue-100 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400' : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
                  title="Toggle All Charts"
                >
                  <Activity size={18} />
                </button>
              )}

              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                title="Toggle Theme"
              >
                {settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Ignored Management Button - REPLACES old EyeOff button */}
              <button 
                onClick={() => setShowIgnoreModal(true)} 
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white relative group"
                title="Manage Ignored & Hidden Coins"
              >
                <Ban size={18} />
                {settings.hiddenCoins.length > 0 && (
                  <span className="absolute top-0 right-0 flex items-center justify-center h-4 w-4 text-[9px] font-bold text-white bg-red-500 rounded-full">
                      {settings.hiddenCoins.length}
                  </span>
                )}
              </button>
              
               {/* Database Button */}
              <button 
                onClick={() => setShowDbModal(true)} 
                className={`p-2 transition ${dbStatus === 'synced' ? 'text-green-500' : dbStatus === 'error' ? 'text-red-500 animate-pulse' : dbStatus === 'pending' ? 'text-yellow-500' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
                title={dbStatus === 'error' ? "Database Sync Failed - Click to Fix" : "Database Connection"}
              >
                {dbStatus === 'synced' || dbStatus === 'pending' ? <Cloud size={18} /> : <Database size={18} />}
              </button>

              <button onClick={handleExport} className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" title="Export Settings">
                <Download size={18} />
              </button>
              
              <label className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer" title="Import Settings">
                <Upload size={18} />
                <input type="file" className="hidden" accept=".json" onChange={handleImport} />
              </label>

            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 md:px-6 py-6">
        
        {isGlobalSearch && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded flex items-center justify-between">
             <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
               <Globe size={18} />
               <span className="text-sm font-medium">Global Search Results for "{searchTerm}"</span>
             </div>
             <button 
               onClick={() => { setSearchTerm(''); setIsGlobalSearch(false); }}
               className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
             >
               Clear Search
             </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCcw className="animate-spin text-blue-500" size={40} />
            <p className="text-slate-500 dark:text-slate-400 animate-pulse">Analyzing market data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/50 text-red-600 dark:text-red-400 p-4 rounded-none flex items-center gap-3 mb-6">
            <AlertCircle size={24} />
            <div>
              <p className="font-bold">Error fetching data</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
            <button 
              onClick={loadData}
              className="ml-auto bg-white/50 dark:bg-red-500/20 hover:bg-white dark:hover:bg-red-500/30 px-4 py-2 rounded-none transition"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Top Pagination Controls */}
            {!isGlobalSearch && (
              <div className="mb-6 flex flex-col items-center gap-2">
                <div className="flex justify-center items-center gap-4">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-none disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <div className="text-center">
                    <span className="text-slate-900 dark:text-white font-bold block">Page {page}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                       Ranks {(page - 1) * 1000 + 1} - {page * 1000}
                    </span>
                  </div>
                  <button 
                    onClick={() => setPage(p => p + 1)}
                    className="flex items-center gap-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-none hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {settings.viewMode === 'grid' ? (
              <div className={`grid gap-4 ${
                settings.gridColumns === 1 ? 'grid-cols-1' :
                settings.gridColumns === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                settings.gridColumns === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
                'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              }`}>
                {filteredCoins.map(coin => (
                   <CoinCard 
                      key={coin.id} 
                      coin={coin} 
                      settings={settings} 
                      onFavoriteClick={(id) => setFavModal({isOpen: true, coinId: id})}
                      hideCoin={hideCoin}
                      openProfitCalc={(c) => setProfitModal({isOpen: true, coin: c})}
                      onCopyAnalysis={handleCopyAnalysis}
                      simulationAmount={simulationAmount}
                   />
                ))}
              </div>
            ) : (
              // Table View
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden overflow-x-auto shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Rank</th> {/* New Rank Column */}
                      <th className="px-4 py-3">Asset</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">24h %</th>
                      <th className="px-4 py-3 text-right">7d %</th>
                      <th className="px-4 py-3 text-right">Market Cap</th>
                      <th className="px-4 py-3 text-right">Vol (24h)</th>
                      <th className="px-4 py-3 text-right">From ATH</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredCoins.map(coin => {
                       const isFavorite = settings.favoriteLists.some(list => list.coinIds.includes(coin.id));
                       return (
                      <tr 
                         key={coin.id} 
                         className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                         onClick={() => setDrawerState({ isOpen: true, coin: coin })} // Row click to open drawer
                      >
                         <td className="px-4 py-3 font-mono text-slate-500">#{coin.market_cap_rank}</td> {/* Rank Data */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setFavModal({isOpen: true, coinId: coin.id}); }}
                                className="hover:scale-110 transition"
                            >
                              <Star size={14} className={isFavorite ? "text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400" : "text-slate-300 dark:text-slate-600"} />
                            </button>
                            <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{coin.symbol.toUpperCase()}</span>
                              <span className="text-slate-500 ml-2 hidden sm:inline">{coin.name}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-800 dark:text-slate-200">{formatCurrency(coin.current_price)}</td>
                        <td className="px-4 py-3 text-right"><PercentageBadge value={coin.price_change_percentage_24h} /></td>
                        <td className="px-4 py-3 text-right"><PercentageBadge value={coin.price_change_percentage_7d_in_currency || 0} /></td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500 dark:text-slate-400">{formatCompactNumber(coin.market_cap)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500 dark:text-slate-400">{formatCompactNumber(coin.total_volume)}</td>
                        <td className="px-4 py-3 text-right text-red-500 dark:text-red-400">{coin.ath_change_percentage?.toFixed(1) ?? '-'}%</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                             <button onClick={(e) => { e.stopPropagation(); handleCopyAnalysis(coin); }} className="text-slate-400 hover:text-purple-600 dark:hover:text-purple-400" title="AI Analysis">
                               <BrainCircuit size={16} />
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); setProfitModal({isOpen: true, coin}); }} className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                               <Calculator size={16} />
                             </button>
                             <a 
                               href={`https://www.coingecko.com/en/coins/${coin.id}`} 
                               target="_blank" 
                               rel="noreferrer"
                               onClick={(e) => e.stopPropagation()}
                               className="text-slate-400 hover:text-slate-800 dark:hover:text-white"
                             >
                               <ExternalLink size={16} />
                             </a>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination Controls */}
            {!isGlobalSearch && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <div className="flex justify-center items-center gap-4">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-none disabled:opacity-50 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    <ChevronLeft size={16} /> Previous
                  </button>
                  <div className="text-center">
                    <span className="text-slate-900 dark:text-white font-bold block">Page {page}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                       Ranks {(page - 1) * 1000 + 1} - {page * 1000}
                    </span>
                  </div>
                  <button 
                    onClick={() => setPage(p => p + 1)}
                    className="flex items-center gap-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-none hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Render Modals and Drawers */}
      {renderProfitCalculator()}
      {renderFavoriteModal()}
      {renderIgnoredManagementModal()}
      {renderDatabaseModal()}
      <Drawer 
         isOpen={drawerState.isOpen} 
         coin={drawerState.coin} 
         onClose={() => setDrawerState({isOpen: false, coin: null})} 
         settings={settings}
      />

    </div>
  );
};

export default App;