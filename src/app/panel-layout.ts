import type { AppContext } from './app-context';
import { h } from '@/utils/dom';
import { Header } from '@/components/Header';
import { DeckGLMap } from '@/components/DeckGLMap';
import { IndicesPanel } from '@/components/IndicesPanel';
import { MarketsPanel } from '@/components/MarketsPanel';
import { HeatmapPanel } from '@/components/HeatmapPanel';
import { FXPanel } from '@/components/FXPanel';
import { BondsPanel } from '@/components/BondsPanel';
import { CommoditiesPanel } from '@/components/CommoditiesPanel';
import { CryptoPanel } from '@/components/CryptoPanel';
import { MacroPanel } from '@/components/MacroPanel';
import { EarningsPanel } from '@/components/EarningsPanel';
import { NewsPanel } from '@/components/NewsPanel';
import { IPOPanel } from '@/components/IPOPanel';
import { CentralBanksPanel } from '@/components/CentralBanksPanel';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { VolatilityPanel } from '@/components/VolatilityPanel';
import { WatchlistPanel } from '@/components/WatchlistPanel';
import { EconCalendarPanel } from '@/components/EconCalendarPanel';
import { MarketStatusPanel } from '@/components/MarketStatusPanel';
import { SectorRotationPanel } from '@/components/SectorRotationPanel';
import { CorrelationPanel } from '@/components/CorrelationPanel';
import { FedWatchPanel } from '@/components/FedWatchPanel';
import { TopMoversPanel } from '@/components/TopMoversPanel';
import { InsiderFlowPanel } from '@/components/InsiderFlowPanel';
import { FundamentalsPanel } from '@/components/FundamentalsPanel';

export class PanelLayoutManager {
  private ctx: AppContext;
  private header: Header | null = null;
  private copilot: CopilotDrawer | null = null;

  constructor(ctx: AppContext) {
    this.ctx = ctx;
  }

  init(): void {
    const { root } = this.ctx;

    // Header
    const headerContainer = h('div', { className: 'header-container' });
    root.appendChild(headerContainer);
    this.header = new Header(headerContainer, () => this.copilot?.toggle());

    // Main layout (map + panels grid)
    const mainLayout = h('div', { className: 'main-layout' });
    root.appendChild(mainLayout);

    // Map container
    const mapContainer = h('div', { className: 'map-container' });
    mainLayout.appendChild(mapContainer);

    // Initialize map (non-fatal if WebGL unavailable)
    try {
      this.ctx.map = new DeckGLMap(mapContainer, this.ctx);
    } catch (e) {
      console.warn('[MarketPulse] Map failed to initialize (WebGL may be unavailable):', e);
      mapContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:13px">Map unavailable</div>';
    }

    // Panels grid
    const panelsGrid = h('div', { className: 'panels-grid' });
    mainLayout.appendChild(panelsGrid);

    // Instantiate all panels
    const panels = [
      new FundamentalsPanel(),
      new IndicesPanel(),
      new MarketsPanel(),
      new HeatmapPanel(),
      new VolatilityPanel(),
      new WatchlistPanel(),
      new FXPanel(),
      new BondsPanel(),
      new CommoditiesPanel(),
      new CryptoPanel(),
      new MacroPanel(),
      new EarningsPanel(),
      new TopMoversPanel(),
      new SectorRotationPanel(),
      new CorrelationPanel(),
      new FedWatchPanel(),
      new EconCalendarPanel(),
      new NewsPanel(),
      new InsiderFlowPanel(),
      new IPOPanel(),
      new CentralBanksPanel(),
      new MarketStatusPanel(),
    ];

    for (const panel of panels) {
      this.ctx.panels.set(panel.id, panel);
      panelsGrid.appendChild(panel.el);
    }

    // Copilot drawer
    this.copilot = new CopilotDrawer(root, () => this.getMarketContext());

    // Panel search
    document.addEventListener('panel-search', ((e: CustomEvent) => {
      const query = e.detail?.query?.toLowerCase() ?? '';
      for (const [, panel] of this.ctx.panels) {
        const match = !query || panel.title.toLowerCase().includes(query);
        panel.el.style.display = match ? '' : 'none';
      }
    }) as EventListener);
  }

