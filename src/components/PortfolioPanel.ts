import { Panel } from './Panel';
import { h } from '@/utils/dom';
import { formatPrice, formatPercent, formatLargeNumber, changeClass } from '@/utils/format';
import { renderSparkline } from '@/utils/sparkline';
import type { QuoteData } from '@/app/app-context';

export interface PortfolioPosition {
  symbol: string;
  name: string;
  quantity: number;
  currentValue: number;
  avgCost: number;
  gainLoss: number;
  gainPercent: number;
  type: 'EQUITY' | 'CRYPTO';
}

export interface PortfolioData {
  cashBalance: number;
  totalEquity: number;
  positions: PortfolioPosition[];
}

const HIDE_KEY = 'mp-portfolio-hidden';

export class PortfolioPanel extends Panel {
  private data: PortfolioData | null = null;
  private quotes: Map<string, QuoteData> = new Map();
  private hidden: boolean;
  private hideBtn: HTMLButtonElement;

  constructor() {
    super('portfolio', 'Portfolio', 2);
    this.hidden = localStorage.getItem(HIDE_KEY) === 'true';

    // Add hide/show toggle button to header
    this.hideBtn = document.createElement('button');
    this.hideBtn.className = 'portfolio-hide-btn';
    this.hideBtn.title = this.hidden ? 'Show portfolio' : 'Hide portfolio';
    this.hideBtn.textContent = this.hidden ? '\u{1F512}' : '\u{1F441}';
    this.hideBtn.addEventListener('click', () => this.toggleHidden());
    this.header.appendChild(this.hideBtn);

    this.setupFilters([
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        options: [
          { value: 'value', label: 'By Value' },
          { value: 'gain', label: 'By Gain%' },
          { value: 'loss', label: 'By Loss%' },
          { value: 'alpha', label: 'A-Z' },
        ],
        default: 'value',
      },
    ]);
  }

  private toggleHidden(): void {
    this.hidden = !this.hidden;
    localStorage.setItem(HIDE_KEY, String(this.hidden));
    this.hideBtn.textContent = this.hidden ? '\u{1F512}' : '\u{1F441}';
    this.hideBtn.title = this.hidden ? 'Show portfolio' : 'Hide portfolio';
    this.render();
  }

  update(data: PortfolioData): void {
    this.data = data;
    this.render();
  }

  updateQuotes(quotes: QuoteData[]): void {
    for (const q of quotes) {
      this.quotes.set(q.symbol, q);
    }
    this.render();
  }

  protected onFilterChange(): void {
    this.render();
  }

  private render(): void {
    if (!this.data) {
      this.showLoading();
      return;
    }

    if (this.hidden) {
      this.setContent(`
        <div style="display:flex;align-items:center;justify-content:center;height:80px;color:var(--text-muted);font-size:13px;">
          Portfolio hidden — click the lock icon to reveal
        </div>
      `);
      this.setCount(0);
      return;
    }

    const { cashBalance, totalEquity, positions } = this.data;
    const sort = this.getFilter('sort');

    const sorted = [...positions];
    if (sort === 'value') sorted.sort((a, b) => b.currentValue - a.currentValue);
    else if (sort === 'gain') sorted.sort((a, b) => b.gainPercent - a.gainPercent);
    else if (sort === 'loss') sorted.sort((a, b) => a.gainPercent - b.gainPercent);
    else if (sort === 'alpha') sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));

    const totalGain = positions.reduce((s, p) => s + p.gainLoss, 0);
    const totalGainPct = totalEquity > 0 ? (totalGain / (totalEquity - totalGain)) * 100 : 0;
    const gainCls = changeClass(totalGain);

    const rows = sorted.map(p => {
      const cls = changeClass(p.gainPercent);
      const q = this.quotes.get(p.symbol);
      const spark = q?.sparkData?.length ? renderSparkline(q.sparkData, 60, 20) : '';
      const price = q ? q.price : (p.quantity > 0 ? p.currentValue / p.quantity : 0);
      const dayChg = q ? formatPercent(q.changePercent) : '--';
      const dayCls = q ? changeClass(q.changePercent) : 'neutral';

      return `<tr data-tooltip="<div class='tt-title'>${p.symbol} — ${p.name}</div><div class='tt-divider'></div><div class='tt-row'><span class='tt-label'>Shares</span><span class='tt-value'>${p.quantity.toFixed(5)}</span></div><div class='tt-row'><span class='tt-label'>Avg Cost</span><span class='tt-value'>$${formatPrice(p.avgCost)}</span></div><div class='tt-row'><span class='tt-label'>Current Value</span><span class='tt-value'>$${formatPrice(p.currentValue)}</span></div><div class='tt-row'><span class='tt-label'>Gain/Loss</span><span class='tt-value ${cls}'>${p.gainLoss >= 0 ? '+' : ''}$${formatPrice(p.gainLoss)} (${formatPercent(p.gainPercent)})</span></div><div class='tt-row'><span class='tt-label'>Type</span><span class='tt-value'>${p.type}</span></div>">
        <td class="sym">${p.symbol}</td>
        <td class="price">$${formatPrice(price)}</td>
        <td style="text-align:right">$${formatPrice(p.currentValue)}</td>
        <td class="${cls}" style="text-align:right">${formatPercent(p.gainPercent)}</td>
        <td class="${dayCls}" style="text-align:right;font-size:11px">${dayChg}</td>
        <td class="spark">${spark}</td>
      </tr>`;
    }).join('');

    this.setContent(`
      <div style="display:flex;gap:16px;margin-bottom:10px;padding:0 4px;align-items:baseline;">
        <div>
          <span style="font-size:11px;color:var(--text-secondary);">Total Equity</span>
          <div style="font-size:18px;font-weight:700;color:var(--text-primary);font-family:var(--font-mono);">$${formatLargeNumber(totalEquity)}</div>
        </div>
        <div>
          <span style="font-size:11px;color:var(--text-secondary);">Total P&L</span>
          <div class="${gainCls}" style="font-size:15px;font-weight:600;font-family:var(--font-mono);">${totalGain >= 0 ? '+' : ''}$${formatPrice(totalGain)} (${formatPercent(totalGainPct)})</div>
        </div>
        <div>
          <span style="font-size:11px;color:var(--text-secondary);">Cash</span>
          <div style="font-size:13px;color:var(--text-primary);font-family:var(--font-mono);">$${formatPrice(cashBalance)}</div>
        </div>
      </div>
      <table class="data-table">
        <thead><tr><th>Sym</th><th>Price</th><th style="text-align:right">Value</th><th style="text-align:right">P&L%</th><th style="text-align:right">Day</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `);
    this.setCount(positions.length);
  }
}
