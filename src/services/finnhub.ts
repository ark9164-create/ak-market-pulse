import { CircuitBreaker } from './circuit-breaker';

const BASE_URL = 'https://finnhub.io/api/v1';
const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string;

interface FinnhubQuote {
  symbol: string;
  current: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

interface CompanyNewsItem {
  id: number;
  headline: string;
  source: string;
  url: string;
  datetime: number;
  summary: string;
}

interface EarningsEntry {
  symbol: string;
  date: string;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  revenueActual: number | null;
}

interface IPOEntry {
  name: string;
  symbol: string;
  date: string;
  exchange: string;
  price: string | null;
  numberOfShares: number | null;
  totalValue: number | null;
  status: string;
}

const quoteBreaker = new CircuitBreaker<FinnhubQuote>({
  maxFailures: 3,
  cooldownMs: 60_000,
  name: 'finnhub-quote',
});

const newsBreaker = new CircuitBreaker<CompanyNewsItem[]>({
  maxFailures: 3,
  cooldownMs: 60_000,
  name: 'finnhub-news',
});

const earningsBreaker = new CircuitBreaker<EarningsEntry[]>({
  maxFailures: 3,
  cooldownMs: 60_000,
  name: 'finnhub-earnings',
});

const ipoBreaker = new CircuitBreaker<IPOEntry[]>({
  maxFailures: 3,
  cooldownMs: 60_000,
  name: 'finnhub-ipo',
});

export async function fetchQuote(symbol: string): Promise<FinnhubQuote> {
  return quoteBreaker.execute(async () => {
    const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Finnhub quote request failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      symbol,
      current: data.c,
      change: data.d,
      percentChange: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      previousClose: data.pc,
    };
  });
}

export async function fetchCompanyNews(
  symbol: string,
  from: string,
  to: string
): Promise<CompanyNewsItem[]> {
  return newsBreaker.execute(async () => {
    const url = `${BASE_URL}/company-news?symbol=${encodeURIComponent(symbol)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&token=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Finnhub company news request failed: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      console.warn('Finnhub company news returned unexpected format');
      return [];
    }

    return data.map((item: Record<string, unknown>) => ({
      id: item.id as number,
      headline: item.headline as string,
      source: item.source as string,
      url: item.url as string,
      datetime: item.datetime as number,
      summary: item.summary as string,
    }));
  });
}

export async function fetchEarningsCalendar(
  from: string,
  to: string
): Promise<EarningsEntry[]> {
  return earningsBreaker.execute(async () => {
    const url = `${BASE_URL}/calendar/earnings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&token=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Finnhub earnings calendar request failed: ${response.status}`);
    }

    const data = await response.json();
    const earnings = data?.earningsCalendar || [];

    return earnings.map((entry: Record<string, unknown>) => ({
      symbol: entry.symbol as string,
      date: entry.date as string,
      epsEstimate: entry.epsEstimate != null ? Number(entry.epsEstimate) : null,
      epsActual: entry.epsActual != null ? Number(entry.epsActual) : null,
      revenueEstimate: entry.revenueEstimate != null ? Number(entry.revenueEstimate) : null,
      revenueActual: entry.revenueActual != null ? Number(entry.revenueActual) : null,
    }));
  });
}

export async function fetchIPOCalendar(
  from: string,
  to: string
): Promise<IPOEntry[]> {
  return ipoBreaker.execute(async () => {
    const url = `${BASE_URL}/calendar/ipo?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&token=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Finnhub IPO calendar request failed: ${response.status}`);
    }

    const data = await response.json();
    const ipoCalendar = data?.ipoCalendar || [];

    return ipoCalendar
      .filter((entry: Record<string, unknown>) => entry.name && entry.date)
      .map((entry: Record<string, unknown>) => ({
        name: (entry.name as string) ?? 'Unknown',
        symbol: (entry.symbol as string) ?? '',
        date: entry.date as string,
        exchange: (entry.exchange as string) ?? '',
        price: entry.price != null ? String(entry.price) : null,
        numberOfShares: entry.numberOfShares != null ? Number(entry.numberOfShares) : null,
        totalValue: entry.totalSharesValue != null ? Number(entry.totalSharesValue) : null,
        status: (entry.status as string) ?? 'expected',
      }));
  });
}
