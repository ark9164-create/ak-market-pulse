import { fetchIncomeStatements, fetchBalanceSheets, fetchCashFlowStatements } from '@/services/financial-datasets';
import type { IncomeStatement, BalanceSheet, CashFlowStatement } from '@/services/financial-datasets';

/* ── Types ── */

export interface ChartMeta {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  regularMarketPrice: number;
  chartPreviousClose: number;
  regularMarketVolume: number;
  averageDailyVolume10Day: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  regularMarketOpen: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
}

export interface ChartData {
  timestamps: number[];
  prices: number[];
  volumes: number[];
  meta: ChartMeta;
}

export interface StockFundamentals {
  income: IncomeStatement | null;
  balance: BalanceSheet | null;
  cashFlow: CashFlowStatement | null;
}

/* ── Range → Interval map ── */

const RANGE_INTERVAL: Record<string, string> = {
  '1d': '5m',
  '5d': '15m',
  '1mo': '1d',
  '3mo': '1d',
  '6mo': '1d',
  '1y': '1wk',
  '5y': '1mo',
};

/* ── Fetch chart data from Yahoo ── */

export async function fetchStockChart(symbol: string, range: string): Promise<ChartData> {
  const interval = RANGE_INTERVAL[range] ?? '1d';
  const url = `/yahoo-api/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Yahoo chart request failed: ${response.status}`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  if (!result) {
    throw new Error('No chart data returned');
  }

  const meta = result.meta;
  const quote = result.indicators?.quote?.[0];
  const rawTimestamps: number[] = result.timestamp ?? [];
  const rawCloses: (number | null)[] = quote?.close ?? [];
  const rawVolumes: (number | null)[] = quote?.volume ?? [];

  // Filter out null values, keeping aligned arrays
  const timestamps: number[] = [];
  const prices: number[] = [];
  const volumes: number[] = [];

  for (let i = 0; i < rawTimestamps.length; i++) {
    if (rawCloses[i] != null) {
      timestamps.push(rawTimestamps[i]);
      prices.push(rawCloses[i] as number);
      volumes.push((rawVolumes[i] as number) ?? 0);
    }
  }

  return {
    timestamps,
    prices,
    volumes,
    meta: {
      symbol: meta.symbol ?? symbol,
      shortName: meta.shortName ?? '',
      longName: meta.longName ?? '',
      currency: meta.currency ?? 'USD',
      regularMarketPrice: meta.regularMarketPrice ?? prices[prices.length - 1] ?? 0,
      chartPreviousClose: meta.chartPreviousClose ?? meta.previousClose ?? 0,
      regularMarketVolume: meta.regularMarketVolume ?? 0,
      averageDailyVolume10Day: meta.averageDailyVolume10Day ?? 0,
      marketCap: meta.marketCap ?? 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
      regularMarketOpen: meta.regularMarketOpen ?? 0,
      regularMarketDayHigh: meta.regularMarketDayHigh ?? 0,
      regularMarketDayLow: meta.regularMarketDayLow ?? 0,
    },
  };
}

/* ── Fetch fundamentals from Financial Datasets API ── */

export async function fetchStockFundamentals(symbol: string): Promise<StockFundamentals | null> {
  try {
    const [incomeArr, balanceArr, cashFlowArr] = await Promise.allSettled([
      fetchIncomeStatements(symbol, 'annual', 1),
      fetchBalanceSheets(symbol, 'annual', 1),
      fetchCashFlowStatements(symbol, 'annual', 1),
    ]);

    return {
      income: incomeArr.status === 'fulfilled' && incomeArr.value.length > 0 ? incomeArr.value[0] : null,
      balance: balanceArr.status === 'fulfilled' && balanceArr.value.length > 0 ? balanceArr.value[0] : null,
      cashFlow: cashFlowArr.status === 'fulfilled' && cashFlowArr.value.length > 0 ? cashFlowArr.value[0] : null,
    };
  } catch (err) {
    console.warn('[StockDetail] Fundamentals fetch failed:', err);
    return null;
  }
}
