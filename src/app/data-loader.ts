import type { AppContext } from './app-context';
import { fetchQuotes, fetchSparkData } from '@/services/yahoo';
import { fetchQuote as finnhubQuote, fetchCompanyNews, fetchEarningsCalendar, fetchIPOCalendar } from '@/services/finnhub';
import { fetchSeries } from '@/services/fred';
import { fetchFXRate } from '@/services/alpha-vantage';
import { fetchAllFeeds } from '@/services/rss';
import { INDEX_SYMBOLS, TOP_STOCKS, SECTOR_ETFS, FX_PAIRS, COMMODITY_SYMBOLS, CRYPTO_SYMBOLS, BOND_SERIES, MACRO_SERIES } from '@/config/markets';
import { RSS_FEEDS } from '@/config/feeds';
import { markFresh } from '@/services/data-freshness';
import type { IndicesPanel } from '@/components/IndicesPanel';
import type { MarketsPanel } from '@/components/MarketsPanel';
import type { HeatmapPanel } from '@/components/HeatmapPanel';
import type { FXPanel } from '@/components/FXPanel';
import type { BondsPanel } from '@/components/BondsPanel';
import type { CommoditiesPanel } from '@/components/CommoditiesPanel';
import type { CryptoPanel } from '@/components/CryptoPanel';
import type { MacroPanel } from '@/components/MacroPanel';
import type { EarningsPanel } from '@/components/EarningsPanel';
import type { NewsPanel } from '@/components/NewsPanel';
import type { IPOPanel } from '@/components/IPOPanel';
import type { CentralBanksPanel } from '@/components/CentralBanksPanel';
import type { VolatilityPanel } from '@/components/VolatilityPanel';
import type { WatchlistPanel } from '@/components/WatchlistPanel';
import type { SectorRotationPanel } from '@/components/SectorRotationPanel';
import type { CorrelationPanel } from '@/components/CorrelationPanel';
import type { TopMoversPanel } from '@/components/TopMoversPanel';
import type { InsiderFlowPanel } from '@/components/InsiderFlowPanel';
import type { FundamentalsPanel } from '@/components/FundamentalsPanel';
import { FUNDAMENTALS_SYMBOLS } from '@/components/FundamentalsPanel';
import { fetchIncomeStatements, fetchBalanceSheets, fetchCashFlowStatements } from '@/services/financial-datasets';
import type { FundamentalsData } from './app-context';

function guard(ctx: AppContext, key: string): boolean {
  if (ctx.isDestroyed) return false;
  if (ctx.inFlight.has(key)) return false;
  ctx.inFlight.add(key);
  return true;
}

function done(ctx: AppContext, key: string): void {
  ctx.inFlight.delete(key);
}

export class DataLoaderManager {
  private ctx: AppContext;

  constructor(ctx: AppContext) {
    this.ctx = ctx;
  }

  async loadAllData(): Promise<void> {
    await Promise.allSettled([
      this.loadIndices(),
      this.loadStocks(),
      this.loadSectorETFs(),
      this.loadFX(),
      this.loadBonds(),
      this.loadCommodities(),
      this.loadCrypto(),
      this.loadMacro(),
      this.loadEarnings(),
      this.loadNews(),
      this.loadIPOs(),
      this.loadCentralBanks(),
      this.loadVIX(),
      this.loadWatchlist(),
      this.loadFundamentals(),
    ]);

    // Build cross-asset correlation summary from loaded data
    this.updateCorrelationPanel();
  }

