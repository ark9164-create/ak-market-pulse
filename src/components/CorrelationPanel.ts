import { Panel } from './Panel';
import { formatPrice, formatChange, formatPercent, changeClass } from '@/utils/format';
import { escapeHtml } from '@/utils/dom';

interface CrossAssetRow {
  label: string;
  price: number;
  change: number;
  changePercent: number;
}

export class CorrelationPanel extends Panel {
  private data: CrossAssetRow[] = [];

  constructor() {
    super('correlation', 'Cross-Asset');
  }

  update(data: CrossAssetRow[]): void {
    this.data = data;
    this.render();
  }

  private render(): void {
    if (!this.data.length) {
      this.setContent('<div class="panel-error">No data available</div>');
      this.setCount(0);
      return;
    }

    const headerRow = `<div class="panel-row" style="display:flex;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);font-size:11px;color:var(--text-muted);font-weight:600">
      <span style="flex:1">Asset</span>
      <span style="flex:0 0 80px;text-align:right">Price</span>
      <span style="flex:0 0 70px;text-align:right">Change</span>
      <span style="flex:0 0 65px;text-align:right">Chg%</span>
    </div>`;

    const rows = this.data.map(row => {
      const cls = changeClass(row.changePercent);
      const decimals = Math.abs(row.price) < 10 ? 4 : 2;
      const tt = `<div class='tt-title'>${escapeHtml(row.label)}</div><hr class='tt-divider'><div class='tt-row'><span class='tt-label'>Price</span><span class='tt-value'>${formatPrice(row.price, decimals)}</span></div><div class='tt-row'><span class='tt-label'>Change</span><span class='tt-value ${row.change >= 0 ? 'tt-green' : 'tt-red'}'>${formatChange(row.change, decimals)} (${formatPercent(row.changePercent)})</span></div>`;
      return `<div class="panel-row" data-tooltip="${tt.replace(/"/g, '&quot;')}" style="display:flex;gap:8px;align-items:center;padding:4px 0">
        <span class="symbol" style="flex:1;font-weight:600;font-size:12px">${escapeHtml(row.label)}</span>
        <span class="price" style="flex:0 0 80px;text-align:right;font-size:12px">${formatPrice(row.price, decimals)}</span>
        <span class="change ${cls}" style="flex:0 0 70px;text-align:right;font-size:12px">${formatChange(row.change, decimals)}</span>
        <span class="change ${cls}" style="flex:0 0 65px;text-align:right;font-size:12px">${formatPercent(row.changePercent)}</span>
      </div>`;
    }).join('');

    this.setContent(headerRow + rows);
    this.setCount(this.data.length);
  }
}
