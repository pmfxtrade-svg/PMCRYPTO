import React, { useEffect, useRef, memo, useState } from 'react';

declare global {
  interface Window {
    TradingView: any;
  }
}

interface TradingViewWidgetProps {
  symbol: string;
  theme?: 'dark' | 'light';
  isVisible: boolean;
  interval?: string;
  scale?: 'log' | 'linear';
  chartType?: 'price' | 'market_cap';
}

// --- Global Queue Manager for Widget Loading ---
const MAX_CONCURRENT_LOADS = 3;
let activeLoads = 0;
const loadQueue: Array<() => void> = [];

const processQueue = () => {
  if (activeLoads >= MAX_CONCURRENT_LOADS || loadQueue.length === 0) return;

  const nextTask = loadQueue.shift();
  if (nextTask) {
    activeLoads++;
    nextTask();
    
    // Assume a "heavy load" window of 1 second per widget to stagger script execution slightly
    // independent of when the widget actually finishes rendering.
    setTimeout(() => {
      activeLoads--;
      processQueue();
    }, 1000);
  }
};

const enqueueLoad = (callback: () => void) => {
  loadQueue.push(callback);
  processQueue();
};

const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({ 
  symbol, 
  theme = 'dark', 
  isVisible,
  interval = 'D',
  scale = 'log',
  chartType = 'price'
}) => {
  const containerId = useRef(`tv-widget-${Math.random().toString(36).substring(7)}`);
  
  // State to track if the widget is allowed to render (passed checks)
  const [shouldRender, setShouldRender] = useState(false);
  
  // State to track if the widget has been fully initialized once.
  // Once true, we keep it true to avoid reloading when scrolling away and back.
  const [isPermanentlyLoaded, setIsPermanentlyLoaded] = useState(false);

  // 1. Logic for 3-second visibility delay
  useEffect(() => {
    // If already loaded permanently, do nothing (keep it rendered)
    if (isPermanentlyLoaded) return;

    let timer: ReturnType<typeof setTimeout>;

    if (isVisible) {
      // User must keep it in view for 3 seconds
      timer = setTimeout(() => {
        // After 3 seconds, add to the global load queue
        enqueueLoad(() => {
          setShouldRender(true);
          setIsPermanentlyLoaded(true);
        });
      }, 3000);
    }

    return () => {
      // If user scrolls away before 3 seconds, cancel the timer
      if (timer) clearTimeout(timer);
    };
  }, [isVisible, isPermanentlyLoaded]);


  // 2. Logic for Rendering the Widget
  useEffect(() => {
    // Only proceed if our queue logic/persistence says we can render
    if (!shouldRender && !isPermanentlyLoaded) return;

    const scriptUrl = 'https://s3.tradingview.com/tv.js';
    
    const initWidget = () => {
      if (window.TradingView && document.getElementById(containerId.current)) {
        // Clear container to prevent duplicates only if we are re-initializing
        const container = document.getElementById(containerId.current);
        if (container) container.innerHTML = '';

        const isDark = theme === 'dark';
        
        const tvSymbol = chartType === 'market_cap' 
          ? `CRYPTOCAP:${symbol.toUpperCase()}` 
          : `${symbol.toUpperCase()}USDT`;

        const overrides: any = {
           "mainSeriesProperties.priceAxisProperties.log": scale === 'log',
           "paneProperties.background": isDark ? "#0f172a" : "#ffffff", 
           "paneProperties.vertGridProperties.color": isDark ? "rgba(42, 46, 57, 0.1)" : "rgba(0, 0, 0, 0.05)",
           "paneProperties.horzGridProperties.color": isDark ? "rgba(42, 46, 57, 0.1)" : "rgba(0, 0, 0, 0.05)",
           "scalesProperties.textColor": isDark ? "#94a3b8" : "#64748b",
        };

        if (!isDark) {
           overrides["mainSeriesProperties.candleStyle.upColor"] = "#81c784";
           overrides["mainSeriesProperties.candleStyle.downColor"] = "#636363";
           overrides["mainSeriesProperties.candleStyle.borderUpColor"] = "#636363";
           overrides["mainSeriesProperties.candleStyle.borderDownColor"] = "#636363";
           overrides["mainSeriesProperties.candleStyle.wickUpColor"] = "#636363";
           overrides["mainSeriesProperties.candleStyle.wickDownColor"] = "#636363";
        }

        new window.TradingView.widget({
          "autosize": true,
          "symbol": tvSymbol,
          "interval": interval,
          "timezone": "Etc/UTC",
          "theme": theme,
          "style": "1", // 1 = Candles
          "locale": "en",
          "toolbar_bg": isDark ? "#0f172a" : "#f1f3f6",
          "enable_publishing": false,
          "hide_top_toolbar": false,
          "hide_legend": false,
          "save_image": false,
          "allow_symbol_change": true, 
          "container_id": containerId.current,
          "disabled_features": [
            "left_toolbar",
            "header_compare",
            "header_undo_redo",
            "header_screenshot",
            "header_saveload",
            "create_volume_indicator_by_default",
            "volume_force_overlay",
            "popup_hints",
            "display_market_status",
          ],
          "enabled_features": [
            "header_widget",
            "header_resolutions",
            "header_symbol_search",
            "use_localstorage_for_settings"
          ],
          "overrides": overrides
        });
      }
    };

    let script = document.querySelector(`script[src="${scriptUrl}"]`) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.onload = initWidget;
      document.head.appendChild(script);
    } else {
      if (window.TradingView) {
        initWidget();
      } else {
        const check = setInterval(() => {
          if (window.TradingView) {
            clearInterval(check);
            initWidget();
          }
        }, 100);
      }
    }

  }, [symbol, theme, interval, scale, chartType, shouldRender, isPermanentlyLoaded]);

  // If not supposed to render yet, show a placeholder
  if (!shouldRender && !isPermanentlyLoaded) {
    return (
      <div className="w-full h-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center relative">
        <div className="text-xs text-slate-400 dark:text-slate-600 font-mono absolute bottom-2 right-2">
            Waiting...
        </div>
      </div>
    );
  }

  return (
    <div id={containerId.current} className="w-full h-full bg-slate-50 dark:bg-slate-950" />
  );
};

export default memo(TradingViewWidget);