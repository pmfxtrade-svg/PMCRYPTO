import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  LayoutGrid, List, Settings, Filter, Search, ChevronLeft, ChevronRight, 
  RefreshCcw, Star, EyeOff, TrendingUp, DollarSign, ExternalLink, 
  MoreHorizontal, Calculator, Copy, Download, Upload, AlertCircle, X,
  Sun, Moon, Activity, Clock, BarChart2, Maximize2, Minimize2, Copy as CopyIcon,
  BrainCircuit, Sparkles, Plus, Check, Trash2, ChevronDown, Database, Cloud, CloudOff,
  Globe, Ban, Undo2, History, Smartphone, RefreshCw, User, LogOut, Lock, Mail,
  CheckCircle, Info, XCircle, Eye
} from 'lucide-react';
import { fetchCoins, searchGlobal } from './services/api';
import { CoinData, AppSettings, ProfitCalcState, GridColumns, Theme, Timeframe, ChartScale, FavoriteList } from './types';
import TradingViewWidget from './components/TradingViewWidget';
import { supabase } from './services/supabaseClient';
import { IGNORED_COINS_GLOBAL } from './constants/ignoredCoins';
import { Session } from '@supabase/supabase-js';

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

const formatCompactNumber = (number: number | null | undefined) => {
  if (number === null || number === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1
  }).format(number);
};

