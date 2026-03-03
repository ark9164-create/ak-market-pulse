import { Panel } from './Panel';
import { EarningsData } from '@/app/app-context';
import { escapeHtml } from '@/utils/dom';

function formatEps(val: number | null): string {
  if (val === null) return '-';
  return val >= 0 ? `$${val.toFixed(2)}` : `-$${Math.abs(val).toFixed(2)}`;
}

export class EarningsPanel extends Panel {
  private rawData: EarningsData[] = [];

  constructor() {
    super('earnings', 'Earnings Calendar');
    this.setupFilters([
      {
        id: 'timeRange',
        label: 'Time',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'This Week' },
          { value: 'next7', label: 'Next 7D' },
          { value: 'next30', label: 'Next 30D' },
          { value: 'past7', label: 'Past 7D' },
        ],
        default: 'all',
      },
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'reported', label: 'Reported' },
        ],
        default: 'all',
      },
      {
        id: 'surprise',
        label: 'Surprise',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'beat', label: 'Beat' },
          { value: 'miss', label: 'Miss' },
        ],
        default: 'all',
      },
    ]);
  }

  protected onFilterChange(): void {
    this.render();
  }

  update(data: EarningsData[]): void {
    this.rawData = data;
    this.render();
  }

  private render(): void {
    if (!this.rawData.length) {
      this.setContent('<div class="panel-error">No data available</div>');
      this.setCount(0);
      return;
    }

    const timeRange = this.getFilter('timeRange');
    const statusFilter = this.getFilter('status');
    const surpriseFilter = this.getFilter('surprise');

    let filtered = this.rawData;

    if (timeRange !== 'all') {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      if (timeRange === 'today') {
        filtered = filtered.filter(d => d.date === todayStr);
      } else if (timeRange === 'week') {
        const sw = startOfWeek.toISOString().slice(0, 10);
        const ew = endOfWeek.toISOString().slice(0, 10);
        filtered = filtered.filter(d => d.date >= sw && d.date <= ew);
      } else if (timeRange === 'next7') {
        const future = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
        filtered = filtered.filter(d => d.date >= todayStr && d.date <= future);
      } else if (timeRange === 'next30') {
        const future = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
        filtered = filtered.filter(d => d.date >= todayStr && d.date <= future);
      } else if (timeRange === 'past7') {
        const past = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
        filtered = filtered.filter(d => d.date >= past && d.date <= todayStr);
      }
    }

    if (statusFilter === 'upcoming') {
      filtered = filtered.filter(d => d.epsActual === null);
    } else if (statusFilter === 'reported') {
      filtered = filtered.filter(d => d.epsActual !== null);
    }

    if (surpriseFilter === 'beat') {
      filtered = filtered.filter(d => d.surprise !== null && d.surprise > 0);
    } else if (surpriseFilter === 'miss') {
      filtered = filtered.filter(d => d.surprise !== null && d.surprise < 0);
    }

    if (!filtered.length) {
      this.setContent('<div class="panel-error">No matches</div>');
      this.setCount(0);
      return;
    }

    const rows = filtered.map((d) => {
      let surpriseCls = 'neutral';
      let surpriseText = '-';
      if (d.surprise !== null) {
        surpriseCls = d.surprise > 0 ? 'positive' : d.surprise < 0 ? 'negative' : 'neutral';
        const sign = d.surprise >= 0 ? '+' : '';
        surpriseText = `${sign}${d.surprise.toFixed(1)}%`;
      }

      const actualCls = d.epsActual !== null && d.epsEstimate !== null
        ? (d.epsActual >= d.epsEstimate ? 'positive' : 'negative')
        : 'neutral';

      const revEst = d.revenueEstimate !== null ? `$${(d.revenueEstimate / 1e9).toFixed(2)}B` : '-';
      const revAct = d.revenueActual !== null ? `$${(d.revenueActual / 1e9).toFixed(2)}B` : '-';
      const status = d.epsActual !== null ? 'Reported' : 'Upcoming';
      const tt = `<div class='tt-title'>${escapeHtml(d.symbol)} Earnings</div><div class='tt-muted'>${escapeHtml(d.date)} &middot; ${status}</div><hr class='tt-divider'><div class='tt-row'><span class='tt-label'>EPS Est</span><span class='tt-value'>${formatEps(d.epsEstimate)}</span></div><div class='tt-row'><span class='tt-label'>EPS Act</span><span class='tt-value ${d.epsActual !== null && d.epsEstimate !== null ? (d.epsActual >= d.epsEstimate ? 'tt-green' : 'tt-red') : ''}'>${formatEps(d.epsActual)}</span></div>${d.surprise !== null ? `<div class='tt-row'><span class='tt-label'>Surprise</span><span class='tt-value ${d.surprise >= 0 ? 'tt-green' : 'tt-red'}'>${surpriseText}</span></div>` : ''}<hr class='tt-divider'><div class='tt-row'><span class='tt-label'>Rev Est</span><span class='tt-value'>${revEst}</span></div><div class='tt-row'><span class='tt-label'>Rev Act</span><span class='tt-value'>${revAct}</span></div>`;
      return `<div class="panel-row" style="flex-wrap:wrap;gap:4px" data-tooltip="${tt.replace(/"/g, '&quot;')}">
        <span style="min-width:60px;font-size:11px;color:var(--text-secondary)">${escapeHtml(d.date)}</span>
        <span class="symbol">${escapeHtml(d.symbol)}</span>
        <span style="font-size:12px">
          <span style="color:var(--text-secondary)">Est</span> ${formatEps(d.epsEstimate)}
        </span>
        <span style="font-size:12px" class="${actualCls}">
          <span style="color:var(--text-secondary)">Act</span> ${formatEps(d.epsActual)}
        </span>
        <span class="change ${surpriseCls}">${surpriseText}</span>
      </div>`;
    }).join('');

    this.setContent(rows);
    this.setCount(filtered.length);
  }
}
