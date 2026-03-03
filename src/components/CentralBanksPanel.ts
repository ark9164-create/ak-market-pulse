import { Panel } from './Panel';
import { CentralBankData } from '@/app/app-context';
import { escapeHtml } from '@/utils/dom';

const G7_CODES = new Set(['Fed', 'ECB', 'BoJ', 'BoE', 'BoC']);

function directionIndicator(dir: 'up' | 'down' | 'hold'): string {
  switch (dir) {
    case 'up':
      return '<span style="color:var(--green);font-weight:700;font-size:14px">&uarr;</span>';
    case 'down':
      return '<span style="color:var(--red);font-weight:700;font-size:14px">&darr;</span>';
    case 'hold':
    default:
      return '<span style="color:var(--text-secondary);font-weight:700;font-size:14px">&ndash;</span>';
  }
}

export class CentralBanksPanel extends Panel {
  private rawData: CentralBankData[] = [];

  constructor() {
    super('centralBanks', 'Central Banks');
    this.setupFilters([
      {
        id: 'direction',
        label: 'Direction',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'hiking', label: 'Hiking' },
          { value: 'cutting', label: 'Cutting' },
          { value: 'hold', label: 'Hold' },
        ],
        default: 'all',
      },
      {
        id: 'region',
        label: 'Region',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'g7', label: 'G7' },
          { value: 'em', label: 'EM' },
        ],
        default: 'all',
      },
    ]);
  }

  protected onFilterChange(): void {
    this.render();
  }

  update(data: CentralBankData[]): void {
    this.rawData = data;
    this.render();
  }

  private render(): void {
    if (!this.rawData.length) {
      this.setContent('<div class="panel-error">No data available</div>');
      this.setCount(0);
      return;
    }

    const dirFilter = this.getFilter('direction');
    const regionFilter = this.getFilter('region');

    let filtered = this.rawData;

    if (dirFilter === 'hiking') {
      filtered = filtered.filter(d => d.direction === 'up');
    } else if (dirFilter === 'cutting') {
      filtered = filtered.filter(d => d.direction === 'down');
    } else if (dirFilter === 'hold') {
      filtered = filtered.filter(d => d.direction === 'hold');
    }

    if (regionFilter === 'g7') {
      filtered = filtered.filter(d => G7_CODES.has(d.code));
    } else if (regionFilter === 'em') {
      filtered = filtered.filter(d => !G7_CODES.has(d.code) && d.code !== 'SNB');
    }

    if (!filtered.length) {
      this.setContent('<div class="panel-error">No matches</div>');
      this.setCount(0);
      return;
    }

    const rows = filtered.map((d) => {
      const dirLabel = d.direction === 'up' ? 'Hiking' : d.direction === 'down' ? 'Cutting' : 'On Hold';
      const tt = `<div class='tt-title'>${escapeHtml(d.name)}</div><div class='tt-muted'>${escapeHtml(d.code)} &middot; ${dirLabel}</div><hr class='tt-divider'><div class='tt-row'><span class='tt-label'>Policy Rate</span><span class='tt-value'>${d.rate.toFixed(2)}%</span></div><div class='tt-row'><span class='tt-label'>Last Change</span><span class='tt-value'>${escapeHtml(d.lastChange)}</span></div><div class='tt-row'><span class='tt-label'>Bias</span><span class='tt-value ${d.direction === 'up' ? 'tt-green' : d.direction === 'down' ? 'tt-red' : ''}'>${dirLabel}</span></div>`;
      return `<div class="panel-row" style="gap:8px" data-tooltip="${tt.replace(/"/g, '&quot;')}">
        <span class="symbol" style="min-width:40px">${escapeHtml(d.code)}</span>
        <span class="name" style="flex:1">${escapeHtml(d.name)}</span>
        <span class="price">${d.rate.toFixed(2)}%</span>
        <span style="min-width:70px;font-size:11px;color:var(--text-secondary);text-align:right">${escapeHtml(d.lastChange)}</span>
        ${directionIndicator(d.direction)}
      </div>`;
    }).join('');

    this.setContent(rows);
    this.setCount(filtered.length);
  }
}