  private updateCorrelationPanel(): void {
    const panel = this.ctx.panels.get('correlation') as CorrelationPanel | undefined;
    if (!panel) return;

    const rows: { label: string; price: number; change: number; changePercent: number }[] = [];

    // S&P 500
    const spx = this.ctx.indices.find(q => q.symbol === '^GSPC');
    if (spx) rows.push({ label: 'S&P 500', price: spx.price, change: spx.change, changePercent: spx.changePercent });

    // 10Y Yield
    const tenY = this.ctx.bonds.find(b => b.label === '10Y');
    if (tenY) rows.push({ label: '10Y Yield', price: tenY.yield, change: tenY.change, changePercent: tenY.yield ? (tenY.change / (tenY.yield - tenY.change)) * 100 : 0 });

    // Gold
    const gold = this.ctx.commodities.find(q => q.symbol === 'GC=F');
    if (gold) rows.push({ label: 'Gold', price: gold.price, change: gold.change, changePercent: gold.changePercent });

    // Oil
    const oil = this.ctx.commodities.find(q => q.symbol === 'CL=F');
    if (oil) rows.push({ label: 'WTI Oil', price: oil.price, change: oil.change, changePercent: oil.changePercent });

    // DXY (US Dollar Index)
    const dxy = this.ctx.indices.find(q => q.symbol === 'DX-Y.NYB');
    if (dxy) rows.push({ label: 'DXY', price: dxy.price, change: dxy.change, changePercent: dxy.changePercent });

    // BTC
    const btc = this.ctx.crypto.find(q => q.symbol === 'BTC-USD');
    if (btc) rows.push({ label: 'Bitcoin', price: btc.price, change: btc.change, changePercent: btc.changePercent });

    // VIX
    if (this.ctx.vix) rows.push({ label: 'VIX', price: this.ctx.vix.price, change: this.ctx.vix.change, changePercent: this.ctx.vix.changePercent });

    if (rows.length) panel.update(rows);
  }

  async loadIndices(): Promise<void> {
    if (!guard(this.ctx, 'indices')) return;
    try {
      const symbols = INDEX_SYMBOLS.map(s => s.symbol);
      const [quotes, sparks] = await Promise.all([
        fetchQuotes(symbols),
        fetchSparkData(symbols),
      ]);
      this.ctx.indices = quotes.map(q => ({
        ...q,
        sparkData: sparks.get(q.symbol) ?? q.sparkData,
      }));
      markFresh('indices');
      const panel = this.ctx.panels.get('indices') as IndicesPanel | undefined;
      panel?.update(this.ctx.indices);
    } catch (e) {
      console.warn('Failed to load indices:', e);
    } finally {
      done(this.ctx, 'indices');
    }
  }

  async loadStocks(): Promise<void> {
    if (!guard(this.ctx, 'stocks')) return;
    try {
      const symbols = TOP_STOCKS.map(s => s.symbol);
      const [quotes, sparks] = await Promise.all([
        fetchQuotes(symbols),
        fetchSparkData(symbols),
      ]);
      this.ctx.stocks = quotes.map(q => ({
        ...q,
        sparkData: sparks.get(q.symbol) ?? q.sparkData,
      }));
      markFresh('stocks');
      const panel = this.ctx.panels.get('markets') as MarketsPanel | undefined;
      panel?.update(this.ctx.stocks);

      // Feed TopMovers panel with stock data
      const topMovers = this.ctx.panels.get('topMovers') as TopMoversPanel | undefined;
      topMovers?.update(this.ctx.stocks);
    } catch (e) {
      console.warn('Failed to load stocks:', e);
    } finally {
      done(this.ctx, 'stocks');
    }
  }

  async loadSectorETFs(): Promise<void> {
    if (!guard(this.ctx, 'sectorETFs')) return;
    try {
      const symbols = SECTOR_ETFS.map(s => s.symbol);
      const quotes = await fetchQuotes(symbols);
      this.ctx.sectorETFs = quotes;
      markFresh('sectorETFs');
      const panel = this.ctx.panels.get('heatmap') as HeatmapPanel | undefined;
      panel?.update(this.ctx.sectorETFs);

      // Feed SectorRotation panel with sector ETF data
      const sectorRotation = this.ctx.panels.get('sectorRotation') as SectorRotationPanel | undefined;
      sectorRotation?.update(this.ctx.sectorETFs);
    } catch (e) {
      console.warn('Failed to load sector ETFs:', e);
    } finally {
      done(this.ctx, 'sectorETFs');
    }
  }

