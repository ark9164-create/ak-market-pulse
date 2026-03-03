import { CircuitBreaker } from './circuit-breaker';

const BASE_URL = '/fred-api/fred/series/observations';
const API_KEY = import.meta.env.VITE_FRED_API_KEY as string | undefined;

interface FredObservation {
  date: string;
  value: string;
}

interface FredSeriesResult {
  seriesId: string;
  observations: FredObservation[];
}

const seriesBreaker = new CircuitBreaker<FredSeriesResult>({
  maxFailures: 10,
  cooldownMs: 60_000,
  name: 'fred-series',
});

export async function fetchSeries(
  seriesId: string,
  limit: number = 10
): Promise<FredSeriesResult> {
  if (!API_KEY) {
    console.warn(
      '[FRED] No API key found (VITE_FRED_API_KEY). Returning empty data. ' +
      'Get a free key at https://fred.stlouisfed.org/docs/api/api_key.html'
    );
    return { seriesId, observations: [] };
  }

  return seriesBreaker.execute(async () => {
    const params = new URLSearchParams({
      series_id: seriesId,
      limit: String(limit),
      sort_order: 'desc',
      file_type: 'json',
      api_key: API_KEY!,
    });

    const url = `${BASE_URL}?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FRED request failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.error_message) {
      throw new Error(`FRED API error: ${data.error_message}`);
    }

    const observations: FredObservation[] = (data.observations || [])
      .map((obs: Record<string, unknown>) => ({
        date: obs.date as string,
        value: obs.value as string,
      }))
      .filter((obs: FredObservation) => obs.value !== '.');

    return {
      seriesId,
      observations,
    };
  });
}
