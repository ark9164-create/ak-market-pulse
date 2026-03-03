import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ScatterplotLayer } from '@deck.gl/layers';
import {
  STOCK_EXCHANGES,
  FINANCIAL_CENTERS,
  CENTRAL_BANKS,
  COMMODITY_HUBS,
  type StockExchange,
  type FinancialCenter,
  type CentralBank,
  type CommodityHub,
} from '@/config/geo';
import { MapPopup } from './MapPopup';
import type { AppContext } from '@/app/app-context';

const TIER_RADIUS: Record<string, number> = { mega: 8, major: 5, emerging: 3 };
const TIER_COLOR: Record<string, [number, number, number]> = {
  mega: [68, 138, 255],    // #448aff
  major: [255, 193, 7],    // #ffc107
  emerging: [102, 187, 106], // #66bb6a
};
const FINANCIAL_CENTER_COLOR: [number, number, number] = [179, 136, 255]; // #b388ff
const CENTRAL_BANK_COLOR: [number, number, number] = [255, 145, 0];      // #ff9100
const COMMODITY_HUB_COLOR: [number, number, number] = [255, 213, 79];    // #ffd54f

const BASE_RADIUS = 4000;
const PIXEL_RATIO = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

const LAYER_META: { id: string; label: string }[] = [
  { id: 'stockExchanges', label: 'Exchanges' },
  { id: 'financialCenters', label: 'Centers' },
  { id: 'centralBanks', label: 'Banks' },
  { id: 'commodityHubs', label: 'Commodities' },
];

export class DeckGLMap {
  private map: maplibregl.Map;
  private overlay: MapboxOverlay;
  private popup: MapPopup;
  private layerVisibility: Record<string, boolean> = {};
  private controlContainer: HTMLDivElement;

  constructor(container: HTMLElement, private ctx: AppContext) {
    // All layers visible by default
    for (const meta of LAYER_META) {
      this.layerVisibility[meta.id] = true;
    }

    this.popup = new MapPopup(container);

    this.map = new maplibregl.Map({
      container,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [0, 20],
      zoom: 1.5,
      pitch: 0,
      attributionControl: false,
    });

    this.overlay = new MapboxOverlay({
      layers: this.buildLayers(),
    });

    this.map.on('load', () => {
      this.map.addControl(this.overlay as any);
    });

    // Layer toggle controls
    this.controlContainer = document.createElement('div');
    this.controlContainer.className = 'map-layer-controls';
    this.controlContainer.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      z-index: 10;
    `;

    for (const meta of LAYER_META) {
      const btn = document.createElement('button');
      btn.textContent = meta.label;
      btn.dataset.layerId = meta.id;
      btn.style.cssText = `
        background: rgba(30, 30, 40, 0.85);
        color: #e0e0e0;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 4px;
        padding: 4px 10px;
        font-size: 11px;
        cursor: pointer;
        text-align: left;
        opacity: 1;
      `;
      btn.addEventListener('click', () => {
        this.toggleLayer(meta.id);
        btn.style.opacity = this.layerVisibility[meta.id] ? '1' : '0.4';
      });
      this.controlContainer.appendChild(btn);
    }

    container.style.position = container.style.position || 'relative';
    container.appendChild(this.controlContainer);
  }

  // ------- Public API -------

  toggleLayer(layerId: string): void {
    if (layerId in this.layerVisibility) {
      this.layerVisibility[layerId] = !this.layerVisibility[layerId];
      this.updateOverlay();
    }
  }

  getVisibleLayers(): string[] {
    return Object.entries(this.layerVisibility)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }

  flyTo(center: [number, number], zoom?: number): void {
    this.map.flyTo({ center, zoom: zoom ?? this.map.getZoom(), essential: true });
  }

  destroy(): void {
    this.map.remove();
    this.controlContainer.remove();
  }

  // ------- Private helpers -------

  private handleHover(info: any, html: string): void {
    if (info.object) {
      this.popup.show(info.x, info.y, html);
    } else {
      this.popup.hide();
    }
  }

  private buildLayers(): any[] {
    const layers: any[] = [];

    if (this.layerVisibility['stockExchanges']) {
      layers.push(
        new ScatterplotLayer<StockExchange>({
          id: 'stockExchanges',
          data: STOCK_EXCHANGES,
          getPosition: (d) => [d.lon, d.lat],
          getRadius: (d) => TIER_RADIUS[d.tier] * BASE_RADIUS,
          getFillColor: (d) => TIER_COLOR[d.tier] ?? [200, 200, 200],
          radiusMinPixels: 3,
          radiusMaxPixels: 20,
          pickable: true,
          onHover: (info: any) => {
            const d = info.object as StockExchange | undefined;
            this.handleHover(
              info,
              d ? `<strong>${d.name}</strong><br/>Tier: ${d.tier}` : '',
            );
          },
        }),
      );
    }

    if (this.layerVisibility['financialCenters']) {
      layers.push(
        new ScatterplotLayer<FinancialCenter>({
          id: 'financialCenters',
          data: FINANCIAL_CENTERS,
          getPosition: (d) => [d.lon, d.lat],
          getRadius: (d) => Math.max(2, 20 - d.gfciRank) * BASE_RADIUS * 0.4,
          getFillColor: FINANCIAL_CENTER_COLOR,
          radiusMinPixels: 2,
          radiusMaxPixels: 18,
          pickable: true,
          onHover: (info: any) => {
            const d = info.object as FinancialCenter | undefined;
            this.handleHover(
              info,
              d ? `<strong>${d.name}</strong><br/>GFCI Rank: #${d.gfciRank}` : '',
            );
          },
        }),
      );
    }

    if (this.layerVisibility['centralBanks']) {
      layers.push(
        new ScatterplotLayer<CentralBank>({
          id: 'centralBanks',
          data: CENTRAL_BANKS,
          getPosition: (d) => [d.lon, d.lat],
          getRadius: 6 * PIXEL_RATIO * BASE_RADIUS * 0.5,
          getFillColor: CENTRAL_BANK_COLOR,
          radiusMinPixels: 4,
          radiusMaxPixels: 14,
          pickable: true,
          onHover: (info: any) => {
            const d = info.object as CentralBank | undefined;
            this.handleHover(
              info,
              d ? `<strong>${d.name}</strong><br/>Currency: ${d.currency}` : '',
            );
          },
        }),
      );
    }

    if (this.layerVisibility['commodityHubs']) {
      layers.push(
        new ScatterplotLayer<CommodityHub>({
          id: 'commodityHubs',
          data: COMMODITY_HUBS,
          getPosition: (d) => [d.lon, d.lat],
          getRadius: 5 * PIXEL_RATIO * BASE_RADIUS * 0.5,
          getFillColor: COMMODITY_HUB_COLOR,
          radiusMinPixels: 3,
          radiusMaxPixels: 12,
          pickable: true,
          onHover: (info: any) => {
            const d = info.object as CommodityHub | undefined;
            this.handleHover(
              info,
              d ? `<strong>${d.name}</strong><br/>Type: ${d.type}` : '',
            );
          },
        }),
      );
    }

    return layers;
  }

  private updateOverlay(): void {
    this.overlay.setProps({ layers: this.buildLayers() });
  }
}
