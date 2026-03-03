import { Panel } from './Panel';
import { QuoteData } from '@/app/app-context';
import { formatPrice, formatChange, formatPercent, changeClass } from '@/utils/format';
import { renderSparkline } from '@/utils/sparkline';
import { escapeHtml } from '@/utils/dom';

const REGIONS: Record<string, string[]> = {
  americas: ['^GSPC', '^DJI', '^IXIC'],
  europe: ['^FTSE', '^GDAXI'],
  asia: ['^N225', '^HSI'],
};

export class IndicesPanel extends Panel {
  private data: QuoteData[] = [];

  constructor() {
    super('indices', 'Global Indices');
    this.setupFilters([
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        options: [
          { value: 'all', label: 'Default' },
          { value: 'change-desc', label: 'Gainers' },
          { value: 'change-asc', label: 'Losers' },
        ],
        default: 'all',
      },
      { id: 'americas', label: 'Americas', type: 'toggle', default: 'true' },
      { id: 'europe', label: 'Europe', type: 'toggle', default: 'true' },
      { id: 'asia', label: 'Asia', type: 'toggle', default: 'true' },
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

    let filtered = this.data.filter((q) => {
      for (const [region, symbols] of Object.entries(REGIONS)) {
        if (symbols.includes(q.symbol) && !this.isFilterActive(region)) {
          return false;
        }
      }
      return true;
    });

    const sort = this.getFilter('sort');
    if (sort === 'change-desc') {
      filtered = [...filtered].sort((a, b) => b.changePercent - a.changePercent);
    } else if (sort === 'change-asc') {
      filtered = [...filtered].sort((a, b) => a.changePercent - b.changePercent);
    }

    if (!filtered.length) {
      this.setContent('<div class="panel-error">No matches</div>');
      this.setCount(0);
      return;
    }

    const rows = filtered.map((q) => {
      const cls = changeClass(q.changePercent);
      const tt = `<div class='tt-title'>${escapeHtml(q.name)}</div><div class='tt-row'><span class='tt-label'>Price</span><span class='tt-value'>${formatPrice(q.price)}</span></div><div class='tt-row'><span class='tt-label'>Change</span><span class='tt-value ${q.change >= 0 ? 'tt-green' : 'tt-red'}'>${formatChange(q.change)} (${formatPercent(q.changePercent)})</span></div>${q.volume ? `<div class='tt-row'><span class='tt-label'>Volume</span><span class='tt-value'>${q.volume.toLocaleString()}</span></div>` : ''}${q.marketCap ? `<div class='tt-row'><span class='tt-label'>Mkt Cap</span><span class='tt-value'>${(q.marketCap / 1e9).toFixed(1)}B</span></div>` : ''}`;
      return `<div class="panel-row" data-tooltip="${tt.replace(/"/g, '&quot;')}">
        <span class="symbol">${escapeHtml(q.symbol)}</span>
        <span class="name">${escapeHtml(q.name)}</span>
        <span class="price">${formatPrice(q.price)}</span>
        <span class="change ${cls}">${formatPercent(q.changePercent)}</span>
        ${q.sparkData ? renderSparkline(q.sparkData) : ''}
      </div>`;
    }).join('');

    this.setContent(rows);
    this.setCount(filtered.length);
  }
}
