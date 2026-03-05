import { Panel } from './Panel';
import { QuoteData } from '@/app/app-context';
import { formatPrice, formatChange, formatPercent, formatLargeNumber, changeClass } from '@/utils/format';
import { renderSparkline } from '@/utils/sparkline';
import { escapeHtml } from '@/utils/dom';

export class TopMoversPanel extends Panel {
  private data: QuoteData[] = [];

  constructor() {
    super('topMovers', 'Top Movers');
    this.setupFilters([
      {
        id: 'direction',
        label: 'Direction',
        type: 'select',
        options: [
          { value: 'gainers', label: 'Gainers' },
          { value: 'losers', label: 'Losers' },
        ],
        default: 'gainers',
      },
      {
        id: 'count',
        label: 'Count',
        type: 'select',
        options: [
          { value: '5', label: '5' },
          { value: '10', label: '10' },
          { value: '20', label: '20' },
        ],
        default: '10',
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

    const direction = this.getFilter('direction');
    const count = parseInt(this.getFilter('count'), 10) || 10;

    // Sort by changePercent: gainers desc, losers asc
    let sorted = [...this.data].sort((a, b) => {
      if (direction === 'gainers') {
        return b.changePercent - a.changePercent;
      }
      return a.changePercent - b.changePercent;
    });

    // Filter to only positive (gainers) or negative (losers)
    if (direction === 'gainers') {
      sorted = sorted.filter(q => q.changePercent > 0);
    } else {
      sorted = sorted.filter(q => q.changePercent < 0);
    }

    const top = sorted.slice(0, count);

    if (!top.length) {
      this.setContent(`<div class="panel-error">No ${direction} found</div>`);
      this.setCount(0);
      return;
    }

    const rows = top.map((q, i) => {
      const cls = changeClass(q.changePercent);
      const rank = i + 1;
      const prevClose = (q.price - q.change).toFixed(2);
      const tt = `<div class='tt-title'>${escapeHtml(q.name)} (${escapeHtml(q.symbol)})</div><hr class='tt-divider'><div class='tt-row'><span class='tt-label'>Price</span><span class='tt-value'>$${formatPrice(q.price)}</span></div><div class='tt-row'><span class='tt-label'>Change</span><span class='tt-value ${q.change >= 0 ? 'tt-green' : 'tt-red'}'>${formatChange(q.change)} (${formatPercent(q.changePercent)})</span></div><div class='tt-row'><span class='tt-label'>Prev Close</span><span class='tt-value'>$${prevClose}</span></div>${q.volume ? `<div class='tt-row'><span class='tt-label'>Volume</span><span class='tt-value'>${q.volume.toLocaleString()}</span></div>` : ''}`;
      return `<div class="panel-row" data-tooltip="${tt.replace(/"/g, '&quot;')}" style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px">
        <span style="flex:0 0 20px;color:var(--text-muted);text-align:right;font-size:11px">${rank}</span>
        <span class="symbol" data-stock-symbol="${escapeHtml(q.symbol)}" style="flex:0 0 55px;font-weight:700;cursor:pointer">${escapeHtml(q.symbol)}</span>
        <span class="name" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);font-size:11px">${escapeHtml(q.name)}</span>
        <span class="price" style="flex:0 0 65px;text-align:right">${formatPrice(q.price)}</span>
        <span class="change ${cls}" style="flex:0 0 60px;text-align:right;font-weight:600">${formatPercent(q.changePercent)}</span>
        <span style="flex:0 0 80px">${q.sparkData ? renderSparkline(q.sparkData) : ''}</span>
      </div>`;
    }).join('');

    this.setContent(rows);
    this.setCount(top.length);
  }
}
