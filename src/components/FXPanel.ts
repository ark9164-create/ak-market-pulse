import { Panel } from './Panel';
import { FXData } from '@/app/app-context';
import { formatPercent, changeClass } from '@/utils/format';
import { renderSparkline } from '@/utils/sparkline';
import { escapeHtml } from '@/utils/dom';

export class FXPanel extends Panel {
  private data: FXData[] = [];

  constructor() {
    super('fx', 'Forex');
    this.setupFilters([
      {
        id: 'base',
        label: 'Base',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'usd', label: 'USD' },
          { value: 'cross', label: 'Cross' },
        ],
        default: 'all',
      },
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
    ]);
  }

  protected onFilterChange(): void {
    this.render();
  }

  update(data: FXData[]): void {
    this.data = data;
    this.render();
  }

  private render(): void {
    if (!this.data.length) {
      this.setContent('<div class="panel-error">No data available</div>');
      this.setCount(0);
      return;
    }

    const base = this.getFilter('base');
    let filtered = this.data;
    if (base === 'usd') {
      filtered = filtered.filter((d) => d.pair.includes('USD'));
    } else if (base === 'cross') {
      filtered = filtered.filter((d) => !d.pair.includes('USD'));
    }

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

    const rows = filtered.map((d) => {
      const cls = changeClass(d.changePercent);
      const decimals = d.pair.includes('JPY') ? 2 : 4;
      const rate = d.rate.toFixed(decimals);
      const prevRate = (d.rate - d.change).toFixed(decimals);
      const pips = d.pair.includes('JPY') ? Math.round(d.change * 100) : Math.round(d.change * 10000);
      const tt = `<div class='tt-title'>${escapeHtml(d.pair)}</div><hr class='tt-divider'><div class='tt-row'><span class='tt-label'>Rate</span><span class='tt-value'>${rate}</span></div><div class='tt-row'><span class='tt-label'>Change</span><span class='tt-value ${d.change >= 0 ? 'tt-green' : 'tt-red'}'>${d.change >= 0 ? '+' : ''}${d.change.toFixed(decimals)} (${formatPercent(d.changePercent)})</span></div><div class='tt-row'><span class='tt-label'>Pips</span><span class='tt-value ${pips >= 0 ? 'tt-green' : 'tt-red'}'>${pips >= 0 ? '+' : ''}${pips}</span></div><div class='tt-row'><span class='tt-label'>Prev Close</span><span class='tt-value'>${prevRate}</span></div>`;
      return `<div class="panel-row" data-tooltip="${tt.replace(/"/g, '&quot;')}">
        <span class="symbol">${escapeHtml(d.pair)}</span>
        <span class="price">${rate}</span>
        <span class="change ${cls}">${formatPercent(d.changePercent)}</span>
        ${d.sparkData ? renderSparkline(d.sparkData) : ''}
      </div>`;
    }).join('');

    this.setContent(rows);
    this.setCount(filtered.length);
  }
}
