import { h, escapeHtml } from '@/utils/dom';
import { toggleTheme, getTheme } from '@/utils/theme';

interface EquityEntry {
  s: string; // symbol
  n: string; // name
}

let equitiesCache: EquityEntry[] | null = null;
async function loadEquities(): Promise<EquityEntry[]> {
  if (equitiesCache) return equitiesCache;
  try {
    const res = await fetch('/equities.json');
    equitiesCache = await res.json();
    return equitiesCache!;
  } catch {
    return [];
  }
}

export class Header {
  private el: HTMLElement;
  private clockInterval: ReturnType<typeof setInterval>;
  private clockEl: HTMLElement;
  private themeBtn: HTMLButtonElement;
  private searchResults: HTMLElement;
  private activeIndex = -1;

  constructor(container: HTMLElement, onCopilotToggle: () => void) {
    // Logo
    const logo = h('div', { className: 'header-logo' },
      h('span', { className: 'header-logo-dot' }),
      h('span', { className: 'header-logo-text' }, 'MarketPulse'),
    );

    // Stock Search
    const searchContainer = h('div', { className: 'stock-search-container' });
    const searchIcon = h('span', { className: 'stock-search-icon' }, '\u{1F50D}');
    const search = h('input', {
      type: 'text',
      className: 'stock-search-input',
      placeholder: 'Search stocks...',
    }) as HTMLInputElement;
    this.searchResults = h('div', { className: 'stock-search-results' });
    searchContainer.appendChild(searchIcon);
    searchContainer.appendChild(search);
    searchContainer.appendChild(this.searchResults);

    let debounceTimer: ReturnType<typeof setTimeout>;
    search.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      this.activeIndex = -1;
      const query = search.value.trim();
      if (query.length < 1) {
        this.searchResults.innerHTML = '';
        // Fall back to panel search
        window.dispatchEvent(new CustomEvent('panel-search', { detail: { query: '' } }));
        return;
      }
      debounceTimer = setTimeout(() => this.performSearch(query), 150);
    });

    search.addEventListener('keydown', (e) => {
      const items = this.searchResults.querySelectorAll('.stock-search-result');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.activeIndex = Math.min(this.activeIndex + 1, items.length - 1);
        this.highlightResult(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this.highlightResult(items);
      } else if (e.key === 'Enter' && this.activeIndex >= 0 && items[this.activeIndex]) {
        e.preventDefault();
        const symbol = (items[this.activeIndex] as HTMLElement).dataset.symbol;
        if (symbol) {
          window.location.hash = `#/stock/${symbol}`;
          search.value = '';
          this.searchResults.innerHTML = '';
        }
      } else if (e.key === 'Escape') {
        this.searchResults.innerHTML = '';
        search.blur();
      }
    });

    search.addEventListener('blur', () => {
      setTimeout(() => { this.searchResults.innerHTML = ''; }, 200);
    });

    // Preload equities data
    loadEquities();

    // Clock
    this.clockEl = h('div', { className: 'header-clock' });
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);

    // Theme toggle
    this.themeBtn = h('button', { className: 'header-btn' }) as HTMLButtonElement;
    this.updateThemeIcon();
    this.themeBtn.addEventListener('click', () => {
      toggleTheme();
      this.updateThemeIcon();
    });

    // Copilot button
    const copilotBtn = h('button', { className: 'header-btn header-btn-accent' }, 'AI Copilot');
    copilotBtn.addEventListener('click', onCopilotToggle);

    // Assemble header
    this.el = h('header', { className: 'header-bar' },
      logo,
      searchContainer,
      this.clockEl,
      this.themeBtn,
      copilotBtn,
    );

    container.prepend(this.el);
  }

  private updateClock(): void {
    const now = new Date();
    const fmt = (tz: string): string =>
      now.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

    this.clockEl.innerHTML =
      `<span class="header-tz"><b>NY</b> ${fmt('America/New_York')}</span>` +
      `<span class="header-tz"><b>LDN</b> ${fmt('Europe/London')}</span>` +
      `<span class="header-tz"><b>TYO</b> ${fmt('Asia/Tokyo')}</span>`;
  }

  private updateThemeIcon(): void {
    this.themeBtn.textContent = getTheme() === 'dark' ? '\u2600' : '\u263E';
  }

  private async performSearch(query: string): Promise<void> {
    const equities = await loadEquities();
    const q = query.toUpperCase();
    const matches: EquityEntry[] = [];

    // Exact symbol match first
    for (const e of equities) {
      if (e.s === q) { matches.unshift(e); continue; }
      if (matches.length >= 8) break;
      if (e.s.startsWith(q) || e.n.toUpperCase().includes(q)) {
        matches.push(e);
      }
    }

    if (matches.length === 0) {
      this.searchResults.innerHTML = '<div style="padding:10px;color:var(--text-muted);font-size:12px;text-align:center">No results</div>';
      return;
    }

    this.searchResults.innerHTML = matches.slice(0, 8).map(e =>
      `<div class="stock-search-result" data-symbol="${escapeHtml(e.s)}">
        <span class="stock-search-result-symbol">${escapeHtml(e.s)}</span>
        <span class="stock-search-result-name">${escapeHtml(e.n)}</span>
      </div>`
    ).join('');

    this.searchResults.querySelectorAll('.stock-search-result').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const symbol = (el as HTMLElement).dataset.symbol;
        if (symbol) {
          window.location.hash = `#/stock/${symbol}`;
          this.searchResults.innerHTML = '';
        }
      });
    });
  }

  private highlightResult(items: NodeListOf<Element>): void {
    items.forEach((el, i) => {
      el.classList.toggle('active', i === this.activeIndex);
    });
  }

  destroy(): void {
    clearInterval(this.clockInterval);
    this.el.remove();
  }
}