  async loadFX(): Promise<void> {
    if (!guard(this.ctx, 'fx')) return;
    try {
      // Use Yahoo for FX to avoid Alpha Vantage rate limits
      const symbols = FX_PAIRS.map(p => `${p.from}${p.to}=X`);
      const quotes = await fetchQuotes(symbols);
      this.ctx.fx = quotes.map((q, i) => ({
        pair: FX_PAIRS[i].pair,
        rate: q.price,
        change: q.change,
        changePercent: q.changePercent,
        sparkData: q.sparkData,
      }));
      markFresh('fx');
      const panel = this.ctx.panels.get('fx') as FXPanel | undefined;
      panel?.update(this.ctx.fx);
    } catch (e) {
      console.warn('Failed to load FX:', e);
    } finally {
      done(this.ctx, 'fx');
    }
  }

  async loadBonds(): Promise<void> {
    if (!guard(this.ctx, 'bonds')) return;
    try {
      // Try FRED first — fetch extra observations to skip "." values
      const results = await Promise.allSettled(
        BOND_SERIES.map(async (s) => {
          const data = await fetchSeries(s.seriesId, 10);
          // Filter valid observations (FRED returns "." for missing)
          const valid = data.observations.filter(o => o.value !== '.' && !isNaN(parseFloat(o.value)));
          const latest = valid[0] ? parseFloat(valid[0].value) : NaN;
          const prev = valid[1] ? parseFloat(valid[1].value) : latest;
          return {
            label: s.label,
            seriesId: s.seriesId,
            yield: latest,
            change: Number.isFinite(latest) && Number.isFinite(prev) ? latest - prev : 0,
          };
        })
      );
      this.ctx.bonds = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter(r => Number.isFinite(r.yield));

      // If FRED returned nothing, use Yahoo treasury yield indices
      if (this.ctx.bonds.length === 0) {
        const yahooYieldSymbols = [
          { symbol: '^IRX', label: '3M' },
          { symbol: '^FVX', label: '5Y' },
          { symbol: '^TNX', label: '10Y' },
          { symbol: '^TYX', label: '30Y' },
        ];
        const quotes = await fetchQuotes(yahooYieldSymbols.map(s => s.symbol)).catch(() => []);
        this.ctx.bonds = quotes.map((q, i) => ({
          label: yahooYieldSymbols[i]?.label ?? q.name,
          seriesId: q.symbol,
          yield: q.price,
          change: q.change,
        }));

        // Add 10Y-2Y spread estimate
        const ten = this.ctx.bonds.find(b => b.label === '10Y');
        const twoY = 4.0; // approximate 2Y yield
        if (ten) {
          this.ctx.bonds.push({
            label: '10Y-2Y Spread',
            seriesId: 'T10Y2Y',
            yield: +(ten.yield - twoY).toFixed(2),
            change: 0,
          });
        }
      }

      markFresh('bonds');
      const panel = this.ctx.panels.get('bonds') as BondsPanel | undefined;
      panel?.update(this.ctx.bonds);
    } catch (e) {
      console.warn('Failed to load bonds:', e);
    } finally {
      done(this.ctx, 'bonds');
    }
  }

  async loadCommodities(): Promise<void> {
    if (!guard(this.ctx, 'commodities')) return;
    try {
      const symbols = COMMODITY_SYMBOLS.map(s => s.symbol);
      const [quotes, sparks] = await Promise.all([
        fetchQuotes(symbols),
        fetchSparkData(symbols),
      ]);
      this.ctx.commodities = quotes.map(q => ({
        ...q,
        sparkData: sparks.get(q.symbol) ?? q.sparkData,
      }));
      markFresh('commodities');
      const panel = this.ctx.panels.get('commodities') as CommoditiesPanel | undefined;
      panel?.update(this.ctx.commodities);
    } catch (e) {
      console.warn('Failed to load commodities:', e);
    } finally {
      done(this.ctx, 'commodities');
    }
  }

