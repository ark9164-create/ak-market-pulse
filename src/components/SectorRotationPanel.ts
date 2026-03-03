import { Panel } from './Panel';
import { QuoteData } from '@/app/app-context';
import { formatPercent, changeClass } from '@/utils/format';
import { escapeHtml } from '@/utils/dom';

const SECTOR_NAMES: Record<string, string> = {
  XLK: 'Technology',
  XLF: 'Financials',
  XLV: 'Health Care',
  XLY: 'Cons. Discretionary',
  XLP: 'Cons. Staples',
  XLE: 'Energy',
  XLI: 'Industrials',
  XLB: 'Materials',
  XLRE: 'Real Estate',
  XLU: 'Utilities',
  XLC: 'Communication Svcs',
};

export class SectorRotationPanel extends Panel {
  private data: QuoteData[] = [];

  constructor() {
    super('sectorRotation', 'Sector Rotation', 2);
    this.setupFilters([
      {
        id: 'timeframe',
        label: 'Timeframe',
        type: 'select',
        options: [{ value: '1d', label: '1D' }],
        default: '1d',
      },
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        options: [
          { value: 'best', label: 'Best' },
          { value: 'worst', label: 'Worst' },
          { value: 'alpha', label: 'Alpha' },
        ],
        default: 'best',
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
    if (sortMode === 'best') {
      sorted.sort((a, b) => b.changePercent - a.changePercent);
    } else if (sortMode === 'worst') {
      sorted.sort((a, b) => a.changePercent - b.changePercent);
    } else {
      sorted.sort((a, b) => {
        const nameA = SECTOR_NAMES[a.symbol] ?? a.symbol;
        const nameB = SECTOR_NAMES[b.symbol] ?? b.symbol;
        return nameA.localeCompare(nameB);
      });
    }

    const maxAbs = Math.max(...sorted.map(q => Math.abs(q.changePercent)), 0.01);

    const rows = sorted.map(q => {
      const sectorName = SECTOR_NAMES[q.symbol] ?? escapeHtml(q.name || q.symbol);
      const pct = q.changePercent;
      const cls = changeClass(pct);
      const barColor = pct >= 0 ? 'var(--green)' : 'var(--red)';
      const barWidthPct = (Math.abs(pct) / maxAbs) * 45; // max 45% of SVG width per side

      // Center line at 50%, bars extend left (negative) or right (positive)
      const barX = pct >= 0 ? 50 : 50 - barWidthPct;

      return `<div class="panel-row" style="display:flex;align-items:center;gap:8px;padding:3px 0">
        <span style="flex:0 0 130px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(sectorName)}</span>
        <svg style="flex:1;height:20px" viewBox="0 0 100 20" preserveAspectRatio="none">
          <line x1="50" y1="0" x2="50" y2="20" stroke="var(--text-muted)" stroke-width="0.3" stroke-dasharray="2,2" />
          <rect x="${barX.toFixed(1)}" y="4" width="${barWidthPct.toFixed(1)}" height="12" rx="2" fill="${barColor}" opacity="0.85" />
        </svg>
        <span class="change ${cls}" style="flex:0 0 60px;text-align:right;font-size:12px">${formatPercent(pct)}</span>
      </div>`;
    }).join('');

    this.setContent(rows);
    this.setCount(sorted.length);
  }
}
