import { Panel } from './Panel';
import { MacroData } from '@/app/app-context';
import { escapeHtml } from '@/utils/dom';

function formatMacroValue(value: number, unit: string): string {
  switch (unit) {
    case '%':
      return value.toFixed(2) + '%';
    case 'index':
      return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
    case 'K':
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    case '$M':
      if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(2) + 'T';
      if (value >= 1_000) return '$' + (value / 1_000).toFixed(1) + 'B';
      return '$' + value.toFixed(0) + 'M';
    case '$B':
      if (value >= 1_000) return '$' + (value / 1_000).toFixed(2) + 'T';
      return '$' + value.toFixed(1) + 'B';
    case '$T':
      return '$' + value.toFixed(2) + 'T';
    default:
      return value.toLocaleString('en-US');
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  rates: 'Rates & Spreads',
  credit: 'Credit',
  prices: 'Inflation & Prices',
  employment: 'Labor Market',
  output: 'Output & Activity',
  monetary: 'Money & Balance Sheet',
  fx: 'FX & Trade',
};

export class MacroPanel extends Panel {
  private data: MacroData[] = [];

  constructor() {
    super('macro', 'Macro Indicators');
    this.setupFilters([
      {
        id: 'category',
        label: 'Category',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'rates', label: 'Rates' },
          { value: 'credit', label: 'Credit' },
          { value: 'prices', label: 'Prices' },
          { value: 'employment', label: 'Labor' },
          { value: 'output', label: 'Output' },
          { value: 'monetary', label: 'Money' },
          { value: 'fx', label: 'FX' },
        ],
        default: 'all',
      },
    ]);
  }

  protected onFilterChange(): void {
    this.render();
  }

  update(data: MacroData[]): void {
    this.data = data;
    this.render();
  }

  private render(): void {
    if (!this.data.length) {
      this.setContent('<div class="panel-error">No data available</div>');
      this.setCount(0);
      return;
    }

    const category = this.getFilter('category');
    let filtered = this.data;
    if (category !== 'all') {
      filtered = filtered.filter(d => d.category === category);
    }

    if (!filtered.length) {
      this.setContent('<div class="panel-error">No matches</div>');
      this.setCount(0);
      return;
    }

    // Group by category when showing all
    let html = '';
    if (category === 'all') {
      const groups = new Map<string, MacroData[]>();
      for (const d of filtered) {
        const cat = d.category ?? 'other';
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat)!.push(d);
      }
      for (const [cat, items] of groups) {
        const label = CATEGORY_LABELS[cat] ?? cat;
        html += `<div class="news-date-header">${escapeHtml(label)}</div>`;
        html += items.map(d => this.renderRow(d)).join('');
      }
    } else {
      html = filtered.map(d => this.renderRow(d)).join('');
    }

    this.setContent(html);
    this.setCount(filtered.length);
  }

  private renderRow(d: MacroData): string {
    const catLabel = d.category ? (CATEGORY_LABELS[d.category] ?? d.category) : '';
    const tt = `<div class='tt-title'>${escapeHtml(d.name)}</div>${catLabel ? `<div class='tt-muted'>${escapeHtml(catLabel)}</div>` : ''}<hr class='tt-divider'><div class='tt-row'><span class='tt-label'>Value</span><span class='tt-value'>${formatMacroValue(d.value, d.unit)}</span></div><div class='tt-row'><span class='tt-label'>As Of</span><span class='tt-value'>${escapeHtml(d.date)}</span></div><div class='tt-row'><span class='tt-label'>Unit</span><span class='tt-value'>${escapeHtml(d.unit)}</span></div><div class='tt-row'><span class='tt-label'>FRED ID</span><span class='tt-value tt-muted'>${escapeHtml(d.seriesId)}</span></div>`;
    return `<div class="panel-row" data-tooltip="${tt.replace(/"/g, '&quot;')}">
      <span class="name" style="flex:2;color:var(--text-primary)">${escapeHtml(d.name)}</span>
      <span class="price">${formatMacroValue(d.value, d.unit)}</span>
      <span style="min-width:70px;text-align:right;font-size:11px;color:var(--text-secondary)">${escapeHtml(d.date)}</span>
    </div>`;
  }
}
