import type { Panel } from '@/components/Panel';
import type { DeckGLMap } from '@/components/DeckGLMap';

export interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sparkData?: number[];
  volume?: number;
  marketCap?: number;
}

export interface FXData {
  pair: string;
  rate: number;
  change: number;
  changePercent: number;
  sparkData?: number[];
}

export interface BondData {
  label: string;
  seriesId: string;
  yield: number;
  change: number;
}

export interface MacroData {
  name: string;
  seriesId: string;
  value: number;
  date: string;
  unit: string;
  category?: string;
}

export interface EarningsData {
  symbol: string;
  date: string;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
  surprise: number | null;
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  url: string;
  datetime: number;
  summary?: string;
  category?: string;
}

export interface IPOData {
  name: string;
  symbol: string;
  date: string;
  exchange: string;
  price?: string;
  shares?: number;
  totalValue?: number;
  status: string;
}

export interface CentralBankData {
  name: string;
  code: string;
  rate: number;
  lastChange: string;
  direction: 'up' | 'down' | 'hold';
}

export interface FundamentalsData {
  ticker: string;
  revenue: number;
  netIncome: number;
  eps: number;
  peRatio: number | null;
  totalAssets: number;
  totalDebt: number;
  freeCashFlow: number;
  operatingMargin: number;
  reportPeriod: string;
}

export interface AppContext {
  root: HTMLElement;
  map: DeckGLMap | null;
  panels: Map<string, Panel>;

  // Market data
  indices: QuoteData[];
  stocks: QuoteData[];
  sectorETFs: QuoteData[];
  fx: FXData[];
  bonds: BondData[];
  commodities: QuoteData[];
  crypto: QuoteData[];
  macro: MacroData[];
  earnings: EarningsData[];
  news: NewsItem[];
  ipos: IPOData[];
  centralBanks: CentralBankData[];
  vix: QuoteData | null;
  watchlistQuotes: QuoteData[];
  fundamentals: FundamentalsData[];

  // State
  inFlight: Set<string>;
  isDestroyed: boolean;
}

export function createContext(root: HTMLElement): AppContext {
  return {
    root,
    map: null,
    panels: new Map(),
    indices: [],
    stocks: [],
    sectorETFs: [],
    fx: [],
    bonds: [],
    commodities: [],
    crypto: [],
    macro: [],
    earnings: [],
    news: [],
    ipos: [],
    centralBanks: [],
    vix: null,
    watchlistQuotes: [],
    fundamentals: [],
    inFlight: new Set(),
    isDestroyed: false,
  };
}
