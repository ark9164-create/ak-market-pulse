import { Panel } from './Panel';
import { formatLargeNumber, formatPercent, changeClass } from '@/utils/format';
import type { FundamentalsData } from '@/app/app-context';

// Top stocks for fundamentals tracking
export const FUNDAMENTALS_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
  'JPM', 'V', 'UNH', 'JNJ', 'WMT', 'PG', 'XOM',
];

export class FundamentalsPanel extends Panel {
  private data: FundamentalsData[] = [];

  constructor() {
    super('fundamentals', 'Fundamentals', 2);
    this.setupFilters([
      {
        id: 'period',
        label: 'Period',
        type: 'select',
        options: [
          { value: 'annual', label: 'Annual' },
          { value: 'quarterly', label: 'Quarterly' },
        ],
        default: 'annual',
      },
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        options: [
          { value: 'default', label: 'Default' },
          { value: 'revenue', label: 'Revenue' },
          { value: 'margin', label: 'Margin' },
          { value: 'eps', label: 'EPS' },
        ],
        default: 'default',
      },
    ]);
  }

  update(data: FundamentalsData[]): void {
    this.data = data;
    this.render();
  }

  getPeriod(): 'annual' | 'quarterly' {
    return this.getFilter('period') as 'annual' | 'quarterly';
  }

  protected onFilterChange(): void {
    this.render();
    // Dispatch event so data-loader can refetch with new period
    document.dispatchEvent(new CustomEvent('fundamentals-period-change', {
      detail: { period: this.getPeriod() },
    }));
  }

  private render(): void {
    if (!this.data.length) {
      this.showLoading();
      return;
    }

    let sorted = [...this.data];
    const sortMode = this.getFilter('sort');
    if (sortMode === 'revenue') sorted.sort((a, b) => b.revenue - a.revenue);
    else if (sortMode === 'margin') sorted.sort((a, b) => b.operatingMargin - a.operatingMargin);
    else if (sortMode === 'eps') sorted.sort((a, b) => b.eps - a.eps);

    const rows = sorted.map(d => {
      const marginCls = d.operatingMargin >= 20 ? 'positive' : d.operatingMargin >= 10 ? 'neutral' : 'negative';
      const fcfCls = changeClass(d.freeCashFlow);
      return `<tr data-tooltip="<div class='tt-title'>${d.ticker}</div><div class='tt-divider'></div><div class='tt-row'><span class='tt-label'>Report Period</span><span class='tt-value'>${d.reportPeriod}</span></div><div class='tt-row'><span class='tt-label'>Total Assets</span><span class='tt-value'>$${formatLargeNumber(d.totalAssets)}</span></div><div class='tt-row'><span class='tt-label'>Total Debt</span><span class='tt-value'>$${formatLargeNumber(d.totalDebt)}</span></div>${d.peRatio != null ? `<div class='tt-row'><span class='tt-label'>P/E Ratio</span><span class='tt-value'>${d.peRatio.toFixed(1)}x</span></div>` : ''}">
        <td class="sym" data-stock-symbol="${d.ticker}" style="cursor:pointer">${d.ticker}</td>
        <td class="num">$${formatLargeNumber(d.revenue)}</td>
        <td class="num">$${formatLargeNumber(d.netIncome)}</td>
        <td class="num">$${d.eps.toFixed(2)}</td>
        <td class="${marginCls}">${formatPercent(d.operatingMargin, 1)}</td>
        <td class="num ${fcfCls}">$${formatLargeNumber(d.freeCashFlow)}</td>
      </tr>`;
    }).join('');

    this.setContent(`
      <table class="data-table">
        <thead><tr><th>Sym</th><th>Revenue</th><th>Net Inc</th><th>EPS</th><th>Op Margin</th><th>FCF</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
    this.setCount(sorted.length);
  }
}
