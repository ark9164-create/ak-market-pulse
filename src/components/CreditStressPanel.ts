import { Panel } from './Panel';
import { CREDIT_STRESS_SYMBOLS } from '@/config/markets';
import { formatPrice, formatPercent, changeClass } from '@/utils/format';
import { renderSparkline } from '@/utils/sparkline';
import type { QuoteData } from '@/app/app-context';

export class CreditStressPanel extends Panel {
  private data: QuoteData[] = [];

  constructor() {
    super('creditStress', 'Credit Stress Monitor', 2);
    this.setupFilters([
      {
        id: 'view',
        label: 'View',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'bdc', label: 'BDCs' },
          { value: 'etf', label: 'Credit ETFs' },
          { value: 'mgr', label: 'Alt Managers' },
        ],
        default: 'all',
      },
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        options: [
          { value: 'default', label: 'Default' },
          { value: 'gainers', label: 'Gainers' },
          { value: 'losers', label: 'Losers' },
          { value: 'alpha', label: 'A-Z' },
        ],
        default: 'default',
      },
    ]);
  }

  update(data: QuoteData[]): void {
    this.data = data;
    this.render();
  }

  protected onFilterChange(): void {
    this.render();
  }

  private render(): void {
    const view = this.getFilter('view');
    const bdcSyms = ['ARCC', 'MAIN', 'BXSL', 'FSK', 'PSEC'];
    const etfSyms = ['HYG', 'JNK', 'BKLN', 'SRLN'];
    const mgrSyms = ['BX', 'KKR', 'APO', 'ARES', 'OWL'];

    let filtered = this.data;
    if (view === 'bdc') filtered = this.data.filter(d => bdcSyms.includes(d.symbol));
    else if (view === 'etf') filtered = this.data.filter(d => etfSyms.includes(d.symbol));
    else if (view === 'mgr') filtered = this.data.filter(d => mgrSyms.includes(d.symbol));

    if (!filtered.length) {
      this.showLoading();
      return;
    }

    // Sort
    const sortMode = this.getFilter('sort');
    if (sortMode === 'gainers') filtered.sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
    else if (sortMode === 'losers') filtered.sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0));
    else if (sortMode === 'alpha') filtered.sort((a, b) => a.symbol.localeCompare(b.symbol));

    // Calculate aggregate stress signal
    const avgChange = filtered.reduce((s, d) => s + (d.changePercent || 0), 0) / filtered.length;
    const declining = filtered.filter(d => (d.changePercent || 0) < 0).length;
    const stressLevel = declining / filtered.length;
    const stressLabel = stressLevel > 0.7 ? 'HIGH STRESS' : stressLevel > 0.4 ? 'ELEVATED' : 'STABLE';
    const stressColor = stressLevel > 0.7 ? 'var(--red)' : stressLevel > 0.4 ? 'var(--yellow, #f59e0b)' : 'var(--green)';

    const configMap = new Map(CREDIT_STRESS_SYMBOLS.map(s => [s.symbol, s]));

    const rows = filtered.map(d => {
      const cfg = configMap.get(d.symbol);
      const chg = d.changePercent || 0;
      const cls = changeClass(chg);
      const spark = d.sparkData?.length ? renderSparkline(d.sparkData, 60, 20) : '';
      const thesis = cfg?.thesis || '';
      return `<tr data-tooltip="<div class='tt-title'>${d.symbol} — ${d.name || cfg?.name || ''}</div><div class='tt-divider'></div><div class='tt-row'><span class='tt-label'>Thesis</span></div><div class='tt-row tt-muted'>${thesis}</div><div class='tt-row'><span class='tt-label'>Price</span><span class='tt-value'>$${formatPrice(d.price)}</span></div><div class='tt-row'><span class='tt-label'>Change</span><span class='tt-value ${cls}'>${formatPercent(chg)}</span></div>">
        <td class="sym">${d.symbol}</td>
        <td class="name">${cfg?.name || d.name || ''}</td>
        <td class="price">$${formatPrice(d.price)}</td>
        <td class="${cls}">${formatPercent(chg)}</td>
        <td class="spark">${spark}</td>
      </tr>`;
    }).join('');

    this.setContent(`
      <div class="stress-header" style="display:flex;align-items:center;gap:12px;margin-bottom:8px;padding:0 4px;">
        <span class="stress-badge" style="background:${stressColor};color:#000;font-weight:700;font-size:11px;padding:2px 8px;border-radius:4px;">${stressLabel}</span>
        <span style="font-size:12px;color:var(--text-secondary);">${declining}/${filtered.length} declining · Avg ${formatPercent(avgChange)}</span>
      </div>
      <table class="data-table">
        <thead><tr><th>Sym</th><th>Name</th><th>Price</th><th>Chg%</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
    this.setCount(filtered.length);
  }
}
