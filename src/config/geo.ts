export type ExchangeTier = 'mega' | 'major' | 'emerging';

export interface StockExchange {
  name: string;
  lat: number;
  lon: number;
  tier: ExchangeTier;
}

export interface FinancialCenter {
  name: string;
  lat: number;
  lon: number;
  gfciRank: number;
}

export interface CentralBank {
  name: string;
  code: string;
  lat: number;
  lon: number;
  currency: string;
}

export interface CommodityHub {
  name: string;
  lat: number;
  lon: number;
  type: string;
}

export const STOCK_EXCHANGES: StockExchange[] = [
  // Mega
  { name: 'NYSE',           lat: 40.7069,  lon: -74.0113, tier: 'mega' },
  { name: 'NASDAQ',         lat: 40.7570,  lon: -73.9720, tier: 'mega' },
  { name: 'LSE',            lat: 51.5155,  lon: -0.0922,  tier: 'mega' },
  { name: 'TSE',            lat: 35.6809,  lon: 139.7731, tier: 'mega' },
  { name: 'SSE',            lat: 31.2330,  lon: 121.4695, tier: 'mega' },
  { name: 'HKEX',           lat: 22.2861,  lon: 114.1580, tier: 'mega' },
  // Major
  { name: 'Euronext Paris', lat: 48.8698,  lon: 2.3371,   tier: 'major' },
  { name: 'Deutsche Börse', lat: 50.1109,  lon: 8.6821,   tier: 'major' },
  { name: 'BSE Mumbai',     lat: 18.9300,  lon: 72.8347,  tier: 'major' },
  { name: 'TSX Toronto',    lat: 43.6490,  lon: -79.3806, tier: 'major' },
  { name: 'ASX Sydney',     lat: -33.8688, lon: 151.2093, tier: 'major' },
  { name: 'JSE Johannesburg', lat: -26.2041, lon: 28.0473, tier: 'major' },
  { name: 'SGX Singapore',  lat: 1.2800,   lon: 103.8545, tier: 'major' },
  { name: 'KRX Seoul',      lat: 37.5665,  lon: 126.9780, tier: 'major' },
  // Emerging
  { name: 'B3 São Paulo',   lat: -23.5505, lon: -46.6333, tier: 'emerging' },
  { name: 'BMV Mexico',     lat: 19.4326,  lon: -99.1332, tier: 'emerging' },
  { name: 'Tadawul Riyadh', lat: 24.7136,  lon: 46.6753,  tier: 'emerging' },
  { name: 'NSE Nigeria',    lat: 6.4541,   lon: 3.4084,   tier: 'emerging' },
  { name: 'NSE India',      lat: 19.0760,  lon: 72.8777,  tier: 'emerging' },
  { name: 'MOEX Moscow',    lat: 55.7558,  lon: 37.6173,  tier: 'emerging' },
  { name: 'SET Bangkok',    lat: 13.7563,  lon: 100.5018, tier: 'emerging' },
  { name: 'IDX Jakarta',    lat: -6.2088,  lon: 106.8456, tier: 'emerging' },
  { name: 'Bursa Malaysia', lat: 3.1390,   lon: 101.6869, tier: 'emerging' },
  { name: 'PSE Philippines', lat: 14.5547, lon: 121.0244, tier: 'emerging' },
  { name: 'TWSE Taiwan',    lat: 25.0330,  lon: 121.5654, tier: 'emerging' },
  { name: 'NZX Wellington', lat: -41.2865, lon: 174.7762, tier: 'emerging' },
  { name: 'WSE Warsaw',     lat: 52.2297,  lon: 21.0122,  tier: 'emerging' },
];

