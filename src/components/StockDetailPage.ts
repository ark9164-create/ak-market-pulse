import { h, escapeHtml } from '@/utils/dom';
import { formatPrice, formatChange, formatPercent, formatLargeNumber, changeClass } from '@/utils/format';
import { fetchStockChart, fetchStockFundamentals } from '@/services/stock-detail-data';
import { fetchCompanyNews } from '@/services/finnhub';
import type { ChartData, StockFundamentals } from '@/services/stock-detail-data';

/* ── TradingView widget script base URL ── */

const TV_SCRIPT_BASE = 'https://s3.tradingview.com/external-embedding/embed-widget-';

/* ── TradingView widget configs (cherry-picked from OpenStock) ── */

function tvChartConfig(symbol: string): Record<string, unknown> {
  return {
    allow_symbol_change: false,
    calendar: false,
    details: true,
    hide_side_toolbar: true,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_volume: false,
    hotlist: false,
    interval: 'D',
    locale: 'en',
    save_image: false,
    style: 1,
    symbol: symbol.toUpperCase(),
    theme: 'dark',
    timezone: 'Etc/UTC',
    backgroundColor: '#0f1117',
    gridColor: '#1a1d29',
    watchlist: [],
    withdateranges: true,
    compareSymbols: [],
    studies: ['STD;RSI'],
    width: '100%',
    height: 500,
    autosize: true,
  };
}

function tvTechnicalConfig(symbol: string): Record<string, unknown> {
  return {
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: true,
    locale: 'en',
    width: '100%',
    height: 400,
    interval: '1h',
    largeChartUrl: '',
  };
}

function tvProfileConfig(symbol: string): Record<string, unknown> {
  return {
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: true,
    locale: 'en',
    width: '100%',
    height: 440,
  };
}

function tvFinancialsConfig(symbol: string): Record<string, unknown> {
  return {
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: true,
    locale: 'en',
    width: '100%',
    height: 464,
    displayMode: 'regular',
    largeChartUrl: '',
  };
}

/* ── StockDetailPage ── */