  private getMarketContext(): string {
    const parts: string[] = ['Current market snapshot:'];
    const fmt = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

    if (this.ctx.indices.length) {
      parts.push('\nIndices:');
      for (const q of this.ctx.indices) {
        parts.push(`  ${q.symbol}: ${q.price} (${fmt(q.changePercent)})`);
      }
    }

    if (this.ctx.stocks.length) {
      parts.push('\nTop Stocks:');
      for (const q of this.ctx.stocks) {
        parts.push(`  ${q.symbol}: $${q.price.toFixed(2)} (${fmt(q.changePercent)})`);
      }
    }

    if (this.ctx.sectorETFs.length) {
      parts.push('\nSectors:');
      for (const q of this.ctx.sectorETFs) {
        parts.push(`  ${q.symbol} (${q.name}): ${fmt(q.changePercent)}`);
      }
    }

    if (this.ctx.fx.length) {
      parts.push('\nFX:');
      for (const f of this.ctx.fx) {
        parts.push(`  ${f.pair}: ${f.rate} (${fmt(f.changePercent)})`);
      }
    }

    if (this.ctx.bonds.length) {
      parts.push('\nTreasury Yields:');
      for (const b of this.ctx.bonds) {
        parts.push(`  ${b.label}: ${b.yield}% (chg: ${b.change >= 0 ? '+' : ''}${b.change.toFixed(3)})`);
      }
    }

    if (this.ctx.commodities.length) {
      parts.push('\nCommodities:');
      for (const c of this.ctx.commodities) {
        parts.push(`  ${c.name}: $${c.price.toFixed(2)} (${fmt(c.changePercent)})`);
      }
    }

    if (this.ctx.crypto.length) {
      parts.push('\nCrypto:');
      for (const q of this.ctx.crypto) {
        parts.push(`  ${q.symbol}: $${q.price.toFixed(2)} (${fmt(q.changePercent)})`);
      }
    }

    if (this.ctx.vix) {
      parts.push(`\nVIX: ${this.ctx.vix.price.toFixed(2)} (${fmt(this.ctx.vix.changePercent)})`);
    }

    if (this.ctx.macro.length) {
      parts.push('\nMacro Indicators:');
      for (const m of this.ctx.macro) {
        parts.push(`  ${m.name}: ${m.value} ${m.unit} (${m.date})`);
      }
    }

    if (this.ctx.centralBanks.length) {
      parts.push('\nCentral Bank Rates:');
      for (const cb of this.ctx.centralBanks) {
        parts.push(`  ${cb.code}: ${cb.rate}% (${cb.direction}, last change ${cb.lastChange})`);
      }
    }

    if (this.ctx.watchlistQuotes.length) {
      parts.push('\nWatchlist:');
      for (const q of this.ctx.watchlistQuotes) {
        parts.push(`  ${q.symbol}: $${q.price.toFixed(2)} (${fmt(q.changePercent)})`);
      }
    }

    if (this.ctx.news.length) {
      parts.push('\nTop Headlines:');
      for (const n of this.ctx.news.slice(0, 10)) {
        parts.push(`  - ${n.headline} (${n.source})`);
      }
    }

    if (this.ctx.earnings.length) {
      const upcoming = this.ctx.earnings.filter(e => new Date(e.date) >= new Date()).slice(0, 5);
      if (upcoming.length) {
        parts.push('\nUpcoming Earnings:');
        for (const e of upcoming) {
          parts.push(`  ${e.symbol} — ${e.date}${e.epsEstimate != null ? ` (est EPS: $${e.epsEstimate})` : ''}`);
        }
      }
    }

    return parts.join('\n');
  }

  destroy(): void {
    this.header?.destroy();
    this.ctx.map?.destroy();
    for (const [, panel] of this.ctx.panels) {
      panel.destroy();
    }
  }
}
