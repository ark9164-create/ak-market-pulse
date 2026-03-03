import { createContext, type AppContext } from '@/app/app-context';
import { PanelLayoutManager } from '@/app/panel-layout';
import { DataLoaderManager } from '@/app/data-loader';
import { RefreshScheduler } from '@/app/refresh-scheduler';
import { FinnhubWebSocket } from '@/services/finnhub-ws';
import { initTheme } from '@/utils/theme';
import { INDEX_SYMBOLS, TOP_STOCKS, CRYPTO_SYMBOLS, COMMODITY_SYMBOLS } from '@/config/markets';
import type { IndicesPanel } from '@/components/IndicesPanel';
import type { MarketsPanel } from '@/components/MarketsPanel';
import type { CryptoPanel } from '@/components/CryptoPanel';
import type { VolatilityPanel } from '@/components/VolatilityPanel';
import type { TopMoversPanel } from '@/components/TopMoversPanel';
import type { WatchlistPanel } from '@/components/WatchlistPanel';

export class App {
  private ctx: AppContext;
  private layout: PanelLayoutManager;
  private dataLoader: DataLoaderManager;
  private scheduler: RefreshScheduler;
  private ws: FinnhubWebSocket;

  constructor(root: HTMLElement) {
    this.ctx = createContext(root);
    this.layout = new PanelLayoutManager(this.ctx);
    this.dataLoader = new DataLoaderManager(this.ctx);
    this.scheduler = new RefreshScheduler(this.ctx);
    this.ws = new FinnhubWebSocket();
  }

  async init(): Promise<void> {
    console.log('[MarketPulse] Initializing...');

    // Phase 1: Theme
    initTheme();

    // Phase 2: Layout (header + map + panels)
    this.layout.init();
    console.log('[MarketPulse] Layout ready');

    // Phase 3: Initial data load
    await this.dataLoader.loadAllData();
    console.log('[MarketPulse] Initial data loaded');

    // Phase 4: Schedule refreshes
    this.registerRefreshTasks();
    this.scheduler.start();
    console.log('[MarketPulse] Refresh scheduler started');

    // Phase 5: WebSocket for real-time trades
    this.initWebSocket();
    console.log('[MarketPulse] WebSocket streaming started');

    // Phase 6: Global event listeners
    this.registerEventListeners();

    console.log('[MarketPulse] Ready');
  }

  private registerRefreshTasks(): void {
    // Quotes: 60s
    this.scheduler.register('indices', () => this.dataLoader.loadIndices(), 60_000);
    this.scheduler.register('stocks', () => this.dataLoader.loadStocks(), 60_000);
    this.scheduler.register('sectorETFs', () => this.dataLoader.loadSectorETFs(), 60_000);
    this.scheduler.register('commodities', () => this.dataLoader.loadCommodities(), 60_000);
    this.scheduler.register('crypto', () => this.dataLoader.loadCrypto(), 60_000);

    // FX: 60s
    this.scheduler.register('fx', () => this.dataLoader.loadFX(), 60_000);

    // Bonds: 5min (Yahoo fallback gives near-live treasury yields)
    this.scheduler.register('bonds', () => this.dataLoader.loadBonds(), 5 * 60_000);
    // Macro (FRED): 30min (data only updates monthly/quarterly)
    this.scheduler.register('macro', () => this.dataLoader.loadMacro(), 30 * 60_000);
    this.scheduler.register('centralBanks', () => this.dataLoader.loadCentralBanks(), 30 * 60_000);

    // News: 2min
    this.scheduler.register('news', () => this.dataLoader.loadNews(), 2 * 60_000);

    // Earnings/IPO: 1hr
    this.scheduler.register('earnings', () => this.dataLoader.loadEarnings(), 60 * 60_000);
    this.scheduler.register('ipos', () => this.dataLoader.loadIPOs(), 60 * 60_000);

    // VIX: 30s (traders watch this closely)
    this.scheduler.register('vix', () => this.dataLoader.loadVIX(), 30_000);

    // Watchlist: 60s
    this.scheduler.register('watchlist', () => this.dataLoader.loadWatchlist(), 60_000);
  }

