import { Panel } from './Panel';
import { NewsItem } from '@/app/app-context';
import { escapeHtml } from '@/utils/dom';

function formatNewsTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDateLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  if (itemDay >= today) return 'Today';
  if (itemDay >= yesterday) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const SOURCE_COLORS: Record<string, string> = {
  'MarketWatch': '#ff9800',
  'MarketWatch Mkts': '#ff9800',
  'CNBC': '#005f9e',
  'CNBC Markets': '#005f9e',
  'CNBC Earnings': '#005f9e',
  'Reuters': '#ff6600',
  'AP News': '#e53935',
  'NYT': '#1a1a1a',
  'NYT Business': '#1a1a1a',
  'NYT Economy': '#1a1a1a',
  'BBC Business': '#bb1919',
  'BBC World': '#bb1919',
  'Guardian Biz': '#052962',
  'Wired Biz': '#000000',
  "Crain's NY": '#d32f2f',
  'Bloomberg': '#472a91',
  'FT': '#fff1e5',
  'WSJ Markets': '#0274b6',
  'WSJ Business': '#0274b6',
  'Yahoo Finance': '#6001d2',
  'Barrons': '#a30000',
  'Seeking Alpha': '#f08f00',
  'Fed': '#1b5e20',
  'ECB': '#003399',
  'CoinDesk': '#0033cc',
};

export class NewsPanel extends Panel {
  private rawData: NewsItem[] = [];
  private activeSources: Set<string> = new Set();
  private searchQuery = '';

  constructor() {
    super('news', 'News Wire', 2);
    this.setupFilters([
      {
        id: 'timeRange',
        label: 'Time',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: '1h', label: '1H' },
          { value: '4h', label: '4H' },
          { value: 'today', label: 'Today' },
          { value: '24h', label: '24H' },
          { value: '7d', label: '7D' },
        ],
        default: 'all',
      },
      {
        id: 'sort',
        label: 'Sort',
        type: 'select',
        options: [
          { value: 'newest', label: 'Newest' },
          { value: 'oldest', label: 'Oldest' },
          { value: 'source', label: 'By Source' },
        ],
        default: 'newest',
      },
    ]);
  }

  protected onFilterChange(): void {
    this.render();
  }

  update(data: NewsItem[]): void {
    this.rawData = data;
    this.buildSourceChips();
    this.render();
  }

  private buildSourceChips(): void {
    // Collect unique sources from data
    const sources = [...new Set(this.rawData.map(item => item.source))].sort();

    this.filterBar.innerHTML = '';

    // Search input
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search headlines\u2026';
    searchInput.className = 'filter-search';
    searchInput.value = this.searchQuery;
    searchInput.addEventListener('input', () => {
      this.searchQuery = searchInput.value.toLowerCase();
      this.render();
    });
    this.filterBar.appendChild(searchInput);

    // "All" button to reset source filters
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-chip' + (this.activeSources.size === 0 ? ' active' : '');
    allBtn.textContent = 'All';
    allBtn.addEventListener('click', () => {
      this.activeSources.clear();
      this.updateSourceChipStyles();
      this.render();
    });
    this.filterBar.appendChild(allBtn);

    // Source chips
    for (const source of sources) {
      const btn = document.createElement('button');
      btn.className = 'filter-chip' + (this.activeSources.has(source) ? ' active' : '');
      btn.textContent = source;
      btn.dataset.source = source;
      btn.addEventListener('click', () => {
        if (this.activeSources.has(source)) {
          this.activeSources.delete(source);
        } else {
          this.activeSources.add(source);
        }
        this.updateSourceChipStyles();
        this.render();
      });
      this.filterBar.appendChild(btn);
    }
  }

  private updateSourceChipStyles(): void {
    const chips = this.filterBar.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
      const el = chip as HTMLElement;
      const source = el.dataset.source;
      if (!source) {
        // "All" button
        el.classList.toggle('active', this.activeSources.size === 0);
      } else {
        el.classList.toggle('active', this.activeSources.has(source));
      }
    });
  }

  private render(): void {
    if (!this.rawData.length) {
      this.setContent('<div class="panel-error">No data available</div>');
      this.setCount(0);
      return;
    }

    // Apply time filter
    let filtered = this.rawData;
    const timeRange = this.getFilter('timeRange');
    if (timeRange !== 'all') {
      const now = Date.now();
      const cutoff = timeRange === '1h' ? now - 3600000
        : timeRange === '4h' ? now - 4 * 3600000
        : timeRange === 'today' ? new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()
        : timeRange === '24h' ? now - 24 * 3600000
        : timeRange === '7d' ? now - 7 * 86400000
        : 0;
      filtered = filtered.filter(item => item.datetime >= cutoff);
    }

    // Apply source filter
    if (this.activeSources.size > 0) {
      filtered = filtered.filter(item => this.activeSources.has(item.source));
    }

    // Apply search filter
    if (this.searchQuery) {
      filtered = filtered.filter(item =>
        item.headline.toLowerCase().includes(this.searchQuery)
      );
    }

    if (!filtered.length) {
      this.setContent('<div class="panel-error">No matches</div>');
      this.setCount(0);
      return;
    }

    // Sort
    const sortMode = this.getFilter('sort');
    const sorted = [...filtered].sort((a, b) => {
      if (sortMode === 'oldest') return a.datetime - b.datetime;
      if (sortMode === 'source') return a.source.localeCompare(b.source) || b.datetime - a.datetime;
      return b.datetime - a.datetime; // newest
    });
    const capped = sorted.slice(0, 60);

    // Group by date
    const groups = new Map<string, NewsItem[]>();
    for (const item of capped) {
      const label = formatDateLabel(item.datetime);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(item);
    }

    let html = '';
    for (const [dateLabel, items] of groups) {
      html += `<div class="news-date-header">${escapeHtml(dateLabel)}</div>`;
      for (const item of items) {
        const time = formatNewsTime(item.datetime);
        const srcColor = SOURCE_COLORS[item.source] ?? 'var(--text-muted)';
        const srcBg = `${srcColor}22`;
        const fullDate = new Date(item.datetime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const summary = item.summary ? escapeHtml(item.summary).slice(0, 300) : '';
        const tt = `<div class='tt-title'>${escapeHtml(item.headline)}</div><div class='tt-muted'>${escapeHtml(item.source)} &middot; ${escapeHtml(fullDate)}</div>${summary ? `<hr class='tt-divider'><div style='font-size:11px;color:var(--text-secondary);line-height:1.5'>${summary}${summary.length >= 300 ? '&hellip;' : ''}</div>` : ''}`;
        html += `<div class="news-item" data-tooltip="${tt.replace(/"/g, '&quot;')}">
          <span class="news-time">${time}</span>
          <span class="news-src" style="color:${srcColor};background:${srcBg}">${escapeHtml(item.source)}</span>
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" class="news-headline">${escapeHtml(item.headline)}</a>
        </div>`;
      }
    }

    this.setContent(html);
    this.setCount(filtered.length);
  }
}