  async loadCrypto(): Promise<void> {
    if (!guard(this.ctx, 'crypto')) return;
    try {
      const symbols = CRYPTO_SYMBOLS.map(s => s.symbol);
      const [quotes, sparks] = await Promise.all([
        fetchQuotes(symbols),
        fetchSparkData(symbols),
      ]);
      this.ctx.crypto = quotes.map(q => ({
        ...q,
        sparkData: sparks.get(q.symbol) ?? q.sparkData,
      }));
      markFresh('crypto');
      const panel = this.ctx.panels.get('crypto') as CryptoPanel | undefined;
      panel?.update(this.ctx.crypto);
    } catch (e) {
      console.warn('Failed to load crypto:', e);
    } finally {
      done(this.ctx, 'crypto');
    }
  }

  async loadMacro(): Promise<void> {
    if (!guard(this.ctx, 'macro')) return;
    try {
      // Try FRED first — fetch 5 observations in case recent ones are "."
      const results = await Promise.allSettled(
        MACRO_SERIES.map(async (s) => {
          const data = await fetchSeries(s.seriesId, 5);
          // Find first valid observation (FRED returns "." for missing data)
          const validObs = data.observations.find(o => o.value !== '.' && !isNaN(parseFloat(o.value)));
          const value = validObs ? parseFloat(validObs.value) : NaN;
          return {
            name: s.name,
            seriesId: s.seriesId,
            value,
            date: validObs?.date ?? '',
            unit: s.unit,
            category: s.category,
          };
        })
      );
      this.ctx.macro = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter(r => Number.isFinite(r.value));

      // If FRED returned nothing (no API key), use Yahoo + hardcoded fallback
      if (this.ctx.macro.length === 0) {
        // Get treasury yields from Yahoo as macro proxy
        const yieldQuotes = await fetchQuotes(['^TNX', '^FVX', '^IRX']).catch(() => []);
        const yieldMap: Record<string, { name: string; unit: string }> = {
          '^TNX': { name: '10Y Treasury Yield', unit: '%' },
          '^FVX': { name: '5Y Treasury Yield', unit: '%' },
          '^IRX': { name: '13-Week T-Bill', unit: '%' },
        };

        const fromYahoo = yieldQuotes.map(q => ({
          name: yieldMap[q.symbol]?.name ?? q.name,
          seriesId: q.symbol,
          value: q.price,
          date: new Date().toISOString().slice(0, 10),
          unit: yieldMap[q.symbol]?.unit ?? '%',
        }));

        // Add well-known recent macro values as static fallback
        const staticMacro = [
          { name: 'Fed Funds Rate', seriesId: 'FEDFUNDS', value: 4.33, date: '2026-02', unit: '%' },
          { name: 'CPI (YoY)', seriesId: 'CPIAUCSL', value: 2.8, date: '2026-01', unit: '%' },
          { name: 'Unemployment', seriesId: 'UNRATE', value: 4.0, date: '2026-01', unit: '%' },
          { name: 'GDP Growth (QoQ)', seriesId: 'GDP', value: 2.3, date: '2025-Q4', unit: '%' },
          { name: 'Fed Balance Sheet', seriesId: 'WALCL', value: 6.8, date: '2026-02', unit: '$T' },
        ];

        this.ctx.macro = [...fromYahoo, ...staticMacro];
      }

      markFresh('macro');
      const panel = this.ctx.panels.get('macro') as MacroPanel | undefined;
      panel?.update(this.ctx.macro);
    } catch (e) {
      console.warn('Failed to load macro:', e);
    } finally {
      done(this.ctx, 'macro');
    }
  }

