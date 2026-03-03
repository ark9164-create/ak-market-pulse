import { Panel } from './Panel';
import { IPOData } from '@/app/app-context';
import { escapeHtml } from '@/utils/dom';
import { formatLargeNumber } from '@/utils/format';

function statusBadge(status: string): string {
  const s = status.toLowerCase();
  let bg: string;
  if (s === 'priced' || s === 'listed') bg = 'var(--green)';
  else if (s === 'withdrawn' || s === 'postponed') bg = 'var(--red)';
  else if (s === 'filed') bg = 'var(--gold)';
  else bg = 'var(--accent)';
  return `<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:${bg};color:#fff;white-space:nowrap;text-transform:uppercase;letter-spacing:0.5px">${escapeHtml(status)}</span>`;
}

export class IPOPanel extends Panel {
  private rawData: IPOData[] = [];

  constructor() {
    super('ipo', 'IPO Calendar');
    this.setupFilters([
      {
        id: 'timeRange',
        label: 'Time',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'week', label: 'This Week' },
          { value: 'next30', label: 'Next 30D' },
          { value: 'next90', label: 'Next 90D' },
          { value: 'past', label: 'Past' },
        ],
        default: 'all',
      },
      {
        id: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'expected', label: 'Expected' },
          { value: 'priced', label: 'Priced' },
          { value: 'filed', label: 'Filed' },
          { value: 'withdrawn', label: 'Withdrawn' },
        ],
        default: 'all',
      },
    ]);
  }

  protected onFilterChange(): void {
    this.render();
  }

  update(data: IPOData[]): void {
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
    let filtered = this.rawData;

    if (timeRange !== 'all') {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      if (timeRange === 'week') {
        const sw = startOfWeek.toISOString().slice(0, 10);
        const ew = endOfWeek.toISOString().slice(0, 10);
        filtered = filtered.filter(d => d.date >= sw && d.date <= ew);
      } else if (timeRange === 'next30') {
        const future = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
        filtered = filtered.filter(d => d.date >= todayStr && d.date <= future);
      } else if (timeRange === 'next90') {
        const future = new Date(now.getTime() + 90 * 86400000).toISOString().slice(0, 10);
        filtered = filtered.filter(d => d.date >= todayStr && d.date <= future);
      } else if (timeRange === 'past') {
        filtered = filtered.filter(d => d.date < todayStr);
      }
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status.toLowerCase() === statusFilter);
    }

    // Sort by date descending (most recent first)
    filtered = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

    if (!filtered.length) {
      this.setContent('<div class="panel-error">No matches</div>');
      this.setCount(0);
      return;
    }

    const rows = filtered.map((d) => {
      const sym = d.symbol ? `<span class="symbol">${escapeHtml(d.symbol)}</span>` : '';
      const exch = d.exchange ? `<span style="font-size:10px;color:var(--text-muted)">${escapeHtml(d.exchange)}</span>` : '';
      const price = d.price ? `<span style="font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)">$${escapeHtml(d.price)}</span>` : '';
      const val = d.totalValue ? `<span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted)">${formatLargeNumber(d.totalValue)}</span>` : '';

      const tt = `<div class='tt-title'>${escapeHtml(d.name)}</div>${d.symbol ? `<div class='tt-muted'>Ticker: ${escapeHtml(d.symbol)}</div>` : ''}<hr class='tt-divider'><div class='tt-row'><span class='tt-label'>Date</span><span class='tt-value'>${escapeHtml(d.date)}</span></div><div class='tt-row'><span class='tt-label'>Status</span><span class='tt-value'>${escapeHtml(d.status)}</span></div>${d.exchange ? `<div class='tt-row'><span class='tt-label'>Exchange</span><span class='tt-value'>${escapeHtml(d.exchange)}</span></div>` : ''}${d.price ? `<div class='tt-row'><span class='tt-label'>Price Range</span><span class='tt-value'>$${escapeHtml(d.price)}</span></div>` : ''}${d.shares ? `<div class='tt-row'><span class='tt-label'>Shares</span><span class='tt-value'>${d.shares.toLocaleString()}</span></div>` : ''}${d.totalValue ? `<div class='tt-row'><span class='tt-label'>Deal Value</span><span class='tt-value'>$${formatLargeNumber(d.totalValue)}</span></div>` : ''}`;
      return `<div class="panel-row" style="gap:6px;flex-wrap:wrap" data-tooltip="${tt.replace(/"/g, '&quot;')}">
        <span style="min-width:58px;font-size:11px;color:var(--text-secondary)">${escapeHtml(d.date)}</span>
        ${statusBadge(d.status)}
        <span class="name" style="flex:1;color:var(--text-primary);min-width:100px">${escapeHtml(d.name)}</span>
        ${sym}
        ${price}
        ${val}
        ${exch}
      </div>`;
    }).join('');

    this.setContent(rows);
    this.setCount(filtered.length);
  }
}
