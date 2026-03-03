import { CircuitBreaker } from './circuit-breaker';

interface YahooQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sparkData?: number[];
  volume?: number;
  marketCap?: number;
}

const quotesBreaker = new CircuitBreaker<YahooQuote[]>({
  maxFailures: 5,
  cooldownMs: 30_000,
  name: 'yahoo-quotes',
});

/**
 * Fetch quotes using Yahoo's v8/finance/chart endpoint (one symbol at a time).
 * This endpoint is more reliable than the deprecated v7/quote bulk endpoint.
 */
async function fetchChart(symbol: string): Promise<YahooQuote | null> {
  try {
    const url = `/yahoo-api/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=5m&includePrePost=false`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const closes: number[] = result.indicators?.quote?.[0]?.close?.filter((v: any) => v != null) ?? [];
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
    const price = meta.regularMarketPrice ?? closes[closes.length - 1] ?? 0;
    const change = price - prevClose;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    return {
      symbol: meta.symbol ?? symbol,
      name: meta.shortName ?? meta.longName ?? symbol,
      price,
      change,
      changePercent,
      sparkData: closes.length > 1 ? closes : undefined,
      volume: meta.regularMarketVolume ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function fetchQuotes(symbols: string[]): Promise<YahooQuote[]> {
  if (symbols.length === 0) return [];

  return quotesBreaker.execute(async () => {
    // Batch in groups of 5 to avoid hammering
    const results: YahooQuote[] = [];
    const batchSize = 5;

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(fetchChart));
      for (const r of batchResults) {
        if (r) results.push(r);
      }
      // Small delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    if (results.length === 0) {
      throw new Error('Yahoo Finance: all quote requests failed');
    }

    return results;
  });
}

export async function fetchSparkData(
  symbols: string[],
  _range = '1d'
): Promise<Map<string, number[]>> {
  // Spark data is already included in fetchChart via closes array,
  // so this just returns what we already have from fetchQuotes.
  // But we can do a dedicated fetch if needed.
  const result = new Map<string, number[]>();

  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (symbol) => {
        const quote = await fetchChart(symbol);
        return { symbol, sparkData: quote?.sparkData };
      })
    );
    for (const { symbol, sparkData } of batchResults) {
      if (sparkData) result.set(symbol, sparkData);
    }
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return result;
}