  async loadEarnings(): Promise<void> {
    if (!guard(this.ctx, 'earnings')) return;
    try {
      const now = new Date();
      // Look back 7 days for recent reports + forward 30 days
      const from = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      const to = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
      const data = await fetchEarningsCalendar(from, to);
      this.ctx.earnings = data.map(e => ({
        symbol: e.symbol,
        date: e.date,
        epsEstimate: e.epsEstimate,
        epsActual: e.epsActual,
        revenueEstimate: e.revenueEstimate,
        revenueActual: e.revenueActual,
        surprise: e.epsActual != null && e.epsEstimate != null
          ? e.epsActual - e.epsEstimate : null,
      }));
      markFresh('earnings');
      const panel = this.ctx.panels.get('earnings') as EarningsPanel | undefined;
      panel?.update(this.ctx.earnings);
    } catch (e) {
      console.warn('Failed to load earnings:', e);
    } finally {
      done(this.ctx, 'earnings');
    }
  }

  async loadNews(): Promise<void> {
    if (!guard(this.ctx, 'news')) return;
    try {
      const items = await fetchAllFeeds(RSS_FEEDS);
      this.ctx.news = items.slice(0, 80).map((item, i) => {
        const parsed = new Date(item.pubDate).getTime();
        return {
          id: `news-${i}-${item.pubDate}`,
          headline: item.title,
          source: item.source,
          url: item.link,
          datetime: Number.isFinite(parsed) ? parsed : Date.now() - i * 60000,
          summary: item.description,
        };
      });
      markFresh('news');
      const panel = this.ctx.panels.get('news') as NewsPanel | undefined;
      panel?.update(this.ctx.news);

      // Feed InsiderFlow panel with news (it filters by keywords internally)
      const insiderFlow = this.ctx.panels.get('insiderFlow') as InsiderFlowPanel | undefined;
      insiderFlow?.update(this.ctx.news);
    } catch (e) {
      console.warn('Failed to load news:', e);
    } finally {
      done(this.ctx, 'news');
    }
  }