export class StockDetailPage {
  readonly el: HTMLElement;
  private container: HTMLElement;
  private visible = false;
  private currentSymbol = '';
  private abortController: AbortController | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.el = h('div', { className: 'stock-detail-page' });
    this.el.style.display = 'none';
    this.container.appendChild(this.el);
  }

  isVisible(): boolean {
    return this.visible;
  }

  async show(symbol: string): Promise<void> {
    this.visible = true;
    this.currentSymbol = symbol.toUpperCase();
    this.el.style.display = '';

    this.abortController?.abort();
    this.abortController = new AbortController();

    this.renderLoading();

    try {
      const [chartData, fundamentals, news] = await Promise.allSettled([
        fetchStockChart(this.currentSymbol, '3mo'),
        fetchStockFundamentals(this.currentSymbol),
        this.fetchNews(this.currentSymbol),
      ]);

      if (!this.visible || this.currentSymbol !== symbol.toUpperCase()) return;

      if (chartData.status === 'rejected') {
        this.renderError(chartData.reason instanceof Error ? chartData.reason.message : 'Failed to load stock data');
        return;
      }

      const fundData = fundamentals.status === 'fulfilled' ? fundamentals.value : null;
      const newsData = news.status === 'fulfilled' ? news.value : [];

      try {
        this.renderFull(chartData.value, fundData, newsData);
      } catch (renderErr) {
        console.error('[StockDetail] Render error:', renderErr);
        this.renderError(renderErr instanceof Error ? renderErr.message : 'Render failed');
      }
    } catch (err) {
      if (!this.visible) return;
      console.error('[StockDetail] Load error:', err);
      this.renderError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  hide(): void {
    this.visible = false;
    this.currentSymbol = '';
    this.el.style.display = 'none';
    this.el.innerHTML = '';
    this.abortController?.abort();
    this.abortController = null;
  }

  /* ── News fetch ── */

  private async fetchNews(symbol: string): Promise<NewsItem[]> {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const items = await fetchCompanyNews(symbol, fmt(from), fmt(to));
    return items.slice(0, 15).map(item => ({
      datetime: item.datetime,
      headline: item.headline,
      source: item.source,
      url: item.url,
    }));
  }

  /* ── TradingView widget injection (from OpenStock pattern) ── */

  private injectTradingViewWidget(container: HTMLElement, scriptName: string, config: Record<string, unknown>): void {
    container.innerHTML = '';
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.width = '100%';
    widgetDiv.style.height = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = `${TV_SCRIPT_BASE}${scriptName}.js`;
    script.async = true;
    script.innerHTML = JSON.stringify(config);
    container.appendChild(script);
  }

  /* ── Sentiment scoring (inspired by stocksight) ── */

  private scoreSentiment(news: NewsItem[]): { score: number; label: string; cls: string } {
    if (news.length === 0) return { score: 0, label: 'Neutral', cls: 'neutral' };

    const positiveWords = /\b(surge|soar|rally|gain|rise|jump|beat|upgrade|bull|boom|record|strong|growth|profit|outperform)\b/i;
    const negativeWords = /\b(crash|plunge|fall|drop|decline|miss|downgrade|bear|bust|weak|loss|cut|warn|risk|fail|lawsuit|recall)\b/i;

    let positiveCount = 0;
    let negativeCount = 0;
    for (const item of news) {
      if (positiveWords.test(item.headline)) positiveCount++;
      if (negativeWords.test(item.headline)) negativeCount++;
    }

    const total = positiveCount + negativeCount;
    if (total === 0) return { score: 50, label: 'Neutral', cls: 'neutral' };

    const score = Math.round((positiveCount / total) * 100);
    if (score >= 65) return { score, label: 'Bullish', cls: 'positive' };
    if (score <= 35) return { score, label: 'Bearish', cls: 'negative' };
    return { score, label: 'Mixed', cls: 'neutral' };
  }

  /* ── Rendering ── */

  private renderLoading(): void {
    this.el.innerHTML = `
      <button class="stock-detail-back" onclick="window.location.hash=''">&larr; Dashboard</button>
      <div class="stock-detail-loading">
        <div class="spinner"></div>
        Loading ${escapeHtml(this.currentSymbol)}...
      </div>
    `;
  }

  private renderError(message: string): void {
    this.el.innerHTML = `
      <button class="stock-detail-back" onclick="window.location.hash=''">&larr; Dashboard</button>
      <div class="stock-detail-error">Failed to load data for ${escapeHtml(this.currentSymbol)}: ${escapeHtml(message)}</div>
    `;
  }

  private renderFull(chart: ChartData, fundamentals: StockFundamentals | null, news: NewsItem[]): void {
    const { meta } = chart;
    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.chartPreviousClose || 0;
    const change = price - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
    const cls = changeClass(change);
    const sentiment = this.scoreSentiment(news);

    this.el.innerHTML = '';

    // Back button
    const backBtn = h('button', { className: 'stock-detail-back' });
    backBtn.innerHTML = '&larr; Dashboard';
    backBtn.addEventListener('click', () => { window.location.hash = ''; });
    this.el.appendChild(backBtn);

    // Price header
    const header = h('div', { className: 'stock-detail-header' });
    header.innerHTML = `
      <div class="stock-detail-symbol-row">
        <span class="stock-detail-symbol">${escapeHtml(meta.symbol || this.currentSymbol)}</span>
        <span class="stock-detail-name">${escapeHtml(meta.longName || meta.shortName || '')}</span>
        <span class="stock-detail-sentiment ${sentiment.cls}" title="News sentiment (${sentiment.score}/100)">${sentiment.label}</span>
      </div>
      <div class="stock-detail-price-row">
        <span class="stock-detail-price">${formatPrice(price)}</span>
        <span class="stock-detail-change ${cls}">${formatChange(change)} (${formatPercent(changePct)})</span>
      </div>
      <div class="stock-detail-timestamp">${meta.currency} &middot; Last updated ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
    `;
    this.el.appendChild(header);

    // Two-column layout
    const columns = h('div', { className: 'stock-detail-columns' });

    // Left column: TradingView Chart + Technical Analysis
    const leftCol = h('div', { className: 'stock-detail-col-left' });

    // TradingView Advanced Chart
    const chartSection = h('div', { className: 'stock-detail-tv-section stock-detail-tv-chart' });
    this.injectTradingViewWidget(chartSection, 'advanced-chart', tvChartConfig(this.currentSymbol));
    leftCol.appendChild(chartSection);

    // TradingView Technical Analysis
    const taSection = h('div', { className: 'stock-detail-tv-section stock-detail-tv-ta' });
    const taLabel = h('div', { className: 'stock-detail-section-label' }, 'Technical Analysis');
    leftCol.appendChild(taLabel);
    this.injectTradingViewWidget(taSection, 'technical-analysis', tvTechnicalConfig(this.currentSymbol));
    leftCol.appendChild(taSection);

    columns.appendChild(leftCol);

    // Right column: Metrics + Company Profile + Financials
    const rightCol = h('div', { className: 'stock-detail-col-right' });

    // Metrics (Price, Volume, Fundamentals, Ratios, Balance Sheet, Cash Flow)
    rightCol.appendChild(this.buildMetricsSection(meta, fundamentals, price));

    // TradingView Company Profile
    const profileLabel = h('div', { className: 'stock-detail-section-label' }, 'Company Profile');
    rightCol.appendChild(profileLabel);
    const profileSection = h('div', { className: 'stock-detail-tv-section stock-detail-tv-profile' });
    this.injectTradingViewWidget(profileSection, 'symbol-profile', tvProfileConfig(this.currentSymbol));
    rightCol.appendChild(profileSection);

    // TradingView Financials
    const finLabel = h('div', { className: 'stock-detail-section-label' }, 'Financial Statements');
    rightCol.appendChild(finLabel);
    const finSection = h('div', { className: 'stock-detail-tv-section stock-detail-tv-financials' });
    this.injectTradingViewWidget(finSection, 'financials', tvFinancialsConfig(this.currentSymbol));
    rightCol.appendChild(finSection);

    columns.appendChild(rightCol);
    this.el.appendChild(columns);

    // News (full width below columns)
    this.el.appendChild(this.buildNewsSection(news));
  }

  /* ── Metrics (with FinanceToolkit-inspired computed ratios) ── */

  private buildMetricsSection(meta: ChartData['meta'], fundamentals: StockFundamentals | null, price: number): HTMLElement {
    const section = h('div', { className: 'stock-detail-metrics-section' });

    // Row 1: Price Metrics
    section.appendChild(this.buildMetricsRow('Price', [
      { label: 'Open', value: meta.regularMarketOpen ? formatPrice(meta.regularMarketOpen) : null },
      { label: 'Day High', value: meta.regularMarketDayHigh ? formatPrice(meta.regularMarketDayHigh) : null },
      { label: 'Day Low', value: meta.regularMarketDayLow ? formatPrice(meta.regularMarketDayLow) : null },
      { label: 'Prev Close', value: meta.chartPreviousClose ? formatPrice(meta.chartPreviousClose) : null },
    ]));

    // Row 2: Volume & Market
    const fiftyTwoRange = meta.fiftyTwoWeekLow && meta.fiftyTwoWeekHigh
      ? `${formatPrice(meta.fiftyTwoWeekLow)} - ${formatPrice(meta.fiftyTwoWeekHigh)}`
      : null;
    section.appendChild(this.buildMetricsRow('Volume & Market', [
      { label: 'Volume', value: meta.regularMarketVolume ? formatLargeNumber(meta.regularMarketVolume) : null },
      { label: 'Avg Volume', value: meta.averageDailyVolume10Day ? formatLargeNumber(meta.averageDailyVolume10Day) : null },
      { label: 'Market Cap', value: meta.marketCap ? formatLargeNumber(meta.marketCap) : null },
      { label: '52W Range', value: fiftyTwoRange },
    ]));

    const inc = fundamentals?.income;
    const bal = fundamentals?.balance;
    const cf = fundamentals?.cashFlow;

    // Row 3: Profitability Ratios (FinanceToolkit inspired)
    const grossMargin = inc && inc.revenue > 0 ? ((inc.gross_profit / inc.revenue) * 100) : null;
    const opMargin = inc && inc.revenue > 0 ? ((inc.operating_income / inc.revenue) * 100) : null;
    const netMargin = inc && inc.revenue > 0 ? ((inc.net_income / inc.revenue) * 100) : null;
    const roe = inc && bal && bal.shareholders_equity > 0 ? ((inc.net_income / bal.shareholders_equity) * 100) : null;

    section.appendChild(this.buildMetricsRow('Profitability', [
      { label: 'Gross Margin', value: grossMargin != null ? grossMargin.toFixed(1) + '%' : null, colorize: grossMargin },
      { label: 'Op Margin', value: opMargin != null ? opMargin.toFixed(1) + '%' : null, colorize: opMargin },
      { label: 'Net Margin', value: netMargin != null ? netMargin.toFixed(1) + '%' : null, colorize: netMargin },
      { label: 'ROE', value: roe != null ? roe.toFixed(1) + '%' : null, colorize: roe },
    ]));

    // Row 4: Valuation Ratios (FinanceToolkit inspired)
    const eps = inc ? inc.earnings_per_share_diluted : null;
    const pe = eps && eps > 0 && price > 0 ? price / eps : null;
    const bookValue = bal ? bal.shareholders_equity : null;
    // Rough shares estimate from market cap / price
    const sharesEst = meta.marketCap && price > 0 ? meta.marketCap / price : null;
    const bvps = bookValue != null && sharesEst ? bookValue / sharesEst : null;
    const pb = bvps && bvps > 0 && price > 0 ? price / bvps : null;
    const roa = inc && bal && bal.total_assets > 0 ? ((inc.net_income / bal.total_assets) * 100) : null;
    const debtEquity = bal && bal.shareholders_equity > 0 ? (bal.total_debt / bal.shareholders_equity) : null;

    section.appendChild(this.buildMetricsRow('Valuation', [
      { label: 'P/E Ratio', value: pe != null ? pe.toFixed(1) + 'x' : null },
      { label: 'P/B Ratio', value: pb != null ? pb.toFixed(1) + 'x' : null },
      { label: 'ROA', value: roa != null ? roa.toFixed(1) + '%' : null, colorize: roa },
      { label: 'Debt/Equity', value: debtEquity != null ? debtEquity.toFixed(2) + 'x' : null },
    ]));

    // Row 5: Income
    section.appendChild(this.buildMetricsRow('Income Statement', [
      { label: 'Revenue', value: inc ? formatLargeNumber(inc.revenue) : null },
      { label: 'Net Income', value: inc ? formatLargeNumber(inc.net_income) : null, colorize: inc?.net_income },
      { label: 'EPS', value: eps != null ? formatPrice(eps) : null },
      { label: 'Op Income', value: inc ? formatLargeNumber(inc.operating_income) : null, colorize: inc?.operating_income },
    ]));

    // Row 6: Balance Sheet
    section.appendChild(this.buildMetricsRow('Balance Sheet', [
      { label: 'Total Assets', value: bal ? formatLargeNumber(bal.total_assets) : null },
      { label: 'Total Debt', value: bal ? formatLargeNumber(bal.total_debt) : null },
      { label: 'Cash & Equiv', value: bal ? formatLargeNumber(bal.cash_and_equivalents) : null },
      { label: 'Equity', value: bal ? formatLargeNumber(bal.shareholders_equity) : null },
    ]));

    // Row 7: Cash Flow
    section.appendChild(this.buildMetricsRow('Cash Flow', [
      { label: 'Operating CF', value: cf ? formatLargeNumber(cf.operating_cash_flow) : null, colorize: cf?.operating_cash_flow },
      { label: 'CapEx', value: cf ? formatLargeNumber(cf.capital_expenditure) : null },
      { label: 'Free Cash Flow', value: cf ? formatLargeNumber(cf.free_cash_flow) : null, colorize: cf?.free_cash_flow },
      { label: 'Dividends Paid', value: cf ? formatLargeNumber(cf.dividends_paid) : null },
    ]));

    return section;
  }

  private buildMetricsRow(title: string, metrics: { label: string; value: string | null; colorize?: number | null | undefined }[]): HTMLElement {
    const wrapper = h('div', null);

    const rowLabel = h('div', { className: 'stock-detail-metrics-row-label' }, title);
    wrapper.appendChild(rowLabel);

    const grid = h('div', { className: 'stock-detail-metrics-grid' });
    for (const m of metrics) {
      const card = h('div', { className: 'stock-detail-metric-card' });
      let valueCls = 'stock-detail-metric-value';
      if (m.value == null) valueCls += ' na';
      else if (m.colorize != null) valueCls += ` ${changeClass(m.colorize)}`;

      card.innerHTML = `
        <div class="stock-detail-metric-label">${escapeHtml(m.label)}</div>
        <div class="${valueCls}">${m.value != null ? escapeHtml(m.value) : '--'}</div>
      `;
      grid.appendChild(card);
    }
    wrapper.appendChild(grid);
    return wrapper;
  }

  /* ── News ── */

  private buildNewsSection(news: NewsItem[]): HTMLElement {
    const section = h('div', { className: 'stock-detail-news-section' });

    const title = h('div', { className: 'stock-detail-news-title' }, `${this.currentSymbol} News`);
    section.appendChild(title);

    if (news.length === 0) {
      section.appendChild(h('div', { className: 'stock-detail-news-empty' }, 'No recent news found'));
      return section;
    }

    const list = h('div', { className: 'stock-detail-news-list' });
    for (const item of news) {
      const d = new Date(item.datetime * 1000);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const newsItem = h('div', { className: 'stock-detail-news-item' });
      newsItem.innerHTML = `
        <span class="stock-detail-news-date">${escapeHtml(dateStr)}</span>
        <span class="stock-detail-news-source">${escapeHtml(item.source)}</span>
        <a class="stock-detail-news-headline" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.headline)}</a>
      `;
      list.appendChild(newsItem);
    }

    section.appendChild(list);
    return section;
  }
}

/* ── Internal types ── */

interface NewsItem {
  datetime: number;
  headline: string;
  source: string;
  url: string;
}
