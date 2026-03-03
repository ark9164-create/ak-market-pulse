import { Panel } from './Panel';
import { BondData } from '@/app/app-context';
import { formatChange, changeClass } from '@/utils/format';
import { escapeHtml } from '@/utils/dom';

const CURVE_TENORS = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y', '30Y'];

function renderYieldCurve(data: BondData[]): string {
  const curvePoints = CURVE_TENORS.map((t) => data.find((b) => b.label.includes(t)));
  const valid = curvePoints.filter((p): p is BondData => p != null);
  if (valid.length < 2) return '';

  const svgW = 260;
  const svgH = 80;
  const padX = 30;
  const padY = 12;
  const plotW = svgW - padX * 2;
  const plotH = svgH - padY * 2;

  const yields = valid.map((p) => p.yield);
  const minY = Math.min(...yields) - 0.1;
  const maxY = Math.max(...yields) + 0.1;
  const rangeY = maxY - minY || 1;

  const pts = valid.map((p, i) => {
    const x = padX + (i / (valid.length - 1)) * plotW;
    const y = padY + plotH - ((p.yield - minY) / rangeY) * plotH;
    return { x, y, label: CURVE_TENORS[CURVE_TENORS.indexOf(p.label.replace(/[^0-9Y]/g, '').replace(/(\d+).*/, '$1Y'))] || p.label, value: p.yield };
  });

  const polyline = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const dots = pts.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="var(--accent)" />`).join('');

  const labels = valid.map((p, i) => {
    const x = padX + (i / (valid.length - 1)) * plotW;
    return `<text x="${x.toFixed(1)}" y="${svgH - 1}" text-anchor="middle" fill="var(--text-secondary)" font-size="9">${escapeHtml(CURVE_TENORS[i] ?? p.label)}</text>`;
  }).join('');

  const valueLabels = pts.map((p) =>
    `<text x="${p.x.toFixed(1)}" y="${(p.y - 6).toFixed(1)}" text-anchor="middle" fill="var(--text-primary)" font-size="9">${p.value.toFixed(2)}</text>`
  ).join('');

  return `<div style="text-align:center;margin-bottom:8px">
    <svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
      <polyline fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${polyline}" />
      ${dots}
      ${labels}
      ${valueLabels}
    </svg>
  </div>`;
}

export class BondsPanel extends Panel {
  private data: BondData[] = [];

  constructor() {
    super('bonds', 'Treasury Yields');
    this.setupFilters([
      { id: 'curve', label: 'Yield Curve', type: 'toggle', default: 'true' },
      { id: 'view', label: 'View', type: 'select', options: [
        { value: 'all', label: 'All' },
        { value: 'tenors', label: 'Tenors' },
        { value: 'spreads', label: 'Spreads' },
      ], default: 'all' },
    ]);
  }

  protected onFilterChange(): void {
    this.render();
  }

  update(data: BondData[]): void {
    this.data = data;
    this.render();
  }

  private render(): void {
    if (!this.data.length) {
      this.setContent('<div class="panel-error">No data available</div>');
      this.setCount(0);
      return;
    }

    const showCurve = this.isFilterActive('curve');
    const view = this.getFilter('view');

    const isTenor = (b: BondData) => !b.label.includes('Spread');
    const isSpread = (b: BondData) => b.label.includes('Spread');

    let displayData = this.data;
    if (view === 'tenors') displayData = this.data.filter(isTenor);
    else if (view === 'spreads') displayData = this.data.filter(isSpread);

    const curve = showCurve ? renderYieldCurve(this.data.filter(isTenor)) : '';

    const rows = displayData.map((b) => {
      const cls = changeClass(b.change);
      const bps = Math.round(b.change * 100);
      const isSpread = b.label.includes('Spread');
      const tt = `<div class='tt-title'>${escapeHtml(b.label)}${isSpread ? '' : ' Treasury'}</div><hr class='tt-divider'><div class='tt-row'><span class='tt-label'>${isSpread ? 'Spread' : 'Yield'}</span><span class='tt-value'>${b.yield.toFixed(3)}%</span></div><div class='tt-row'><span class='tt-label'>Change</span><span class='tt-value ${b.change >= 0 ? 'tt-green' : 'tt-red'}'>${b.change >= 0 ? '+' : ''}${b.change.toFixed(3)}%</span></div><div class='tt-row'><span class='tt-label'>Basis Points</span><span class='tt-value ${bps >= 0 ? 'tt-green' : 'tt-red'}'>${bps >= 0 ? '+' : ''}${bps} bps</span></div><div class='tt-row'><span class='tt-label'>Source</span><span class='tt-value tt-muted'>${escapeHtml(b.seriesId)}</span></div>`;
      return `<div class="panel-row" data-tooltip="${tt.replace(/"/g, '&quot;')}">
        <span class="symbol">${escapeHtml(b.label)}</span>
        <span class="price">${b.yield.toFixed(2)}%</span>
        <span class="change ${cls}">${formatChange(b.change, 2)}</span>
      </div>`;
    }).join('');

    this.setContent(curve + rows);
    this.setCount(displayData.length);
  }
}