  async loadIPOs(): Promise<void> {
    if (!guard(this.ctx, 'ipos')) return;
    try {
      const now = new Date();
      // Look back 14 days for recent listings + forward 90 days
      const from = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10);
      const to = new Date(now.getTime() + 90 * 86400000).toISOString().slice(0, 10);
      const data = await fetchIPOCalendar(from, to);
      this.ctx.ipos = data.map(d => ({
        name: d.name,
        symbol: d.symbol,
        date: d.date,
        exchange: d.exchange,
        price: d.price ?? undefined,
        shares: d.numberOfShares ?? undefined,
        totalValue: d.totalValue ?? undefined,
        status: d.status,
      }));
      markFresh('ipos');
      const panel = this.ctx.panels.get('ipo') as IPOPanel | undefined;
      panel?.update(this.ctx.ipos);
    } catch (e) {
      console.warn('Failed to load IPOs:', e);
    } finally {
      done(this.ctx, 'ipos');
    }
  }

  async loadCentralBanks(): Promise<void> {
    if (!guard(this.ctx, 'centralBanks')) return;
    try {
      // Static data supplemented by FRED for Fed Funds rate
      const fedData = await fetchSeries('FEDFUNDS', 2).catch(() => ({ observations: [] as any[] }));
      const fedRate = fedData.observations[0] ? parseFloat(fedData.observations[0].value) : 5.33;
      const prevFed = fedData.observations[1] ? parseFloat(fedData.observations[1].value) : fedRate;

      this.ctx.centralBanks = [
        { name: 'Federal Reserve', code: 'Fed', rate: fedRate, lastChange: fedData.observations[0]?.date ?? '2024-09', direction: fedRate > prevFed ? 'up' : fedRate < prevFed ? 'down' : 'hold' },
        { name: 'European Central Bank', code: 'ECB', rate: 2.65, lastChange: '2025-03', direction: 'down' },
        { name: 'Bank of Japan', code: 'BoJ', rate: 0.50, lastChange: '2025-01', direction: 'up' },
        { name: 'Bank of England', code: 'BoE', rate: 4.50, lastChange: '2025-02', direction: 'down' },
        { name: "People's Bank of China", code: 'PBoC', rate: 3.10, lastChange: '2024-10', direction: 'down' },
        { name: 'Swiss National Bank', code: 'SNB', rate: 0.50, lastChange: '2024-12', direction: 'down' },
        { name: 'Reserve Bank of Australia', code: 'RBA', rate: 4.10, lastChange: '2025-02', direction: 'down' },
        { name: 'Bank of Canada', code: 'BoC', rate: 3.00, lastChange: '2025-01', direction: 'down' },
      ];
      markFresh('centralBanks');
      const panel = this.ctx.panels.get('centralBanks') as CentralBanksPanel | undefined;
      panel?.update(this.ctx.centralBanks);
    } catch (e) {
      console.warn('Failed to load central banks:', e);
    } finally {
      done(this.ctx, 'centralBanks');
    }
  }

  async loadVIX(): Promise<void> {
    if (!guard(this.ctx, 'vix')) return;
    try {
      const quotes = await fetchQuotes(['^VIX']);
      if (quotes.length) {
        this.ctx.vix = quotes[0];
        markFresh('vix');
        const panel = this.ctx.panels.get('volatility') as VolatilityPanel | undefined;
        panel?.update({ vix: this.ctx.vix });
      }
    } catch (e) {
      console.warn('Failed to load VIX:', e);
    } finally {
      done(this.ctx, 'vix');
    }
  }

  async loadWatchlist(): Promise<void> {
    if (!guard(this.ctx, 'watchlist')) return;
    try {
      const panel = this.ctx.panels.get('watchlist') as WatchlistPanel | undefined;
      if (!panel) return;
      const symbols = panel.getSymbols();
      if (!symbols.length) return;
      const [quotes, sparks] = await Promise.all([
        fetchQuotes(symbols),
        fetchSparkData(symbols),
      ]);
      this.ctx.watchlistQuotes = quotes.map(q => ({
        ...q,
        sparkData: sparks.get(q.symbol) ?? q.sparkData,
      }));
      markFresh('watchlist');
      panel.updateQuotes(this.ctx.watchlistQuotes);
    } catch (e) {
      console.warn('Failed to load watchlist:', e);
    } finally {
      done(this.ctx, 'watchlist');
    }
  }

  async loadFundamentals(period?: 'annual' | 'quarterly'): Promise<void> {
    if (!guard(this.ctx, 'fundamentals')) return;
    try {
      const panel = this.ctx.panels.get('fundamentals') as FundamentalsPanel | undefined;
      const p = period ?? panel?.getPeriod() ?? 'annual';

      const results = await Promise.allSettled(
        FUNDAMENTALS_SYMBOLS.map(async (ticker) => {
          const [income, balance, cashFlow] = await Promise.all([
            fetchIncomeStatements(ticker, p, 1),
            fetchBalanceSheets(ticker, p, 1),
            fetchCashFlowStatements(ticker, p, 1),
          ]);
          const inc = income[0];
          const bal = balance[0];
          const cf = cashFlow[0];
          if (!inc) return null;

          const opMargin = inc.revenue > 0 ? (inc.operating_income / inc.revenue) * 100 : 0;
          const fd: FundamentalsData = {
            ticker,
            revenue: inc.revenue ?? 0,
            netIncome: inc.net_income ?? 0,
            eps: inc.earnings_per_share_diluted ?? inc.earnings_per_share ?? 0,
            peRatio: null,
            totalAssets: bal?.total_assets ?? 0,
            totalDebt: bal?.total_debt ?? 0,
            freeCashFlow: cf?.free_cash_flow ?? 0,
            operatingMargin: opMargin,
            reportPeriod: inc.report_period ?? '',
          };
          return fd;
        })
      );

      this.ctx.fundamentals = results
        .filter((r): r is PromiseFulfilledResult<FundamentalsData | null> => r.status === 'fulfilled')
        .map(r => r.value)
        .filter((d): d is FundamentalsData => d !== null);

      markFresh('fundamentals');
      panel?.update(this.ctx.fundamentals);
    } catch (e) {
      console.warn('Failed to load fundamentals:', e);
    } finally {
      done(this.ctx, 'fundamentals');
    }
  }
}
