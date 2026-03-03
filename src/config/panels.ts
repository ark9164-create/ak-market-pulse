export interface PanelDef {
  id: string;
  title: string;
  enabled: boolean;
  priority: number;
  colSpan: number;
}

export const PANEL_DEFS: PanelDef[] = [
  { id: 'indices',      title: 'Indices',        enabled: true, priority: 1,  colSpan: 1 },
  { id: 'markets',      title: 'Markets',        enabled: true, priority: 2,  colSpan: 1 },
  { id: 'heatmap',      title: 'Heatmap',        enabled: true, priority: 3,  colSpan: 2 },
  { id: 'fx',           title: 'FX',             enabled: true, priority: 4,  colSpan: 1 },
  { id: 'bonds',        title: 'Bonds',          enabled: true, priority: 5,  colSpan: 1 },
  { id: 'commodities',  title: 'Commodities',    enabled: true, priority: 6,  colSpan: 1 },
  { id: 'crypto',       title: 'Crypto',         enabled: true, priority: 7,  colSpan: 1 },
  { id: 'macro',        title: 'Macro',          enabled: true, priority: 8,  colSpan: 1 },
  { id: 'earnings',     title: 'Earnings',       enabled: true, priority: 9,  colSpan: 1 },
  { id: 'news',         title: 'News',           enabled: true, priority: 10, colSpan: 2 },
  { id: 'ipo',          title: 'IPO',            enabled: true, priority: 11, colSpan: 1 },
  { id: 'centralBanks', title: 'Central Banks',  enabled: true, priority: 12, colSpan: 1 },
  { id: 'copilot',      title: 'Copilot',        enabled: true, priority: 13, colSpan: 1 },
  { id: 'header',       title: 'Header',         enabled: true, priority: 14, colSpan: 1 },
];
