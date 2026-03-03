import { Panel } from './Panel';
import { QuoteData } from '@/app/app-context';
import { formatPrice, formatPercent, changeClass } from '@/utils/format';
import { renderSparkline } from '@/utils/sparkline';
import { escapeHtml } from '@/utils/dom';

const STORAGE_KEY = 'mp-watchlist';
const DEFAULT_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM',
  'V', 'UNH', 'GLD', 'SPY', 'QQQ',
];

export class WatchlistPanel extends Panel {
  private symbols: string[];
  private quotes: Map<string, QuoteData> = new Map();

  constructor() {
    super('watchlist', 'Watchlist');
    this.symbols = this.loadSymbols();
    this.setupFilters([
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        options: [
          { value: 'default', label: 'Default' },
          { value: 'gainers', label: 'Gainers' },
          { value: 'losers', label: 'Losers' },
          { value: 'alpha', label: 'A-Z' },
          { value: 'price', label: 'Price' },
        ],
        default: 'default',
      },
    ]);
    this.render();
  }

  protected onFilterChange(): void {
    this.render();
  }

  getSymbols(): string[] {
    return [...this.symbols];
  }

  updateQuotes(quotes: QuoteData[]): void {
    for (const q of quotes) {
      this.quotes.set(q.symbol, q);
    }
    this.render();
  }

  private loadSymbols(): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch { /* ignore */ }
    return [...DEFAULT_SYMBOLS];
  }

  private saveSymbols(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.symbols));
  }

  private addSymbol(sym: string): void {
    const upper = sym.trim().toUpperCase();
    if (!upper || this.symbols.includes(upper)) return;
    this.symbols.push(upper);
    this.saveSymbols();
    this.render();
    document.dispatchEvent(new CustomEvent('watchlist-changed', { detail: { symbols: [upper] } }));
  }

  private removeSymbol(sym: string): void {
    this.symbols = this.symbols.filter((s) => s !== sym);
    this.quotes.delete(sym);
    this.saveSymbols();
    this.render();
  }

  private render(): void {
    let html = `<div class="watchlist-add">
      <input type="text" placeholder="Add symbol..." class="watchlist-input" />
      <button class="watchlist-add-btn">Add</button>
    </div>`;

    if (!this.symbols.length) {
      html += '<div class="panel-error">No symbols in watchlist</div>';
    } else {
      // Sort symbols
      const sortMode = this.getFilter('sort');
      let sortedSymbols = [...this.symbols];
      if (sortMode !== 'default') {
        sortedSymbols.sort((a, b) => {
          const qa = this.quotes.get(a);
          const qb = this.quotes.get(b);
          if (sortMode === 'gainers') return ((qb?.changePercent || 0) - (qa?.changePercent || 0));
          if (sortMode === 'losers') return ((qa?.changePercent || 0) - (qb?.changePercent || 0));
          if (sortMode === 'alpha') return a.localeCompare(b);
          if (sortMode === 'price') return ((qb?.price || 0) - (qa?.price || 0));
          return 0;
        });
      }
      for (const sym of sortedSymbols) {
        const q = this.quotes.get(sym);
        if (q) {
          const cls = changeClass(q.changePercent);
          html += `<div class="panel-row" data-symbol="${escapeHtml(sym)}">
            <button class="watchlist-remove" data-sym="${escapeHtml(sym)}">&times;</button>
            <span class="symbol"><strong>${escapeHtml(sym)}</strong></span>
            <span class="price">${formatPrice(q.price, 2)}</span>
            <span class="change ${cls}">${formatPercent(q.changePercent)}</span>
            ${q.sparkData ? renderSparkline(q.sparkData) : ''}
          </div>`;
        } else {
          html += `<div class="panel-row" data-symbol="${escapeHtml(sym)}">
            <button class="watchlist-remove" data-sym="${escapeHtml(sym)}">&times;</button>
            <span class="symbol"><strong>${escapeHtml(sym)}</strong></span>
            <span class="price">--</span>
          </div>`;
        }
      }
    }

    this.content.innerHTML = html;
    this.setCount(this.symbols.length);

    // Attach event listeners
    const input = this.content.querySelector<HTMLInputElement>('.watchlist-input');
    const addBtn = this.content.querySelector<HTMLButtonElement>('.watchlist-add-btn');

    if (input && addBtn) {
      addBtn.addEventListener('click', () => {
        this.addSymbol(input.value);
      });
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          this.addSymbol(input.value);
        }
      });
    }

    this.content.querySelectorAll<HTMLButtonElement>('.watchlist-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sym = btn.dataset.sym;
        if (sym) this.removeSymbol(sym);
      });
    });
  }
}
