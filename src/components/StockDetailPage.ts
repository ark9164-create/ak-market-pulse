import { h, escapeHtml } from '@/utils/dom';
import { formatPrice, formatChange, formatPercent, formatLargeNumber, changeClass } from '@/utils/format';
import { fetchStockChart, fetchStockFundamentals } from '@/services/stock-detail-data';
import { fetchCompanyNews } from '@/services/finnhub';
import type { ChartData, StockFundamentals } from '@/services/stock-detail-data';

/* ── Range options ── */

interface RangeOption {
  value: string;
  label: string;
}

const RANGES: RangeOption[] = [
  { value: '1d', label: '1D' },
  { value: '5d', label: '5D' },
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '5y', label: '5Y' },
];

/* ── Chart layout constants ── */

const CHART_PADDING = { top: 12, right: 50, bottom: 28, left: 0 };

/* ── StockDetailPage ── */

export class StockDetailPage {
  readonly el: HTMLElement;
  private container: HTMLElement;
  private visible = false;
  private currentSymbol = '';
  private currentRange = '3mo';
  private chartData: ChartData | null = null;
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
    this.currentRange = '3mo';
    this.el.style.display = '';

    // Cancel any pending requests
    this.abortController?.abort();
    this.abortController = new AbortController();

    this.renderLoading();

    try {
      // Fetch chart and fundamentals in parallel
      const [chartData, fundamentals, news] = await Promise.allSettled([
        fetchStockChart(this.currentSymbol, this.currentRange),
        fetchStockFundamentals(this.currentSymbol),
        this.fetchNews(this.currentSymbol),
      ]);

      if (!this.visible || this.currentSymbol !== symbol.toUpperCase()) return;

      if (chartData.status === 'rejected') {
        this.renderError(chartData.reason instanceof Error ? chartData.reason.message : 'Failed to load stock data');
        return;
      }

      this.chartData = chartData.value;
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
    this.chartData = null;
    this.abortController?.abort();
    this.abortController = null;
  }

