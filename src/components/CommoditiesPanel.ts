import { Panel } from './Panel';
import { QuoteData } from '@/app/app-context';
import { formatPrice, formatChange, formatPercent, changeClass } from '@/utils/format';
import { renderSparkline } from '@/utils/sparkline';
import { escapeHtml } from '@/utils/dom';

const TYPES: Record<string, string[]> = {
  energy: ['CL=F', 'BZ=F', 'NG=F'],
  metals: ['GC=F', 'SI=F', 'HG=F'],
};

export class CommoditiesPanel extends Panel {
  private data: QuoteData[] = [];

  constructor() {
    super('commodities', 'Commodities');
    this.setupFilters([
      {
        id: 'type',
        label: 'Type',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'energy', label: 'Energy' },
          { value: 'metals', label: 'Metals' },
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

    const type = this.getFilter('type');
    let filtered = this.data;
    if (type === 'energy') {
      filtered = filtered.filter((q) => TYPES.energy.includes(q.symbol));
    } else if (type === 'metals') {
      filtered = filtered.filter((q) => TYPES.metals.includes(q.symbol));
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

    const rows = filtered.map((q) => {
      const cls = changeClass(q.changePercent);
      const isEnergy = TYPES.energy.includes(q.symbol);
      const isMetal = TYPES.metals.includes(q.symbol);
      const category = isEnergy ? 'Energy' : isMetal ? 'Precious/Industrial Metals' : 'Other';
      const unit = isEnergy ? '/bbl' : isMetal && q.symbol === 'GC=F' ? '/oz' : isMetal && q.symbol === 'SI=F' ? '/oz' : isMetal ? '/lb' : '';
      const tt = `<div class='tt-title'>${escapeHtml(q.name)}</div><div class='tt-muted'>${category}</div><hr class='tt-divider'><div class='tt-row'><span class='tt-label'>Price</span><span class='tt-value'>$${formatPrice(q.price)}${unit}</span></div><div class='tt-row'><span class='tt-label'>Change</span><span class='tt-value ${q.change >= 0 ? 'tt-green' : 'tt-red'}'>${formatChange(q.change)} (${formatPercent(q.changePercent)})</span></div>${q.volume ? `<div class='tt-row'><span class='tt-label'>Volume</span><span class='tt-value'>${q.volume.toLocaleString()}</span></div>` : ''}`;
      return `<div class="panel-row" data-tooltip="${tt.replace(/"/g, '&quot;')}">
        <span class="symbol" data-stock-symbol="${escapeHtml(q.symbol)}" style="cursor:pointer">${escapeHtml(q.symbol)}</span>
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
