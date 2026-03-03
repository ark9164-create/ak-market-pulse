import { Panel } from './Panel';
import { QuoteData } from '@/app/app-context';
import { formatPrice, formatChange, formatPercent, formatLargeNumber, changeClass } from '@/utils/format';
import { renderSparkline } from '@/utils/sparkline';
import { escapeHtml } from '@/utils/dom';

export class CryptoPanel extends Panel {
  private data: QuoteData[] = [];

  constructor() {
    super('crypto', 'Crypto');
    this.setupFilters([
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        options: [
          { value: 'all', label: 'Default' },
          { value: 'change-desc', label: 'Gainers' },
          { value: 'change-asc', label: 'Losers' },
          { value: 'price-desc', label: 'Price' },
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

    let sorted = [...this.data];
    const sort = this.getFilter('sort');
    if (sort === 'change-desc') {
      sorted.sort((a, b) => b.changePercent - a.changePercent);
    } else if (sort === 'change-asc') {
      sorted.sort((a, b) => a.changePercent - b.changePercent);
    } else if (sort === 'price-desc') {
      sorted.sort((a, b) => b.price - a.price);
    }

    const rows = sorted.map((q) => {
      const cls = changeClass(q.changePercent);
      const tt = `<div class='tt-title'>${escapeHtml(q.name)}</div><div class='tt-muted'>${escapeHtml(q.symbol)}</div><hr class='tt-divider'><div class='tt-row'><span class='tt-label'>Price</span><span class='tt-value'>$${formatPrice(q.price, 2)}</span></div><div class='tt-row'><span class='tt-label'>24h Change</span><span class='tt-value ${q.change >= 0 ? 'tt-green' : 'tt-red'}'>${formatChange(q.change)} (${formatPercent(q.changePercent)})</span></div>${q.volume ? `<div class='tt-row'><span class='tt-label'>24h Volume</span><span class='tt-value'>$${formatLargeNumber(q.volume)}</span></div>` : ''}${q.marketCap ? `<div class='tt-row'><span class='tt-label'>Market Cap</span><span class='tt-value'>$${formatLargeNumber(q.marketCap)}</span></div>` : ''}`;
      return `<div class="panel-row" data-tooltip="${tt.replace(/"/g, '&quot;')}">
        <span class="symbol">${escapeHtml(q.symbol)}</span>
        <span class="name">${escapeHtml(q.name)}</span>
        <span class="price">${formatPrice(q.price, 2)}</span>
        <span class="change ${cls}">${formatPercent(q.changePercent)} 24h</span>
        ${q.sparkData ? renderSparkline(q.sparkData) : ''}
      </div>`;
    }).join('');

    this.setContent(rows);
    this.setCount(sorted.length);
  }
}
