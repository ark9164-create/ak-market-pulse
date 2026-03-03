import { CircuitBreaker } from './circuit-breaker';

const BASE_URL = 'https://www.alphavantage.co/query';
const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY as string;

interface QuoteResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

interface FXRateResult {
  from: string;
  to: string;
  rate: number;
  bidPrice: number;
  askPrice: number;
}

interface EconomicIndicatorResult {
  name: string;
  data: { date: string; value: string }[];
}

const quoteBreaker = new CircuitBreaker<QuoteResult>({
  maxFailures: 3,
  cooldownMs: 60_000,
  name: 'alpha-vantage-quote',
});

const fxBreaker = new CircuitBreaker<FXRateResult>({
  maxFailures: 3,
  cooldownMs: 60_000,
  name: 'alpha-vantage-fx',
});

const economicBreaker = new CircuitBreaker<EconomicIndicatorResult>({
  maxFailures: 3,
  cooldownMs: 60_000,
  name: 'alpha-vantage-economic',
});

function checkRateLimit(data: Record<string, unknown>): void {
  if (data['Note'] || data['Information']) {
    const message = (data['Note'] || data['Information']) as string;
    if (message.toLowerCase().includes('api call frequency') || message.toLowerCase().includes('rate limit')) {
      throw new Error(`Alpha Vantage rate limit reached: ${message}`);
    }
  }
}

export async function fetchQuote(symbol: string): Promise<QuoteResult> {
  return quoteBreaker.execute(async () => {
    const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Alpha Vantage quote request failed: ${response.status}`);
    }

    const data = await response.json();
    checkRateLimit(data);

    const quote = data['Global Quote'];
    if (!quote) {
      throw new Error(`No quote data returned for ${symbol}`);
    }

    return {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent']?.replace('%', '') || '0'),
      volume: parseInt(quote['06. volume'], 10),
    };
  });
}

export async function fetchFXRate(from: string, to: string): Promise<FXRateResult> {
  return fxBreaker.execute(async () => {
    const url = `${BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=${encodeURIComponent(from)}&to_currency=${encodeURIComponent(to)}&apikey=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Alpha Vantage FX request failed: ${response.status}`);
    }

    const data = await response.json();
    checkRateLimit(data);

    const rate = data['Realtime Currency Exchange Rate'];
    if (!rate) {
      throw new Error(`No FX rate data returned for ${from}/${to}`);
    }

    return {
      from: rate['1. From_Currency Code'],
      to: rate['3. To_Currency Code'],
      rate: parseFloat(rate['5. Exchange Rate']),
      bidPrice: parseFloat(rate['8. Bid Price']),
      askPrice: parseFloat(rate['9. Ask Price']),
    };
  });
}

export async function fetchEconomicIndicator(
  fn: string,
  interval?: string
): Promise<EconomicIndicatorResult> {
  return economicBreaker.execute(async () => {
    let url = `${BASE_URL}?function=${encodeURIComponent(fn)}&apikey=${API_KEY}`;
    if (interval) {
      url += `&interval=${encodeURIComponent(interval)}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Alpha Vantage economic indicator request failed: ${response.status}`);
    }

    const data = await response.json();
    checkRateLimit(data);

    const name = data['name'] || fn;
    const rawData = data['data'] || [];

    return {
      name,
      data: rawData.map((entry: { date: string; value: string }) => ({
        date: entry.date,
        value: entry.value,
      })),
    };
  });
}
