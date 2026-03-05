import { Panel } from './Panel';
import { QuoteData } from '@/app/app-context';
import { formatPrice, formatPercent, formatLargeNumber, changeClass } from '@/utils/format';
import { renderSparkline } from '@/utils/sparkline';
import { escapeHtml } from '@/utils/dom';

export class MarketsPanel extends Panel {
  private data: QuoteData[] = [];

  constructor() {
    super('markets', 'Top Stocks');
    this.setupFilters([
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        options: [
          { value: 'all', label: 'Default' },
          { value: 'change-desc', label: 'Gainers' },
          { value: 'change-asc', label: 'Losers' },
          { value: 'volume', label: 'Volume' },
        ],
        default: 'all',
      },
      {
        id: 'filter',
        label: 'Filter',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'gainers', label: 'Gainers' },
          { value: 'losers', label: 'Losers' },
        ],
        default: 'all',
      },
    ]);
  }

  protected onFilterChange(): void {
    this.render();
  }

  update(data: QuoteData[]): void {
    this.data = data;
    this.render();
  }

  private render(): void {
    if (!this.data.length) {
      this.setContent('<div class="panel-error">No data available</div>');
      this.setCount(0);
      return;
    }

    const filter = this.getFilter('filter');
    let filtered = this.data;
    if (filter === 'gainers') {
      filtered = filtered.filter((q) => q.changePercent > 0);
    } else if (filter === 'losers') {
      filtered = filtered.filter((q) => q.changePercent < 0);
    }

    const sort = this.getFilter('sort');
    if (sort === 'change-desc') {
      filtered = [...filtered].sort((a, b) => b.changePercent - a.changePercent);
    } else if (sort === 'change-asc') {
      filtered = [...filtered].sort((a, b) => a.changePercent - b.changePercent);
    } else if (sort === 'volume') {
      filtered = [...filtered].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    }

    if (!filtered.length) {
      this.setContent('<div class="panel-error">No matches</div>');
      this.setCount(0);
      return;
    }

    const rows = filtered.map((q) => {
      const cls = changeClass(q.changePercent);
      const vol = q.volume ? formatLargeNumber(q.volume) : '-';
      const mcap = q.marketCap ? formatLargeNumber(q.marketCap) : '-';
      const prevClose = (q.price - q.change).toFixed(2);
      const tt = `<div class='tt-title'>${escapeHtml(q.name)} (${escapeHtml(q.symbol)})</div><hr class='tt-divider'><div class='tt-row'><span class='tt-label'>Price</span><span class='tt-value'>$${formatPrice(q.price)}</span></div><div class='tt-row'><span class='tt-label'>Change</span><span class='tt-value ${q.change >= 0 ? 'tt-green' : 'tt-red'}'>$${q.change.toFixed(2)} (${formatPercent(q.changePercent)})</span></div><div class='tt-row'><span class='tt-label'>Prev Close</span><span class='tt-value'>$${prevClose}</span></div>${q.volume ? `<div class='tt-row'><span class='tt-label'>Volume</span><span class='tt-value'>${q.volume.toLocaleString()}</span></div>` : ''}${q.marketCap ? `<div class='tt-row'><span class='tt-label'>Market Cap</span><span class='tt-value'>$${mcap}</span></div>` : ''}`;
      return `<div class="panel-row" data-tooltip="${tt.replace(/"/g, '&quot;')}">
        <span class="symbol" data-stock-symbol="${escapeHtml(q.symbol)}" style="cursor:pointer">${escapeHtml(q.symbol)}</span>
        <span class="name">${escapeHtml(q.name)}</span>
        <span class="price">${formatPrice(q.price)}</span>
        <span class="change ${cls}">${formatPercent(q.changePercent)}</span>
        ${q.sparkData ? renderSparkline(q.sparkData) : ''}
        <span class="volume" style="min-width:50px;text-align:right;font-size:11px;color:var(--text-secondary)">${vol}</span>
      </div>`;
    }).join('');

    this.setContent(rows);
    this.setCount(filtered.length);
  }
}