const formatCoinIdName = (id: string) => {
  return id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const DEFAULT_PERMANENT_LISTS: FavoriteList[] = [
  { id: 'list_general', name: 'General', coinIds: [] },
  { id: 'list_to_ath', name: 'To Ath', coinIds: [] },
  { id: 'list_performance', name: 'Performance', coinIds: [] }
];

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
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full md:w-[95vw] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-shrink-0">
          <div className="flex items-center gap-4">
             <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
             <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">{coin.name}</h2>
                <span className="text-sm text-slate-500 uppercase font-medium">{coin.symbol}</span>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition">
            <X size={28} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
           <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold text-slate-900 dark:text-white tracking-tight">{formatCurrency(coin.current_price)}</span>
              <span className={`text-xl font-medium px-2.5 py-0.5 rounded-full ${coin.price_change_percentage_24h && coin.price_change_percentage_24h >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                {coin.price_change_percentage_24h ? (coin.price_change_percentage_24h >= 0 ? '+' : '') + coin.price_change_percentage_24h.toFixed(2) : '0.00'}%
              </span>
           </div>
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
  const [activeTab, setActiveTab] = useState<'price' | 'market_cap' | 'simultaneous'>('price');
  const cardRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIntersecting] = useState(false);
  const isFavorite = settings.favoriteLists.some(list => list.coinIds.includes(coin.id));

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setIntersecting(entry.isIntersecting), { rootMargin: '100px' });
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);
  
  // Detailed Calculations
  const athDrop = coin.ath_change_percentage ?? 0;
  const toAth = coin.current_price > 0 ? ((coin.ath - coin.current_price) / coin.current_price) * 100 : 0;
  const multiplier = coin.current_price > 0 ? coin.ath / coin.current_price : 0;
  const potentialValue = simulationAmount * multiplier;
  const circPercentage = coin.total_supply ? (coin.circulating_supply / coin.total_supply) * 100 : 0;

  // UPDATED: Increased Font Sizes
  const PercentageStat = ({ label, value }: { label: string, value: number | null | undefined }) => {
     const val = value ?? 0;
     const isUp = val >= 0;
     return (
       <div className="flex justify-between items-baseline gap-1 mb-1">
         <span className="text-slate-500 font-medium text-[11px]">{label}:</span>
         <span className={`font-bold font-mono text-xs ${isUp ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
           {isUp ? '+' : ''}{val.toFixed(1)}%
         </span>
       </div>
     );
  };

  // UPDATED: Increased Font Sizes
  const StatItem = ({ label, value, colorClass = "text-slate-800 dark:text-slate-200" }: { label: string, value: string, colorClass?: string }) => (
    <div className="flex justify-between items-baseline gap-1 mb-1">
      <span className="text-slate-500 font-medium text-[11px]">{label}:</span>
      <span className={`font-bold font-mono text-xs ${colorClass}`}>{value}</span>
    </div>
  );

  return (
    <div ref={cardRef} className="aspect-square bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm flex flex-col relative group">
      <div className="p-3 flex justify-between items-start flex-shrink-0 z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-none text-slate-900 dark:text-white uppercase">{coin.symbol}</span>
            <span className="text-[10px] text-slate-500">#{coin.market_cap_rank} {coin.name}</span>
            {/* NEW: External Links */}
            <div className="flex gap-1 mt-1">
                <a href={`https://www.coingecko.com/en/coins/${coin.id}`} target="_blank" rel="noreferrer" className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-green-100 dark:hover:bg-green-900 text-slate-600 dark:text-slate-400 hover:text-green-600 px-1.5 rounded transition">CG</a>
                <a href={`https://coinmarketcap.com/currencies/${coin.id}`} target="_blank" rel="noreferrer" className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900 text-slate-600 dark:text-slate-400 hover:text-blue-600 px-1.5 rounded transition">CMC</a>
                <a href={`https://dexscreener.com/search?q=${coin.symbol}`} target="_blank" rel="noreferrer" className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900 text-slate-600 dark:text-slate-400 hover:text-purple-600 px-1.5 rounded transition">DEX</a>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onFavoriteClick(coin.id)}>
             <Star size={18} className={isFavorite ? "text-yellow-400 fill-yellow-400" : "text-slate-300 dark:text-slate-600 hover:text-yellow-400"} />
          </button>
          <button onClick={() => onCopyAnalysis(coin)} className="text-slate-300 dark:text-slate-600 hover:text-purple-500"><BrainCircuit size={18} /></button>
          <button onClick={() => hideCoin(coin.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-500"><X size={18} /></button>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-3 relative min-h-0">
        <div className="flex justify-between items-end mb-2 border-b dark:border-slate-800 pb-2">
          <span className="text-2xl font-bold tracking-tight">{formatCurrency(coin.current_price)}</span>
          <PercentageBadge value={coin.price_change_percentage_24h} />
        </div>

        <div className="w-full grid grid-cols-5 gap-1.5 content-start flex-shrink-0 border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
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
                <span className="text-slate-500 font-medium text-[11px]">Drop:</span>
                <span className="text-red-500 font-bold font-mono text-xs">{athDrop.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-baseline gap-1 mb-1">
                <span className="text-slate-500 font-medium whitespace-nowrap text-[11px]">To ATH:</span>
                <span className="text-green-600 dark:text-green-400 font-bold font-mono text-xs">+{toAth.toFixed(0)}%</span>
            </div>
          </div>

          {/* Col 3: Market Info */}
          <div className="flex flex-col px-1 border-r border-slate-100 dark:border-slate-800">
              <StatItem label="Cap" value={formatCompactNumber(coin.market_cap)} />
              <StatItem label="Vol" value={formatCompactNumber(coin.total_volume)} />
              <div className="flex justify-between items-baseline gap-1 mt-0.5 mb-1">
                <span className="text-slate-500 font-medium text-[11px]">Rank:</span>
                <span className="text-blue-500 font-bold text-xs">#{coin.market_cap_rank}</span>
              </div>
          </div>

          {/* Col 4: Supply */}
          <div className="flex flex-col px-1 border-r border-slate-100 dark:border-slate-800">
            <StatItem label="Total" value={formatCompactNumber(coin.total_supply)} />
            <StatItem label="Circ" value={formatCompactNumber(coin.circulating_supply)} />
            <div className="flex justify-between items-baseline gap-1 mt-0.5 mb-1">
                <span className="text-slate-500 font-medium text-[11px]">Circ %:</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold font-mono text-xs">{circPercentage.toFixed(1)}%</span>
            </div>
          </div>

          {/* Col 5: Investment/Sim (To ATH) */}
          <div className="flex flex-col pl-1">
            <StatItem label="Inv" value={`$${simulationAmount}`} />
            <StatItem label="Val" value={formatCurrency(potentialValue)} colorClass="text-blue-600 dark:text-blue-400" />
            <StatItem label="X" value={`${multiplier.toFixed(1)}x`} colorClass="text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className="flex-1 w-full min-h-0 mb-2 rounded bg-slate-50 dark:bg-slate-950/50 overflow-hidden">
          {activeTab === 'price' && <TradingViewWidget symbol={coin.symbol} isVisible={isIntersecting} theme={settings.theme} interval={settings.timeframe} scale={settings.chartScale} chartType="price" />}
          {activeTab === 'market_cap' && <TradingViewWidget symbol={coin.symbol} isVisible={isIntersecting} theme={settings.theme} interval={settings.timeframe} scale={settings.chartScale} chartType="market_cap" />}
          {activeTab === 'simultaneous' && (
             <div className="flex flex-col h-full gap-0.5">
                <div className="flex-1 relative"><TradingViewWidget symbol={coin.symbol} isVisible={isIntersecting} theme={settings.theme} interval={settings.timeframe} scale={settings.chartScale} chartType="price" /></div>
                <div className="flex-1 relative border-t dark:border-slate-800"><TradingViewWidget symbol={coin.symbol} isVisible={isIntersecting} theme={settings.theme} interval={settings.timeframe} scale={settings.chartScale} chartType="market_cap" /></div>
             </div>
          )}
        </div>
      </div>

      <div className="p-3 pt-0 flex flex-col gap-2 mt-auto">
        <div className="flex bg-slate-100 dark:bg-slate-800/50 rounded p-1 gap-1">
          {(['price', 'market_cap', 'simultaneous'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-1 text-[10px] font-bold rounded transition ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}>
              {tab === 'price' ? 'قیمت' : tab === 'market_cap' ? 'ارزش' : 'همزمان'}
            </button>
          ))}
        </div>
        <button onClick={() => openProfitCalc(coin)} className="w-full py-1.5 text-xs font-bold bg-blue-600 text-white rounded hover:bg-blue-700 transition">CryptoPective</button>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// MAIN APP COMPONENT
// ----------------------------------------------------------------------

interface Toast { id: number; message: string; type: 'success' | 'error' | 'info'; }

const App: React.FC = () => {
  const [coins, setCoins] = useState<CoinData[]>([]); 
  const [loading, setLoading] = useState<boolean>(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [totalItemsLoaded, setTotalItemsLoaded] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 500;
  const MAX_COINS = 10000;
  
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isGlobalSearch, setIsGlobalSearch] = useState(false); 
  
  // Auth & Settings State
  const [session, setSession] = useState<Session | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dbStatus, setDbStatus] = useState<'synced' | 'pending' | 'error' | 'offline'>('offline');

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('pmcrypto_settings');
    const parsed = saved ? JSON.parse(saved) : {};
    let initialLists: FavoriteList[] = parsed.favoriteLists || [];
    DEFAULT_PERMANENT_LISTS.forEach(defList => {
       if (!initialLists.find(l => l.id === defList.id)) initialLists.push(defList);
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
      lastUpdated: parsed.lastUpdated || 0 
    };
  });
  
  // UI State
  const [filterType, setFilterType] = useState<'all' | 'gainers' | 'ath_drop' | 'favorites'>('all');
  const [profitModal, setProfitModal] = useState<ProfitCalcState>({ isOpen: false, coin: null });
  const [drawerState, setDrawerState] = useState<{isOpen: boolean, coin: CoinData | null}>({ isOpen: false, coin: null });
  const [favModal, setFavModal] = useState<{isOpen: boolean, coinId: string | null}>({ isOpen: false, coinId: null });
  const [showIgnoreModal, setShowIgnoreModal] = useState(false);
  const [ignoreListTab, setIgnoreListTab] = useState<'new' | 'old'>('new');
  const [simulationAmount, setSimulationAmount] = useState<number>(100);

  // Auth Modal States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'sql'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // 1. Initial Load: First 500 coins FAST
  useEffect(() => {
    const initialLoad = async () => {
       setLoading(true);
       try {
          // Fetch Page 1 (500 items) immediately
          const batch1 = await fetchCoins(1, 500);
          setCoins(batch1);
          setTotalItemsLoaded(batch1.length);
          setLoadedBatches(new Set([1]));
       } catch (err: any) {
          setError(err.message);
       } finally {
          setLoading(false);
       }
    };
    initialLoad();
  }, []);

  // 2. Persist 'Loaded' count to LocalStorage whenever it changes
  useEffect(() => {
    if (totalItemsLoaded > 0) {
      localStorage.setItem('pmcrypto_last_total_loaded', totalItemsLoaded.toString());
    }
  }, [totalItemsLoaded]);

  // 3. Progressive Background Loader (Up to 10,000) - Every 15 seconds
  useEffect(() => {
    if (loading || isGlobalSearch) return;

    const interval = setInterval(async () => {
       if (totalItemsLoaded >= MAX_COINS) {
           clearInterval(interval);
           return;
       }

       setBackgroundLoading(true);
       const nextBatchId = Math.floor(totalItemsLoaded / 500) + 1;
       
       if (!loadedBatches.has(nextBatchId)) {
           try {
              const newData = await fetchCoins(nextBatchId, 500);
              setCoins(prev => {
                  const newIds = new Set(newData.map(c => c.id));
                  return [...prev.filter(c => !newIds.has(c.id)), ...newData].sort((a,b) => a.market_cap_rank - b.market_cap_rank);
              });
              setLoadedBatches(prev => new Set([...prev, nextBatchId]));
              setTotalItemsLoaded(prev => prev + newData.length);
           } catch (e) {
              console.warn("Background batch fetch failed, retrying next interval...");
           }
       }
       setBackgroundLoading(false);
    }, 15000); // Changed to 15 seconds

    return () => clearInterval(interval);
  }, [loading, totalItemsLoaded, loadedBatches, isGlobalSearch]);

  const modifySettings = useCallback((updates: Partial<AppSettings> | ((prev: AppSettings) => Partial<AppSettings>)) => {
    setSettings(prev => {
      const changes = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...changes, lastUpdated: Date.now() };
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('pmcrypto_settings', JSON.stringify(settings));
    if (settings.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings]);

  // Auth Handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthLoading(true);
      setAuthError('');
      
      try {
          if (authMode === 'signin') {
              const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
              if (error) throw error;
              addToast("Signed in", "success");
              setShowAuthModal(false);
          } else {
              const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
              if (error) throw error;
              addToast("Check email for link!", "info");
              setShowAuthModal(false);
          }
      } catch (err: any) {
          setAuthError(err.message);
      } finally {
          setAuthLoading(false);
      }
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      setSession(null);
      setDbStatus('offline');
      addToast("Signed out", "success");
  };
  
  const handleCopySQL = () => {
    const sql = `
drop table if exists public.app_settings;
create table public.app_settings (
  user_id uuid references auth.users not null primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.app_settings enable row level security;
create policy "Users can select their own settings" on public.app_settings for select using (auth.uid() = user_id);
create policy "Users can insert their own settings" on public.app_settings for insert with check (auth.uid() = user_id);
create policy "Users can update their own settings" on public.app_settings for update using (auth.uid() = user_id);
    `;
    navigator.clipboard.writeText(sql.trim()).then(() => addToast("SQL copied!", "success"));
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "pmcrypto_settings.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addToast("Settings exported", "success");
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (imported.favoriteLists) {
            modifySettings(imported);
            addToast("Settings imported!", "success");
        }
      } catch (e) {
        addToast("Invalid file.", "error");
      }
    };
    reader.readAsText(file);
  };
  
  const loadRemoteSettings = async (userId: string) => {
    try {
      const { data } = await supabase.from('app_settings').select('settings').eq('user_id', userId).single();
      if (data && data.settings) {
        modifySettings(data.settings);
        addToast("Synced from cloud", "success");
      }
    } catch (e) {
      addToast("Sync failed", "error");
    }
  };

  const handleForceLoad = () => {
      if (session) loadRemoteSettings(session.user.id);
  };

  // Ignore List Helpers
  const handleCopyUserIgnored = () => {
     navigator.clipboard.writeText(JSON.stringify(settings.hiddenCoins)).then(() => addToast("User ignored list copied!", "success"));
  };

  const handleCopyGlobalIgnored = () => {
    navigator.clipboard.writeText(JSON.stringify(IGNORED_COINS_GLOBAL)).then(() => addToast("Global ignored list copied!", "success"));
  };

  // Derived State Logic
  const filteredCoins = useMemo(() => {
    const isFavorites = filterType === 'favorites';
    const isSearch = searchTerm.trim().length > 0;
    
    let result = coins.filter(c => {
      if (settings.hiddenCoins.includes(c.id)) return false;
      if (IGNORED_COINS_SET.has(c.id) && !settings.restoredGlobalCoins.includes(c.id)) return false;
      return true;
    });

    if (isSearch && !isGlobalSearch) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(lower) || c.symbol.toLowerCase().includes(lower) || c.market_cap_rank.toString() === lower);
    }

    if (isFavorites) {
      const activeList = settings.favoriteLists.find(l => l.id === settings.activeListId);
      if (activeList) result = result.filter(c => activeList.coinIds.includes(c.id));
    }

    switch (filterType) {
      case 'gainers': result.sort((a, b) => (b.price_change_percentage_24h ?? -Infinity) - (a.price_change_percentage_24h ?? -Infinity)); break;
      case 'ath_drop': result.sort((a, b) => (a.ath_change_percentage ?? 0) - (b.ath_change_percentage ?? 0)); break;
    }

    // Apply Pagination ONLY if not in favorites mode
    if (!isFavorites && !isGlobalSearch) {
      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      return result.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }

    return result;
  }, [coins, searchTerm, filterType, settings.favoriteLists, settings.activeListId, settings.hiddenCoins, settings.restoredGlobalCoins, isGlobalSearch, page]);

  // Auth Modal Component
  const renderAuthModal = () => (
      <Modal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} title={authMode === 'sql' ? "Database Setup" : authMode === 'signin' ? "Sign In" : "Sign Up"}>
         {authMode === 'sql' ? (
             <div className="space-y-4">
                 <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded text-xs border border-blue-100 dark:border-blue-800">
                    To use cloud sync, run this in Supabase SQL Editor:
                 </div>
                 <div className="relative group">
                  <pre className="bg-slate-900 text-slate-300 p-3 rounded text-[10px] font-mono overflow-x-auto border border-slate-700 max-h-40">
                    {`create table if not exists public.app_settings (
  user_id uuid references auth.users not null primary key,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.app_settings enable row level security;
create policy "Users can select their own settings" on public.app_settings for select using (auth.uid() = user_id);
create policy "Users can insert their own settings" on public.app_settings for insert with check (auth.uid() = user_id);
create policy "Users can update their own settings" on public.app_settings for update using (auth.uid() = user_id);`}
                  </pre>
                  <button onClick={handleCopySQL} className="absolute top-2 right-2 p-1 bg-slate-700 text-white rounded hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition"><Copy size={14} /></button>
                 </div>
                 <button onClick={() => setAuthMode('signin')} className="w-full bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white py-2 rounded font-bold transition">Back to Sign In</button>
             </div>
         ) : (
            <form onSubmit={handleAuth} className="space-y-4">
                {authError && <div className="p-3 bg-red-100 text-red-700 text-sm rounded">{authError}</div>}
                <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input type="email" required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border dark:border-slate-700 rounded outline-none" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input type="password" required className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border dark:border-slate-700 rounded outline-none" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} />
                </div>
                <button type="submit" disabled={authLoading} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2">
                    {authLoading && <RefreshCw className="animate-spin" size={16} />} {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                </button>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-4">
                    <button type="button" onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="hover:text-blue-500 underline">
                        {authMode === 'signin' ? "Create account" : "Have account?"}
                    </button>
                    <button type="button" onClick={() => setAuthMode('sql')} className="hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1">
                        <Database size={12} /> Database SQL
                    </button>
                </div>
            </form>
         )}
      </Modal>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      <div className="fixed bottom-4 right-4 z-[110] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
           <div key={toast.id} onClick={() => removeToast(toast.id)} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right-10 fade-in duration-300 cursor-pointer ${toast.type === 'success' ? 'bg-white dark:bg-slate-800 border-green-200 text-green-700 dark:text-green-400' : 'bg-white dark:bg-slate-800 border-blue-200 text-blue-700 dark:text-blue-400'}`}>
              <span className="text-sm font-medium">{toast.message}</span>
           </div>
        ))}
      </div>

      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800">
        <div className="w-full px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded shadow-lg"><TrendingUp className="text-white" size={24} /></div>
            <div>
              <h1 className="text-xl font-bold">PMcrypto</h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-mono">Loaded: {totalItemsLoaded}</span>
                {backgroundLoading && <RefreshCcw size={10} className="animate-spin text-blue-500" />}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 rounded pl-9 pr-4 py-1.5 text-sm focus:border-blue-500 outline-none w-32 md:w-64" />
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded px-2 border dark:border-slate-700" title="Amount to invest (simulated) to reach ATH">
              <DollarSign size={12} className="text-slate-400" />
              <input 
                 type="number" 
                 value={simulationAmount} 
                 onChange={(e) => setSimulationAmount(Number(e.target.value))} 
                 className="w-16 bg-transparent text-xs font-bold p-1.5 outline-none" 
                 placeholder="Invest"
              />
            </div>

            <select className="bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 text-sm rounded px-3 py-1.5" value={filterType} onChange={(e) => { setFilterType(e.target.value as any); setPage(1); }}>
              <option value="all">همه</option>
              <option value="gainers">پرسودترین</option>
              <option value="ath_drop">بیشترین ریزش</option>
              <option value="favorites">علاقه‌مندی</option>
            </select>
            
            {filterType === 'favorites' && (
                <select className="bg-slate-100 dark:bg-slate-800 border dark:border-slate-700 text-sm rounded px-3 py-1.5" value={settings.activeListId} onChange={(e) => modifySettings({ activeListId: e.target.value })}>
                  {settings.favoriteLists.map(list => (<option key={list.id} value={list.id}>{list.name}</option>))}
                </select>
            )}

            <div className="flex bg-slate-100 dark:bg-slate-800 rounded p-1">
              {(['15', '60', 'D', 'W', 'M'] as const).map(tf => (
                <button key={tf} onClick={() => modifySettings({ timeframe: tf })} className={`px-2 py-0.5 text-xs font-bold rounded ${settings.timeframe === tf ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{tf}</button>
              ))}
            </div>

            <button onClick={() => modifySettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })} className="p-2 text-slate-500">{settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button onClick={() => setShowIgnoreModal(true)} className="p-2 text-slate-500 hover:text-red-500" title="Manage Hidden Coins"><EyeOff size={18} /></button>
            
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>

            {/* RESTORED AUTH BUTTONS */}
            {session ? (
                <div className="flex items-center bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 overflow-hidden">
                    <div className="px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 border-r border-blue-200 dark:border-blue-800 flex items-center gap-1">
                        <User size={12} />
                        <span className="max-w-[80px] truncate">{session.user.email?.split('@')[0]}</span>
                    </div>
                    <button onClick={handleForceLoad} className="px-2 py-1 hover:bg-blue-100 dark:hover:bg-blue-800 transition text-slate-500" title="Sync">
                        <Cloud size={14} />
                    </button>
                    <button onClick={handleLogout} className="px-2 py-1 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 transition text-slate-500" title="Sign Out">
                        <LogOut size={14} />
                    </button>
                </div>
            ) : (
                <button onClick={() => { setAuthMode('signin'); setShowAuthModal(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition shadow-sm">
                  <User size={14} /> Sign In
                </button>
            )}

            {/* RESTORED IMPORT/EXPORT */}
            <button onClick={handleExport} className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" title="Export">
              <Download size={18} />
            </button>
            <label className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer" title="Import">
              <Upload size={18} />
              <input type="file" className="hidden" accept=".json" onChange={handleImport} />
            </label>
          </div>
        </div>
      </header>

      <main className="w-full px-4 md:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCcw className="animate-spin text-blue-500" size={40} />
            <p className="animate-pulse">در حال دریافت اطلاعات اولیه...</p>
          </div>
        ) : (
          <>
            {/* Pagination UI - Only if NOT in Favorites mode */}
            {filterType !== 'favorites' && (
              <div className="mb-6 flex justify-center items-center gap-4">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 bg-slate-100 dark:bg-slate-800 rounded disabled:opacity-30"><ChevronLeft size={20} /></button>
                <div className="text-center"><span className="font-bold">صفحه {page}</span><span className="block text-[10px] text-slate-500">رتبه {(page-1)*500+1} تا {page*500}</span></div>
                <button onClick={() => setPage(p => p + 1)} disabled={totalItemsLoaded < page * 500} className="p-2 bg-slate-100 dark:bg-slate-800 rounded disabled:opacity-30"><ChevronRight size={20} /></button>
              </div>
            )}

            {filterType === 'favorites' && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-200 text-sm">
                در تب علاقه‌مندی‌ها تمام ارزهای منتخب شما بدون صفحه‌بندی نمایش داده می‌شوند.
              </div>
            )}

            <div className={`grid gap-4 ${settings.gridColumns === 1 ? 'grid-cols-1' : settings.gridColumns === 2 ? 'grid-cols-1 sm:grid-cols-2' : settings.gridColumns === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
              {filteredCoins.map(coin => (
                <CoinCard key={coin.id} coin={coin} settings={settings} onFavoriteClick={(id) => setFavModal({isOpen: true, coinId: id})} hideCoin={(id) => modifySettings({ hiddenCoins: [...settings.hiddenCoins, id] })} openProfitCalc={(c) => setProfitModal({isOpen: true, coin: c})} onCopyAnalysis={(c) => {/* Logic */}} simulationAmount={simulationAmount} />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Render Modals and Drawers */}
      <Drawer isOpen={drawerState.isOpen} coin={drawerState.coin} onClose={() => setDrawerState({isOpen: false, coin: null})} settings={settings} />
      <Modal isOpen={favModal.isOpen} onClose={() => setFavModal({isOpen: false, coinId: null})} title="مدیریت لیست‌ها">
        <div className="space-y-2">
          {settings.favoriteLists.map(list => (
            <label key={list.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded cursor-pointer">
              <span className="font-medium">{list.name}</span>
              <input type="checkbox" checked={list.coinIds.includes(favModal.coinId!)} onChange={() => {
                const lists = settings.favoriteLists.map(l => l.id === list.id ? { ...l, coinIds: l.coinIds.includes(favModal.coinId!) ? l.coinIds.filter(id => id !== favModal.coinId) : [...l.coinIds, favModal.coinId!] } : l);
                modifySettings({ favoriteLists: lists });
              }} />
            </label>
          ))}
        </div>
      </Modal>

      {/* Ignore List Management Modal */}
      <Modal isOpen={showIgnoreModal} onClose={() => setShowIgnoreModal(false)} title="مدیریت ارزهای مخفی">
        <div className="flex gap-2 mb-4 bg-slate-100 dark:bg-slate-900 p-1 rounded">
          <button onClick={() => setIgnoreListTab('new')} className={`flex-1 py-1.5 text-sm font-bold rounded transition ${ignoreListTab === 'new' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow' : 'text-slate-500'}`}>
             New (User Hidden)
          </button>
          <button onClick={() => setIgnoreListTab('old')} className={`flex-1 py-1.5 text-sm font-bold rounded transition ${ignoreListTab === 'old' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow' : 'text-slate-500'}`}>
             Old (Global Ignored)
          </button>
        </div>

        {ignoreListTab === 'new' ? (
          <div className="space-y-3">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-500">{settings.hiddenCoins.length} Coins</span>
                <button onClick={handleCopyUserIgnored} className="text-xs flex items-center gap-1 text-blue-600 hover:underline"><Copy size={12} /> Copy All</button>
             </div>
             {settings.hiddenCoins.length === 0 ? <p className="text-center text-sm text-slate-400 py-4">No user-hidden coins.</p> : (
               <div className="space-y-2">
                 {settings.hiddenCoins.map(id => (
                   <div key={id} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 border dark:border-slate-700 rounded text-sm">
                      <span className="font-mono">{id}</span>
                      <button onClick={() => modifySettings({ hiddenCoins: settings.hiddenCoins.filter(c => c !== id) })} className="text-green-600 hover:text-green-700 p-1 bg-green-50 dark:bg-green-900/30 rounded" title="Restore">
                         <Undo2 size={16} />
                      </button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        ) : (
          <div className="space-y-3">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-500">{IGNORED_COINS_GLOBAL.length} Global Coins</span>
                <button onClick={handleCopyGlobalIgnored} className="text-xs flex items-center gap-1 text-blue-600 hover:underline"><Copy size={12} /> Copy All</button>
             </div>
             <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
               {IGNORED_COINS_GLOBAL.map(id => {
                 const isRestored = settings.restoredGlobalCoins.includes(id);
                 return (
                   <div key={id} className={`flex items-center justify-between p-2 rounded text-sm border ${isRestored ? 'bg-green-50 dark:bg-green-900/10 border-green-200' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                      <span className={`font-mono ${isRestored ? 'text-green-700 dark:text-green-400 font-bold' : ''}`}>{id}</span>
                      {isRestored ? (
                        <button onClick={() => modifySettings({ restoredGlobalCoins: settings.restoredGlobalCoins.filter(c => c !== id) })} className="text-slate-500 hover:text-red-600 p-1" title="Hide Again">
                           <EyeOff size={16} />
                        </button>
                      ) : (
                        <button onClick={() => modifySettings({ restoredGlobalCoins: [...settings.restoredGlobalCoins, id] })} className="text-slate-400 hover:text-green-600 p-1" title="Restore">
                           <Eye size={16} />
                        </button>
                      )}
                   </div>
                 );
               })}
             </div>
          </div>
        )}
      </Modal>

      {renderAuthModal()}
    </div>
  );
};

export default App;