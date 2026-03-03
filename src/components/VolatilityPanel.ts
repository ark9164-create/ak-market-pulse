import { Panel } from './Panel';
import { QuoteData } from '@/app/app-context';
import { formatPrice, formatChange, formatPercent } from '@/utils/format';
import { renderSparkline } from '@/utils/sparkline';

interface VixData {
  vix: QuoteData;
  putCallRatio?: number;
}

function vixColor(value: number): string {
  if (value < 15) return 'var(--green)';
  if (value <= 25) return 'gold';
  if (value <= 35) return 'orange';
  return 'var(--red)';
}

function vixRegime(value: number): string {
  if (value < 15) return 'Low Volatility';
  if (value <= 25) return 'Normal';
  if (value <= 35) return 'Elevated';
  return 'Extreme Fear';
}

export class VolatilityPanel extends Panel {
  private rawData: VixData | null = null;

  constructor() {
    super('volatility', 'Volatility & Sentiment');
    this.setupFilters([
      {
        id: 'sparkline',
        label: 'Show Sparkline',
        type: 'toggle',
        default: 'true',
      },
    ]);
  }

  protected onFilterChange(): void {
    this.render();
  }

  update(data: VixData): void {
    this.rawData = data;
    this.render();
  }

  private render(): void {
    if (!this.rawData || !this.rawData.vix) {
      this.setContent('<div class="panel-error">No data available</div>');
      return;
    }

    const { vix, putCallRatio } = this.rawData;
    const showSparkline = this.isFilterActive('sparkline');
    const color = vixColor(vix.price);
    const regime = vixRegime(vix.price);
    const barPercent = Math.min((vix.price / 80) * 100, 100);

    let html = `
      <div class="vix-gauge">
        <div class="vix-value" style="color:${color}">${formatPrice(vix.price, 2)}</div>
        <div class="vix-label">VIX</div>
      </div>
      <div class="vix-bar">
        <div class="vix-bar-fill" style="width:${barPercent.toFixed(1)}%;background:${color}"></div>
      </div>
      <div class="vix-regime" style="color:${color}">${regime}</div>`;

    if (showSparkline && vix.sparkData && vix.sparkData.length >= 2) {
      html += `<div class="vix-sparkline">${renderSparkline(vix.sparkData, 120, 30, color)}</div>`;
    }

    const changeCls = vix.change >= 0 ? 'negative' : 'positive'; // higher VIX = bad
    html += `<div class="vix-change ${changeCls}">${formatChange(vix.change, 2)} (${formatPercent(vix.changePercent)})</div>`;

    if (putCallRatio !== undefined) {
      html += `<div class="vix-pcr">Put/Call Ratio: <strong>${putCallRatio.toFixed(2)}</strong></div>`;
    }

    this.setContent(html);
  }
}