  /* ── Private: News fetch helper ── */

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
      </div>
      <div class="stock-detail-price-row">
        <span class="stock-detail-price">${formatPrice(price)}</span>
        <span class="stock-detail-change ${cls}">${formatChange(change)} (${formatPercent(changePct)})</span>
      </div>
      <div class="stock-detail-timestamp">${meta.currency} &middot; Last updated ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
    `;
    this.el.appendChild(header);

    // Chart section
    this.el.appendChild(this.buildChartSection(chart));

    // Metrics
    this.el.appendChild(this.buildMetricsSection(meta, fundamentals));

    // News
    this.el.appendChild(this.buildNewsSection(news));
  }

  /* ── Chart ── */

  private buildChartSection(chart: ChartData): HTMLElement {
    const section = h('div', { className: 'stock-detail-chart-section' });

    // Controls
    const controls = h('div', { className: 'stock-detail-chart-controls' });
    const label = h('label', null, 'Timeframe');
    const select = h('select', { className: 'stock-detail-range-select' });
    for (const r of RANGES) {
      const opt = h('option', { value: r.value }, r.label);
      if (r.value === this.currentRange) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener('change', () => {
      this.currentRange = select.value;
      this.reloadChart(section);
    });
    controls.appendChild(label);
    controls.appendChild(select);
    section.appendChild(controls);

    // Chart container
    const chartContainer = h('div', { className: 'stock-detail-chart-container' });
    section.appendChild(chartContainer);

    // Render SVG after DOM insertion (need dimensions)
    requestAnimationFrame(() => {
      this.renderChart(chartContainer, chart);
    });

    return section;
  }

  private async reloadChart(section: HTMLElement): Promise<void> {
    const chartContainer = section.querySelector('.stock-detail-chart-container') as HTMLElement;
    if (!chartContainer) return;

    chartContainer.innerHTML = '<div class="stock-detail-loading"><div class="spinner"></div></div>';

    try {
      const chart = await fetchStockChart(this.currentSymbol, this.currentRange);
      if (!this.visible) return;
      this.chartData = chart;
      chartContainer.innerHTML = '';
      this.renderChart(chartContainer, chart);
    } catch (err) {
      chartContainer.innerHTML = `<div class="stock-detail-error">${escapeHtml(err instanceof Error ? err.message : 'Chart load failed')}</div>`;
    }
  }

  private renderChart(container: HTMLElement, chart: ChartData): void {
    const { timestamps, prices } = chart;
    if (prices.length < 2) {
      container.innerHTML = '<div class="stock-detail-error">Not enough data to render chart</div>';
      return;
    }

    const rect = container.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 300;
    const pad = CHART_PADDING;
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const pricePadding = priceRange * 0.05;
    const yMin = minPrice - pricePadding;
    const yMax = maxPrice + pricePadding;
    const yRange = yMax - yMin;

    const tMin = timestamps[0];
    const tMax = timestamps[timestamps.length - 1];
    const tRange = tMax - tMin || 1;

    // Map data to pixel coordinates
    const toX = (t: number) => pad.left + ((t - tMin) / tRange) * plotW;
    const toY = (p: number) => pad.top + (1 - (p - yMin) / yRange) * plotH;

    // Determine color from overall change
    const isPositive = prices[prices.length - 1] >= prices[0];
    const colorClass = isPositive ? 'positive' : 'negative';

    // Build SVG path
    const linePoints = timestamps.map((t, i) => `${toX(t).toFixed(1)},${toY(prices[i]).toFixed(1)}`);
    const linePath = `M${linePoints.join('L')}`;

    // Area path (fill below line)
    const bottomY = pad.top + plotH;
    const areaPath = `${linePath}L${toX(tMax).toFixed(1)},${bottomY}L${toX(tMin).toFixed(1)},${bottomY}Z`;

    // Y-axis grid lines + labels (5 lines)
    const yGridCount = 5;
    let yGridHtml = '';
    for (let i = 0; i <= yGridCount; i++) {
      const val = yMin + (yRange * i) / yGridCount;
      const y = toY(val);
      yGridHtml += `<line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${width - pad.right}" y2="${y.toFixed(1)}" class="stock-chart-grid-line" />`;
      yGridHtml += `<text x="${width - pad.right + 6}" y="${(y + 3).toFixed(1)}" class="stock-chart-axis-label" text-anchor="start">${formatPrice(val)}</text>`;
    }

    // X-axis labels (up to 6)
    const xLabelCount = Math.min(6, timestamps.length);
    let xLabelsHtml = '';
    const isIntraday = this.currentRange === '1d' || this.currentRange === '5d';
    for (let i = 0; i < xLabelCount; i++) {
      const idx = Math.round((i / (xLabelCount - 1)) * (timestamps.length - 1));
      const t = timestamps[idx];
      const x = toX(t);
      const d = new Date(t * 1000);
      const labelText = isIntraday
        ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      xLabelsHtml += `<text x="${x.toFixed(1)}" y="${(height - 4).toFixed(1)}" class="stock-chart-axis-label" text-anchor="middle">${labelText}</text>`;
    }

    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = `
      ${yGridHtml}
      ${xLabelsHtml}
      <path d="${areaPath}" class="stock-chart-area ${colorClass}" />
      <path d="${linePath}" class="stock-chart-line ${colorClass}" />
      <line class="stock-chart-crosshair-line" x1="0" y1="0" x2="0" y2="0" style="display:none" />
      <circle class="stock-chart-crosshair-dot" r="4" cx="0" cy="0" style="display:none" />
    `;

    container.appendChild(svg);

    // Tooltip element
    const tooltip = h('div', { className: 'stock-chart-tooltip' });
    tooltip.style.display = 'none';
    container.appendChild(tooltip);

    // Crosshair interaction
    const crosshairLine = svg.querySelector('.stock-chart-crosshair-line') as SVGLineElement;
    const crosshairDot = svg.querySelector('.stock-chart-crosshair-dot') as SVGCircleElement;

    const handleMouseMove = (e: MouseEvent) => {
      const svgRect = svg.getBoundingClientRect();
      const mouseX = ((e.clientX - svgRect.left) / svgRect.width) * width;

      // Find nearest data point
      const tAtMouse = tMin + ((mouseX - pad.left) / plotW) * tRange;
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < timestamps.length; i++) {
        const dist = Math.abs(timestamps[i] - tAtMouse);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }

      const px = toX(timestamps[nearestIdx]);
      const py = toY(prices[nearestIdx]);

      // Update crosshair
      crosshairLine.setAttribute('x1', px.toFixed(1));
      crosshairLine.setAttribute('y1', pad.top.toString());
      crosshairLine.setAttribute('x2', px.toFixed(1));
      crosshairLine.setAttribute('y2', (pad.top + plotH).toString());
      crosshairLine.style.display = '';

      crosshairDot.setAttribute('cx', px.toFixed(1));
      crosshairDot.setAttribute('cy', py.toFixed(1));
      crosshairDot.style.display = '';

      // Update tooltip
      const d = new Date(timestamps[nearestIdx] * 1000);
      const dateStr = isIntraday
        ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      tooltip.innerHTML = `
        <div class="stock-chart-tooltip-price">${formatPrice(prices[nearestIdx])}</div>
        <div class="stock-chart-tooltip-date">${dateStr}</div>
      `;
      tooltip.style.display = '';

      // Position tooltip
      const tooltipX = (px / width) * svgRect.width;
      const tooltipY = (py / height) * svgRect.height;
      const tooltipW = tooltip.offsetWidth;

      // Flip tooltip if near right edge
      if (tooltipX + tooltipW + 16 > svgRect.width) {
        tooltip.style.left = `${tooltipX - tooltipW - 12}px`;
      } else {
        tooltip.style.left = `${tooltipX + 12}px`;
      }
      tooltip.style.top = `${tooltipY - 20}px`;
    };

    const handleMouseLeave = () => {
      crosshairLine.style.display = 'none';
      crosshairDot.style.display = 'none';
      tooltip.style.display = 'none';
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
  }

  /* ── Metrics ── */

  private buildMetricsSection(meta: ChartData['meta'], fundamentals: StockFundamentals | null): HTMLElement {
    const section = h('div', { className: 'stock-detail-metrics-section' });

    // Row 1: Price Metrics
    section.appendChild(this.buildMetricsRow('Price Metrics', [
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
      { label: '52 Week Range', value: fiftyTwoRange },
    ]));

    // Row 3: Fundamentals (Income Statement)
    const inc = fundamentals?.income;
    const opMargin = inc && inc.revenue > 0 ? ((inc.operating_income / inc.revenue) * 100).toFixed(1) + '%' : null;
    section.appendChild(this.buildMetricsRow('Fundamentals', [
      { label: 'Revenue', value: inc ? formatLargeNumber(inc.revenue) : null },
      { label: 'Net Income', value: inc ? formatLargeNumber(inc.net_income) : null },
      { label: 'EPS', value: inc ? formatPrice(inc.earnings_per_share_diluted) : null },
      { label: 'Operating Margin', value: opMargin },
    ]));

    // Row 4: Balance Sheet
    const bal = fundamentals?.balance;
    section.appendChild(this.buildMetricsRow('Balance Sheet', [
      { label: 'Total Assets', value: bal ? formatLargeNumber(bal.total_assets) : null },
      { label: 'Total Debt', value: bal ? formatLargeNumber(bal.total_debt) : null },
      { label: 'Cash & Equiv', value: bal ? formatLargeNumber(bal.cash_and_equivalents) : null },
      { label: 'Equity', value: bal ? formatLargeNumber(bal.shareholders_equity) : null },
    ]));

    // Row 5: Cash Flow
    const cf = fundamentals?.cashFlow;
    section.appendChild(this.buildMetricsRow('Cash Flow', [
      { label: 'Operating CF', value: cf ? formatLargeNumber(cf.operating_cash_flow) : null },
      { label: 'CapEx', value: cf ? formatLargeNumber(cf.capital_expenditure) : null },
      { label: 'Free Cash Flow', value: cf ? formatLargeNumber(cf.free_cash_flow) : null },
      { label: 'Dividends Paid', value: cf ? formatLargeNumber(cf.dividends_paid) : null },
    ]));

    return section;
  }

  private buildMetricsRow(title: string, metrics: { label: string; value: string | null }[]): HTMLElement {
    const frag = document.createDocumentFragment();

    const rowLabel = h('div', { className: 'stock-detail-metrics-row-label' }, title);
    frag.appendChild(rowLabel);

    const grid = h('div', { className: 'stock-detail-metrics-grid' });
    for (const m of metrics) {
      const card = h('div', { className: 'stock-detail-metric-card' });
      card.innerHTML = `
        <div class="stock-detail-metric-label">${escapeHtml(m.label)}</div>
        <div class="stock-detail-metric-value${m.value == null ? ' na' : ''}">${m.value != null ? escapeHtml(m.value) : '--'}</div>
      `;
      grid.appendChild(card);
    }
    frag.appendChild(grid);

    // Wrap in a container div
    const wrapper = h('div', null);
    wrapper.appendChild(frag);
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
