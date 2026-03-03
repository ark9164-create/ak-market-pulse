import { Panel } from './Panel';
import { NewsItem } from '@/app/app-context';
import { escapeHtml } from '@/utils/dom';

const FLOW_KEYWORDS: Record<string, string[]> = {
  insider: ['insider', 'insider trading', 'insider buy', 'insider sell', 'officer', 'director'],
  buyback: ['buyback', 'repurchase', 'share repurchase', 'stock buyback'],
  institutional: ['13f', '13d', 'sec filing', 'institutional', 'hedge fund', 'activist', 'stake'],
};

const ALL_KEYWORDS = Object.values(FLOW_KEYWORDS).flat();

const TYPE_COLORS: Record<string, string> = {
  insider: '#f59e0b',
  buyback: '#3b82f6',
  institutional: '#8b5cf6',
};

interface NotableTransaction {
  date: string;
  headline: string;
  type: string;
}

const NOTABLE_TRANSACTIONS: NotableTransaction[] = [
  { date: '2026-02-27', headline: 'JPMorgan CEO Jamie Dimon sells $150M in shares under 10b5-1 plan', type: 'insider' },
  { date: '2026-02-25', headline: 'Apple announces $110B share repurchase program', type: 'buyback' },
  { date: '2026-02-24', headline: 'Berkshire Hathaway 13F reveals new $2.1B position in Constellation Energy', type: 'institutional' },
  { date: '2026-02-21', headline: 'Meta CFO sells 12,000 shares at $625 per share', type: 'insider' },
  { date: '2026-02-20', headline: 'Elliott Management discloses 6.2% activist stake in Honeywell', type: 'institutional' },
];

function classifyItem(headline: string): string {
  const lower = headline.toLowerCase();
  for (const [type, keywords] of Object.entries(FLOW_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return type;
    }
  }
  return 'institutional'; // default bucket
}

function matchesFlowKeywords(headline: string): boolean {
  const lower = headline.toLowerCase();
  return ALL_KEYWORDS.some(kw => lower.includes(kw));
}

function formatItemDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export class InsiderFlowPanel extends Panel {
  private data: NewsItem[] = [];

  constructor() {
    super('insiderFlow', 'Insider & Flow');
    this.setupFilters([
      {
        id: 'timeRange',
        label: 'Time',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: '24h', label: '24H' },
          { value: '7d', label: '7D' },
          { value: '30d', label: '30D' },
        ],
        default: 'all',
      },
      {
        id: 'type',
        label: 'Type',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'insider', label: 'Insider' },
          { value: 'buyback', label: 'Buyback' },
          { value: 'institutional', label: 'Institutional' },
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
          { value: 'type', label: 'By Type' },
        ],
        default: 'newest',
      },
    ]);
  }

  protected onFilterChange(): void {
    this.render();
  }

  update(data: NewsItem[]): void {
    this.data = data.filter(item => matchesFlowKeywords(item.headline));
    this.render();
  }

  private render(): void {
    const typeFilter = this.getFilter('type');

    // Apply time filter
    const timeRange = this.getFilter('timeRange');

    // Build notable transactions section
    let notableFiltered = NOTABLE_TRANSACTIONS;
    if (timeRange !== 'all') {
      const now = Date.now();
      const cutoff = timeRange === '24h' ? now - 86400000
        : timeRange === '7d' ? now - 7 * 86400000
        : timeRange === '30d' ? now - 30 * 86400000
        : 0;
      notableFiltered = notableFiltered.filter(t => new Date(t.date).getTime() >= cutoff);
    }
    if (typeFilter !== 'all') {
      notableFiltered = notableFiltered.filter(t => t.type === typeFilter);
    }

    let html = '';

    // Notable transactions header
    if (notableFiltered.length) {
      html += `<div style="font-size:11px;font-weight:600;color:var(--text-muted);padding:4px 0;border-bottom:1px solid var(--border);margin-bottom:2px">Notable Transactions</div>`;
      html += notableFiltered.map(t => {
        const color = TYPE_COLORS[t.type] ?? 'var(--text-muted)';
        return `<div class="panel-row" style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px">
          <span style="flex:0 0 55px;color:var(--text-muted)">${escapeHtml(t.date.slice(5))}</span>
          <span style="flex:0 0 auto;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:600;color:${color};background:${color}22">${escapeHtml(t.type)}</span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(t.headline)}</span>
        </div>`;
      }).join('');
    }

    // News-based flow items
    let newsFiltered = this.data;
    if (timeRange !== 'all') {
      const now = Date.now();
      const cutoff = timeRange === '24h' ? now - 86400000
        : timeRange === '7d' ? now - 7 * 86400000
        : timeRange === '30d' ? now - 30 * 86400000
        : 0;
      newsFiltered = newsFiltered.filter(item => item.datetime >= cutoff);
    }
    if (typeFilter !== 'all') {
      newsFiltered = newsFiltered.filter(item => classifyItem(item.headline) === typeFilter);
    }

    // Sort news items
    const sortMode = this.getFilter('sort');
    if (sortMode === 'oldest') newsFiltered.sort((a, b) => a.datetime - b.datetime);
    else if (sortMode === 'type') newsFiltered.sort((a, b) => classifyItem(a.headline).localeCompare(classifyItem(b.headline)) || b.datetime - a.datetime);
    else newsFiltered.sort((a, b) => b.datetime - a.datetime);

    if (newsFiltered.length) {
      html += `<div style="font-size:11px;font-weight:600;color:var(--text-muted);padding:4px 0;border-bottom:1px solid var(--border);margin-top:8px;margin-bottom:2px">News Feed</div>`;
      const capped = newsFiltered.slice(0, 20);
      html += capped.map(item => {
        const type = classifyItem(item.headline);
        const color = TYPE_COLORS[type] ?? 'var(--text-muted)';
        const dateStr = formatItemDate(item.datetime);
        return `<div class="panel-row" style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px">
          <span style="flex:0 0 55px;color:var(--text-muted)">${escapeHtml(dateStr)}</span>
          <span style="flex:0 0 auto;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:600;color:${color};background:${color}22">${escapeHtml(type)}</span>
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text);text-decoration:none">${escapeHtml(item.headline)}</a>
        </div>`;
      }).join('');
    }

    if (!html) {
      this.setContent('<div class="panel-error">No data available</div>');
      this.setCount(0);
      return;
    }

    this.setContent(html);
    this.setCount(newsFiltered.length + notableFiltered.length);
  }
}
