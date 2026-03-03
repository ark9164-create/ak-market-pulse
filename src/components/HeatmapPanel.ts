import { Panel } from './Panel';
import { QuoteData } from '@/app/app-context';
import { formatPrice, formatChange, formatPercent } from '@/utils/format';
import { escapeHtml } from '@/utils/dom';

function heatColor(pct: number): string {
  if (pct <= -3) return '#b71c1c';
  if (pct <= -1) return '#e53935';
  if (pct < -0.25) return '#ef5350';
  if (pct <= 0.25) return '#546e7a';
  if (pct < 1) return '#66bb6a';
  if (pct < 3) return '#43a047';
  return '#1b5e20';
}

export class HeatmapPanel extends Panel {
  private data: QuoteData[] = [];

  constructor() {
    super('heatmap', 'Sector Heatmap', 2);
    this.setupFilters([
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        options: [
          { value: 'change', label: 'By Change' },
          { value: 'alpha', label: 'Alphabetical' },
        ],
        default: 'change',
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
    const sortMode = this.getFilter('sort');
    if (sortMode === 'alpha') {
      sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
    } else {
      sorted.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    }

    const SECTOR_NAMES: Record<string, string> = {
      XLK: 'Technology', XLF: 'Financials', XLE: 'Energy', XLV: 'Healthcare',
      XLY: 'Consumer Disc.', XLP: 'Consumer Staples', XLI: 'Industrials',
      XLB: 'Materials', XLRE: 'Real Estate', XLU: 'Utilities', XLC: 'Communication',
    };
    const cells = sorted.map((q) => {
      const bg = heatColor(q.changePercent);
      const sectorName = SECTOR_NAMES[q.symbol] ?? q.name;
      const tt = `<div class='tt-title'>${escapeHtml(sectorName)}</div><div class='tt-muted'>${escapeHtml(q.symbol)} &middot; Sector ETF</div><hr class='tt-divider'><div class='tt-row'><span class='tt-label'>Price</span><span class='tt-value'>$${formatPrice(q.price)}</span></div><div class='tt-row'><span class='tt-label'>Change</span><span class='tt-value ${q.change >= 0 ? 'tt-green' : 'tt-red'}'>${formatChange(q.change)} (${formatPercent(q.changePercent)})</span></div>${q.volume ? `<div class='tt-row'><span class='tt-label'>Volume</span><span class='tt-value'>${q.volume.toLocaleString()}</span></div>` : ''}`;
      return `<div style="background:${bg};border-radius:4px;padding:8px 4px;text-align:center;color:#fff;font-size:12px;line-height:1.3" data-tooltip="${tt.replace(/"/g, '&quot;')}">
        <div style="font-weight:600">${escapeHtml(q.symbol)}</div>
        <div>${formatPercent(q.changePercent)}</div>
      </div>`;
    }).join('');

    const html = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:4px">${cells}</div>`;
    this.setContent(html);
    this.setCount(sorted.length);
  }
}
