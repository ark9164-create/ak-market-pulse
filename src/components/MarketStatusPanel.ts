import { Panel } from './Panel';

interface Exchange {
  name: string;
  timezone: string;         // IANA timezone
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
  lunchStartHour?: number;
  lunchStartMinute?: number;
  lunchEndHour?: number;
  lunchEndMinute?: number;
  preMarketHour?: number;    // pre-market start (hour)
  afterHoursEnd?: number;    // after-hours end (hour)
  hoursLabel: string;
}

const EXCHANGES: Exchange[] = [
  { name: 'NYSE', timezone: 'America/New_York', openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0, preMarketHour: 4, afterHoursEnd: 20, hoursLabel: '9:30-16:00 ET' },
  { name: 'NASDAQ', timezone: 'America/New_York', openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0, preMarketHour: 4, afterHoursEnd: 20, hoursLabel: '9:30-16:00 ET' },
  { name: 'LSE', timezone: 'Europe/London', openHour: 8, openMinute: 0, closeHour: 16, closeMinute: 30, hoursLabel: '8:00-16:30 GMT' },
  { name: 'TSE Tokyo', timezone: 'Asia/Tokyo', openHour: 9, openMinute: 0, closeHour: 15, closeMinute: 0, lunchStartHour: 11, lunchStartMinute: 30, lunchEndHour: 12, lunchEndMinute: 30, hoursLabel: '9:00-15:00 JST' },
  { name: 'SSE Shanghai', timezone: 'Asia/Shanghai', openHour: 9, openMinute: 30, closeHour: 15, closeMinute: 0, lunchStartHour: 11, lunchStartMinute: 30, lunchEndHour: 13, lunchEndMinute: 0, hoursLabel: '9:30-15:00 CST' },
  { name: 'HKEX', timezone: 'Asia/Hong_Kong', openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0, lunchStartHour: 12, lunchStartMinute: 0, lunchEndHour: 13, lunchEndMinute: 0, hoursLabel: '9:30-16:00 HKT' },
  { name: 'Euronext', timezone: 'Europe/Paris', openHour: 9, openMinute: 0, closeHour: 17, closeMinute: 30, hoursLabel: '9:00-17:30 CET' },
  { name: 'ASX Sydney', timezone: 'Australia/Sydney', openHour: 10, openMinute: 0, closeHour: 16, closeMinute: 0, hoursLabel: '10:00-16:00 AEDT' },
  { name: 'BSE Mumbai', timezone: 'Asia/Kolkata', openHour: 9, openMinute: 15, closeHour: 15, closeMinute: 30, hoursLabel: '9:15-15:30 IST' },
];

type MarketState = 'open' | 'closed' | 'pre' | 'after' | 'lunch';

function toMinutes(h: number, m: number): number {
  return h * 60 + m;
}

function getExchangeState(ex: Exchange, now: Date): MarketState {
  // Get local time in exchange timezone
  const localStr = now.toLocaleString('en-US', { timeZone: ex.timezone, hour12: false });
  const parts = localStr.split(', ');
  const datePart = parts[0];
  const timeParts = parts[1].split(':');
  const hour = parseInt(timeParts[0], 10) % 24; // handle "24:00" edge case
  const minute = parseInt(timeParts[1], 10);

  // Check weekend
  const dayStr = now.toLocaleDateString('en-US', { timeZone: ex.timezone, weekday: 'short' });
  if (dayStr === 'Sat' || dayStr === 'Sun') return 'closed';

  const currentMin = toMinutes(hour, minute);
  const openMin = toMinutes(ex.openHour, ex.openMinute);
  const closeMin = toMinutes(ex.closeHour, ex.closeMinute);

  // Check lunch break
  if (ex.lunchStartHour !== undefined && ex.lunchStartMinute !== undefined &&
      ex.lunchEndHour !== undefined && ex.lunchEndMinute !== undefined) {
    const lunchStart = toMinutes(ex.lunchStartHour, ex.lunchStartMinute);
    const lunchEnd = toMinutes(ex.lunchEndHour, ex.lunchEndMinute);
    if (currentMin >= lunchStart && currentMin < lunchEnd) return 'lunch';
  }

  // Check pre-market (US exchanges only)
  if (ex.preMarketHour !== undefined) {
    const preMin = toMinutes(ex.preMarketHour, 0);
    if (currentMin >= preMin && currentMin < openMin) return 'pre';
  }

  // Check after-hours (US exchanges only)
  if (ex.afterHoursEnd !== undefined) {
    const afterEnd = toMinutes(ex.afterHoursEnd, 0);
    if (currentMin >= closeMin && currentMin < afterEnd) return 'after';
  }

  // Check regular hours
  if (currentMin >= openMin && currentMin < closeMin) return 'open';

  return 'closed';
}

function stateLabel(state: MarketState): string {
  switch (state) {
    case 'open': return 'Open';
    case 'closed': return 'Closed';
    case 'pre': return 'Pre-Market';
    case 'after': return 'After Hours';
    case 'lunch': return 'Lunch Break';
  }
}

function stateDotClass(state: MarketState): string {
  switch (state) {
    case 'open': return 'mkt-status-dot open';
    case 'pre':
    case 'after':
    case 'lunch': return 'mkt-status-dot pre';
    case 'closed': return 'mkt-status-dot closed';
  }
}

export class MarketStatusPanel extends Panel {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super('marketStatus', 'Market Status');
    this.render();
    this.timer = setInterval(() => this.render(), 30_000);
  }

  private render(): void {
    const now = new Date();
    let openCount = 0;

    const rows = EXCHANGES.map((ex) => {
      const state = getExchangeState(ex, now);
      if (state === 'open') openCount++;
      const label = stateLabel(state);
      const dotCls = stateDotClass(state);

      return `<div class="mkt-status-row">
        <span class="${dotCls}"></span>
        <span class="mkt-status-name">${ex.name}</span>
        <span class="mkt-status-label">${label}</span>
        <span class="mkt-status-hours">${ex.hoursLabel}</span>
      </div>`;
    }).join('');

    this.setContent(rows || '<div class="panel-error">No data available</div>');
    this.setCount(openCount);
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    super.destroy();
  }
}