  private initWebSocket(): void {
    // Subscribe to key symbols for real-time price updates
    // Finnhub WS uses plain ticker symbols (no ^ prefix for indices)
    const stockSymbols = TOP_STOCKS.map(s => s.symbol);
    const cryptoSymbols = CRYPTO_SYMBOLS.map(s => {
      // Finnhub crypto format: BINANCE:BTCUSDT
      const base = s.symbol.replace('-USD', '');
      return `BINANCE:${base}USDT`;
    });

    this.ws.connect();

    // Subscribe stocks
    this.ws.subscribeMany(stockSymbols);

    // Subscribe crypto
    this.ws.subscribeMany(cryptoSymbols);

    // Subscribe VIX-related
    this.ws.subscribe('UVXY');

    // Subscribe watchlist symbols
    const watchlistPanel = this.ctx.panels.get('watchlist') as WatchlistPanel | undefined;
    if (watchlistPanel) {
      this.ws.subscribeMany(watchlistPanel.getSymbols());
    }

    // Global trade handler — update prices in real-time
    this.ws.onTrade((symbol, price, _volume, _timestamp) => {
      // Helper to update a quote
      const updateQuote = (q: { price: number; change: number; changePercent: number }) => {
        const prevClose = q.price - q.change;
        q.price = price;
        q.change = price - prevClose;
        q.changePercent = prevClose > 0 ? (q.change / prevClose) * 100 : 0;
      };

      // Update stocks
      const stock = this.ctx.stocks.find(q => q.symbol === symbol);
      if (stock) {
        updateQuote(stock);
        this.debouncedPanelUpdate('stocks');
      }

      // Update watchlist
      const wlQuote = this.ctx.watchlistQuotes.find(q => q.symbol === symbol);
      if (wlQuote) {
        updateQuote(wlQuote);
        this.debouncedPanelUpdate('watchlist');
      }

      // Update crypto (map BINANCE:BTCUSDT → BTC-USD)
      const cryptoMatch = symbol.match(/^BINANCE:(\w+)USDT$/);
      if (cryptoMatch) {
        const yahooSymbol = `${cryptoMatch[1]}-USD`;
        const crypto = this.ctx.crypto.find(q => q.symbol === yahooSymbol);
        if (crypto) {
          updateQuote(crypto);
          this.debouncedPanelUpdate('crypto');
        }
      }
    });
  }

  private updateTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private debouncedPanelUpdate(key: string): void {
    if (this.updateTimers.has(key)) return;
    this.updateTimers.set(key, setTimeout(() => {
      this.updateTimers.delete(key);
      if (key === 'stocks') {
        const markets = this.ctx.panels.get('markets') as MarketsPanel | undefined;
        markets?.update([...this.ctx.stocks]);
        const topMovers = this.ctx.panels.get('topMovers') as TopMoversPanel | undefined;
        topMovers?.update([...this.ctx.stocks]);
      } else if (key === 'crypto') {
        const crypto = this.ctx.panels.get('crypto') as CryptoPanel | undefined;
        crypto?.update([...this.ctx.crypto]);
      } else if (key === 'watchlist') {
        const wl = this.ctx.panels.get('watchlist') as WatchlistPanel | undefined;
        wl?.updateQuotes([...this.ctx.watchlistQuotes]);
      }
    }, 500)); // Batch updates every 500ms
  }

  private registerEventListeners(): void {
    window.addEventListener('beforeunload', () => this.destroy());

    // Re-subscribe when watchlist changes
    document.addEventListener('watchlist-changed', ((e: CustomEvent) => {
      const symbols = e.detail?.symbols as string[] | undefined;
      if (symbols) {
        this.ws.subscribeMany(symbols);
        // Immediately fetch quotes for new symbols
        this.dataLoader.loadWatchlist();
      }
    }) as EventListener);
  }

  destroy(): void {
    this.ctx.isDestroyed = true;
    this.scheduler.stop();
    this.ws.destroy();
    this.layout.destroy();
  }
}
