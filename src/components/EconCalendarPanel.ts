import { Panel } from './Panel';
import { escapeHtml } from '@/utils/dom';

export interface EconEvent {
  name: string;
  date: string;
  time: string;
  impact: 'high' | 'medium' | 'low';
  actual?: string;
  forecast?: string;
  previous?: string;
}

function groupByDate(events: EconEvent[]): Map<string, EconEvent[]> {
  const groups = new Map<string, EconEvent[]>();
  for (const ev of events) {
    if (!groups.has(ev.date)) groups.set(ev.date, []);
    groups.get(ev.date)!.push(ev);
  }
  return groups;
}

function actualVsForecastClass(actual?: string, forecast?: string): string {
  if (!actual || !forecast) return '';
  const a = parseFloat(actual.replace(/[%,]/g, ''));
  const f = parseFloat(forecast.replace(/[%,]/g, ''));
  if (isNaN(a) || isNaN(f)) return '';
  if (a > f) return 'positive';
  if (a < f) return 'negative';
  return 'neutral';
}

export class EconCalendarPanel extends Panel {
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private hasData = false;
  private rawData: EconEvent[] = [];

  constructor() {
    super('econCalendar', 'Economic Calendar');
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
        ],
        default: 'all',
      },
      {
        id: 'impact',
        label: 'Impact',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
        ],
        default: 'all',
      },
    ]);
    this.fallbackTimer = setTimeout(() => {
      if (!this.hasData) this.setStaticCalendar();
    }, 5000);
  }

  protected onFilterChange(): void {
    this.render();
  }

  update(data: EconEvent[]): void {
    this.hasData = true;
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }

    this.rawData = data;
    this.render();
  }

  setStaticCalendar(): void {
    const staticEvents: EconEvent[] = [
      { name: 'ISM Manufacturing PMI', date: '2026-03-02', time: '10:00', impact: 'high' },
      { name: 'JOLTS Job Openings', date: '2026-03-04', time: '10:00', impact: 'medium' },
      { name: 'ADP Employment Change', date: '2026-03-05', time: '08:15', impact: 'medium' },
      { name: 'ISM Services PMI', date: '2026-03-05', time: '10:00', impact: 'high' },
      { name: 'Nonfarm Payrolls (NFP)', date: '2026-03-06', time: '08:30', impact: 'high' },
      { name: 'Unemployment Rate', date: '2026-03-06', time: '08:30', impact: 'high' },
      { name: 'CPI (YoY)', date: '2026-03-12', time: '08:30', impact: 'high' },
      { name: 'Core CPI (MoM)', date: '2026-03-12', time: '08:30', impact: 'high' },
      { name: 'PPI (MoM)', date: '2026-03-13', time: '08:30', impact: 'medium' },
      { name: 'Retail Sales (MoM)', date: '2026-03-17', time: '08:30', impact: 'high' },
      { name: 'FOMC Rate Decision', date: '2026-03-18', time: '14:00', impact: 'high' },
      { name: 'FOMC Press Conference', date: '2026-03-18', time: '14:30', impact: 'high' },
      { name: 'Initial Jobless Claims', date: '2026-03-20', time: '08:30', impact: 'medium' },
      { name: 'Existing Home Sales', date: '2026-03-21', time: '10:00', impact: 'medium' },
      { name: 'GDP (Q4 Final)', date: '2026-03-26', time: '08:30', impact: 'high' },
      { name: 'PCE Price Index (MoM)', date: '2026-03-28', time: '08:30', impact: 'high' },
      { name: 'Core PCE Price Index (YoY)', date: '2026-03-28', time: '08:30', impact: 'high' },
    ];

    this.rawData = staticEvents;
    this.render();
  }

  private render(): void {
    if (!this.rawData.length) {
      this.setContent('<div class="panel-error">No data available</div>');
      this.setCount(0);
      return;
    }

    const timeRange = this.getFilter('timeRange');
    const impactFilter = this.getFilter('impact');

    let filtered = this.rawData;

    if (timeRange !== 'all') {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      if (timeRange === 'today') {
        filtered = filtered.filter(ev => ev.date === todayStr);
      } else if (timeRange === 'week') {
        const sw = startOfWeek.toISOString().slice(0, 10);
        const ew = endOfWeek.toISOString().slice(0, 10);
        filtered = filtered.filter(ev => ev.date >= sw && ev.date <= ew);
      } else if (timeRange === 'next7') {
        const future = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
        filtered = filtered.filter(ev => ev.date >= todayStr && ev.date <= future);
      } else if (timeRange === 'next30') {
        const future = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
        filtered = filtered.filter(ev => ev.date >= todayStr && ev.date <= future);
      }
    }

    if (impactFilter !== 'all') {
      filtered = filtered.filter(ev => ev.impact === impactFilter);
    }

    if (!filtered.length) {
      this.setContent('<div class="panel-error">No matches</div>');
      this.setCount(0);
      return;
    }

    const groups = groupByDate(filtered);
    let html = '';

    for (const [date, items] of groups) {
      const d = new Date(date + 'T00:00:00');
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      html += `<div class="news-date-header">${escapeHtml(label)}</div>`;

      for (const ev of items) {
        const actualCls = actualVsForecastClass(ev.actual, ev.forecast);
        html += `<div class="econ-event">
          <span class="econ-time">${escapeHtml(ev.time)}</span>
          <span class="econ-impact ${ev.impact}"></span>
          <span class="econ-name">${escapeHtml(ev.name)}</span>
          <div class="econ-values">`;

        if (ev.forecast !== undefined) {
          html += `<span class="econ-val">F: ${escapeHtml(ev.forecast)}</span>`;
        }
        if (ev.actual !== undefined) {
          html += `<span class="econ-val ${actualCls}">A: ${escapeHtml(ev.actual)}</span>`;
        }
        if (ev.previous !== undefined) {
          html += `<span class="econ-val">P: ${escapeHtml(ev.previous)}</span>`;
        }

        html += `</div></div>`;
      }
    }

    this.setContent(html);
    this.setCount(filtered.length);
  }

  destroy(): void {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    super.destroy();
  }
}
