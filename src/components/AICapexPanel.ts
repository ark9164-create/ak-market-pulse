import { Panel } from './Panel';
import { AI_CAPEX_SYMBOLS } from '@/config/markets';
import { formatPrice, formatPercent, changeClass } from '@/utils/format';
import { renderSparkline } from '@/utils/sparkline';
import type { QuoteData } from '@/app/app-context';

type Camp = 'spender' | 'pick-shovel' | 'winner';

const CAMP_LABELS: Record<Camp, string> = {
  'spender': 'Hyperscaler Spenders',
  'pick-shovel': 'Pick & Shovel',
  'winner': 'Claude Prevails',
};

const CAMP_COLORS: Record<Camp, string> = {
  'spender': 'var(--red)',
  'pick-shovel': 'var(--yellow, #f59e0b)',
  'winner': 'var(--green)',
};

export class AICapexPanel extends Panel {
  private data: QuoteData[] = [];

  constructor() {
    super('aiCapex', 'AI Capex & Claude Thesis', 2);
    this.setupFilters([
      {
        id: 'camp',
        label: 'Camp',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'spender', label: 'Spenders' },
          { value: 'pick-shovel', label: 'Pick & Shovel' },
          { value: 'winner', label: 'Winners' },
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
    const campFilter = this.getFilter('camp');

    // Deduplicate symbols (AMZN/GOOGL appear in multiple camps)
    const seen = new Set<string>();
    const uniqueConfig = AI_CAPEX_SYMBOLS.filter(s => {
      if (campFilter !== 'all' && s.camp !== campFilter) return false;
      if (seen.has(s.symbol + s.camp)) return false;
      seen.add(s.symbol + s.camp);
      return true;
    });

    if (!this.data.length) {
      this.showLoading();
      return;
    }

    const quoteMap = new Map(this.data.map(d => [d.symbol, d]));

    // Group by camp
    const camps: Camp[] = campFilter === 'all'
      ? ['spender', 'pick-shovel', 'winner']
      : [campFilter as Camp];

    const sortMode = this.getFilter('sort');

    const sections = camps.map(camp => {
      let items = uniqueConfig.filter(s => s.camp === camp);
      if (!items.length) return '';

      // Sort within camp
      if (sortMode !== 'default') {
        items = [...items].sort((a, b) => {
          const qa = quoteMap.get(a.symbol);
          const qb = quoteMap.get(b.symbol);
          if (sortMode === 'gainers') return ((qb?.changePercent || 0) - (qa?.changePercent || 0));
          if (sortMode === 'losers') return ((qa?.changePercent || 0) - (qb?.changePercent || 0));
          if (sortMode === 'alpha') return a.symbol.localeCompare(b.symbol);
          return 0;
        });
      }

      const campQuotes = items.map(s => quoteMap.get(s.symbol)).filter(Boolean) as QuoteData[];
      const avgChg = campQuotes.length
        ? campQuotes.reduce((s, d) => s + (d.changePercent || 0), 0) / campQuotes.length
        : 0;

      const rows = items.map(s => {
        const d = quoteMap.get(s.symbol);
        if (!d) return '';
        const chg = d.changePercent || 0;
        const cls = changeClass(chg);
        const spark = d.sparkData?.length ? renderSparkline(d.sparkData, 60, 20) : '';
        return `<tr data-tooltip="<div class='tt-title'>${s.symbol} — ${s.name}</div><div class='tt-divider'></div><div class='tt-row tt-muted'>${s.thesis}</div><div class='tt-row'><span class='tt-label'>Price</span><span class='tt-value'>$${formatPrice(d.price)}</span></div><div class='tt-row'><span class='tt-label'>Change</span><span class='tt-value ${cls}'>${formatPercent(chg)}</span></div><div class='tt-row'><span class='tt-label'>Camp</span><span class='tt-value' style='color:${CAMP_COLORS[camp]}'>${CAMP_LABELS[camp]}</span></div>">
          <td class="sym">${s.symbol}</td>
          <td class="name">${s.name}</td>
          <td class="price">$${formatPrice(d.price)}</td>
          <td class="${cls}">${formatPercent(chg)}</td>
          <td class="spark">${spark}</td>
        </tr>`;
      }).join('');

      return `
        <div class="camp-section" style="margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;padding:0 4px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${CAMP_COLORS[camp]};"></span>
            <span style="font-size:12px;font-weight:600;color:var(--text-primary);">${CAMP_LABELS[camp]}</span>
            <span style="font-size:11px;color:var(--text-secondary);margin-left:auto;">Avg ${formatPercent(avgChg)}</span>
          </div>
          <table class="data-table">
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }).join('');

    this.setContent(sections);
    this.setCount(uniqueConfig.length);
  }
}