export const FINANCIAL_CENTERS: FinancialCenter[] = [
  { name: 'New York',      lat: 40.7128,  lon: -74.0060, gfciRank: 1 },
  { name: 'London',        lat: 51.5074,  lon: -0.1278,  gfciRank: 2 },
  { name: 'Singapore',     lat: 1.3521,   lon: 103.8198, gfciRank: 3 },
  { name: 'Hong Kong',     lat: 22.3193,  lon: 114.1694, gfciRank: 4 },
  { name: 'San Francisco', lat: 37.7749,  lon: -122.4194, gfciRank: 5 },
  { name: 'Shanghai',      lat: 31.2304,  lon: 121.4737, gfciRank: 6 },
  { name: 'Tokyo',         lat: 35.6762,  lon: 139.6503, gfciRank: 7 },
  { name: 'Sydney',        lat: -33.8688, lon: 151.2093, gfciRank: 8 },
  { name: 'Chicago',       lat: 41.8781,  lon: -87.6298, gfciRank: 9 },
  { name: 'Frankfurt',     lat: 50.1109,  lon: 8.6821,   gfciRank: 10 },
  { name: 'Zurich',        lat: 47.3769,  lon: 8.5417,   gfciRank: 11 },
  { name: 'Seoul',         lat: 37.5665,  lon: 126.9780, gfciRank: 12 },
  { name: 'Dubai',         lat: 25.2048,  lon: 55.2708,  gfciRank: 13 },
  { name: 'Toronto',       lat: 43.6532,  lon: -79.3832, gfciRank: 14 },
  { name: 'Boston',        lat: 42.3601,  lon: -71.0589, gfciRank: 15 },
  { name: 'Paris',         lat: 48.8566,  lon: 2.3522,   gfciRank: 16 },
  { name: 'Munich',        lat: 48.1351,  lon: 11.5820,  gfciRank: 17 },
  { name: 'Luxembourg',    lat: 49.6116,  lon: 6.1300,   gfciRank: 18 },
  { name: 'São Paulo',     lat: -23.5505, lon: -46.6333, gfciRank: 19 },
];

export const CENTRAL_BANKS: CentralBank[] = [
  { name: 'Federal Reserve',          code: 'Fed',  lat: 38.8929,  lon: -77.0452,  currency: 'USD' },
  { name: 'European Central Bank',    code: 'ECB',  lat: 50.1109,  lon: 8.6821,    currency: 'EUR' },
  { name: 'Bank of Japan',            code: 'BoJ',  lat: 35.6856,  lon: 139.7507,  currency: 'JPY' },
  { name: 'Bank of England',          code: 'BoE',  lat: 51.5142,  lon: -0.0885,   currency: 'GBP' },
  { name: "People's Bank of China",   code: 'PBoC', lat: 39.9042,  lon: 116.4074,  currency: 'CNY' },
  { name: 'Swiss National Bank',      code: 'SNB',  lat: 46.9480,  lon: 7.4474,    currency: 'CHF' },
  { name: 'Reserve Bank of Australia', code: 'RBA', lat: -33.8688, lon: 151.2093,  currency: 'AUD' },
  { name: 'Bank of Canada',           code: 'BoC',  lat: 45.4215,  lon: -75.6972,  currency: 'CAD' },
  { name: 'Reserve Bank of India',    code: 'RBI',  lat: 18.9388,  lon: 72.8354,   currency: 'INR' },
  { name: 'Central Bank of Brazil',   code: 'BCB',  lat: -15.7939, lon: -47.8828,  currency: 'BRL' },
  { name: 'Bank of Korea',            code: 'BoK',  lat: 37.5607,  lon: 126.9819,  currency: 'KRW' },
  { name: 'Central Bank of Russia',   code: 'CBR',  lat: 55.7558,  lon: 37.6173,   currency: 'RUB' },
  { name: 'Riksbank',                 code: 'Riksbank', lat: 59.3293, lon: 18.0686, currency: 'SEK' },
  { name: 'Norges Bank',              code: 'Norges Bank', lat: 59.9139, lon: 10.7522, currency: 'NOK' },
];

export const COMMODITY_HUBS: CommodityHub[] = [
  { name: 'NYMEX New York',   lat: 40.7128,  lon: -74.0060,  type: 'energy' },
  { name: 'ICE London',       lat: 51.5155,  lon: -0.0922,   type: 'energy' },
  { name: 'CME Chicago',      lat: 41.8819,  lon: -87.6278,  type: 'grains' },
  { name: 'COMEX New York',   lat: 40.7128,  lon: -74.0060,  type: 'metals' },
  { name: 'LME London',       lat: 51.5128,  lon: -0.0830,   type: 'metals' },
  { name: 'TOCOM Tokyo',      lat: 35.6762,  lon: 139.6503,  type: 'metals' },
  { name: 'DCE Dalian',       lat: 38.9140,  lon: 121.6147,  type: 'grains' },
  { name: 'MCX Mumbai',       lat: 19.0760,  lon: 72.8777,   type: 'metals' },
  { name: 'DME Dubai',        lat: 25.2048,  lon: 55.2708,   type: 'energy' },
  { name: 'SGX Singapore',    lat: 1.2800,   lon: 103.8545,  type: 'rubber' },
];
