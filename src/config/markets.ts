export const INDEX_SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: '^GSPC',  name: 'S&P 500' },
  { symbol: '^DJI',   name: 'Dow Jones' },
  { symbol: '^IXIC',  name: 'NASDAQ' },
  { symbol: '^FTSE',  name: 'FTSE 100' },
  { symbol: '^N225',  name: 'Nikkei 225' },
  { symbol: '^GDAXI', name: 'DAX' },
  { symbol: '^HSI',   name: 'Hang Seng' },
  { symbol: 'DX-Y.NYB', name: 'US Dollar Index' },
];

export const TOP_STOCKS: { symbol: string; name: string }[] = [
  { symbol: 'AAPL',  name: 'Apple' },
  { symbol: 'MSFT',  name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN',  name: 'Amazon' },
  { symbol: 'NVDA',  name: 'NVIDIA' },
  { symbol: 'META',  name: 'Meta Platforms' },
  { symbol: 'TSLA',  name: 'Tesla' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway' },
  { symbol: 'JPM',   name: 'JPMorgan Chase' },
  { symbol: 'V',     name: 'Visa' },
  { symbol: 'UNH',   name: 'UnitedHealth' },
  { symbol: 'JNJ',   name: 'Johnson & Johnson' },
  { symbol: 'WMT',   name: 'Walmart' },
  { symbol: 'PG',    name: 'Procter & Gamble' },
  { symbol: 'MA',    name: 'Mastercard' },
  { symbol: 'HD',    name: 'Home Depot' },
  { symbol: 'XOM',   name: 'Exxon Mobil' },
  { symbol: 'BAC',   name: 'Bank of America' },
  { symbol: 'PFE',   name: 'Pfizer' },
  { symbol: 'COST',  name: 'Costco' },
];

export const SECTOR_ETFS: { symbol: string; name: string }[] = [
  { symbol: 'XLK',  name: 'Technology' },
  { symbol: 'XLF',  name: 'Financials' },
  { symbol: 'XLE',  name: 'Energy' },
  { symbol: 'XLV',  name: 'Healthcare' },
  { symbol: 'XLI',  name: 'Industrials' },
  { symbol: 'XLY',  name: 'Consumer Discretionary' },
  { symbol: 'XLP',  name: 'Consumer Staples' },
  { symbol: 'XLRE', name: 'Real Estate' },
  { symbol: 'XLB',  name: 'Materials' },
  { symbol: 'XLU',  name: 'Utilities' },
  { symbol: 'XLC',  name: 'Communications' },
];

export const FX_PAIRS: { pair: string; from: string; to: string }[] = [
  { pair: 'EUR/USD', from: 'EUR', to: 'USD' },
  { pair: 'GBP/USD', from: 'GBP', to: 'USD' },
  { pair: 'USD/JPY', from: 'USD', to: 'JPY' },
  { pair: 'USD/CHF', from: 'USD', to: 'CHF' },
  { pair: 'AUD/USD', from: 'AUD', to: 'USD' },
  { pair: 'USD/CAD', from: 'USD', to: 'CAD' },
  { pair: 'NZD/USD', from: 'NZD', to: 'USD' },
];

export const COMMODITY_SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: 'CL=F', name: 'WTI Crude' },
  { symbol: 'BZ=F', name: 'Brent Crude' },
  { symbol: 'GC=F', name: 'Gold' },
  { symbol: 'SI=F', name: 'Silver' },
  { symbol: 'HG=F', name: 'Copper' },
  { symbol: 'NG=F', name: 'Natural Gas' },
];

export const CRYPTO_SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: 'BTC-USD', name: 'Bitcoin' },
  { symbol: 'ETH-USD', name: 'Ethereum' },
  { symbol: 'SOL-USD', name: 'Solana' },
  { symbol: 'XRP-USD', name: 'XRP' },
];

export const VOLATILITY_SYMBOLS: { symbol: string; name: string }[] = [
  { symbol: '^VIX', name: 'CBOE VIX' },
  { symbol: '^VIX9D', name: 'VIX 9-Day' },
  { symbol: '^VVIX', name: 'VIX of VIX' },
];

// === THESIS: Private Credit Crisis ===
// BDCs, leveraged loan ETFs, high yield, alt managers with credit exposure
export const CREDIT_STRESS_SYMBOLS: { symbol: string; name: string; thesis: string }[] = [
  // BDCs (Business Development Companies) — canaries in the coal mine
  { symbol: 'ARCC', name: 'Ares Capital',         thesis: 'Largest BDC — direct lending to middle market' },
  { symbol: 'MAIN', name: 'Main Street Capital',   thesis: 'Lower middle-market loans — first to feel defaults' },
  { symbol: 'BXSL', name: 'Blackstone Secured',    thesis: 'BX private credit vehicle — massive AUM' },
  { symbol: 'FSK',  name: 'FS KKR Capital',        thesis: 'KKR-managed BDC — leveraged loan exposure' },
  { symbol: 'PSEC', name: 'Prospect Capital',      thesis: 'Aggressive BDC — high-risk book' },
  // High Yield & Leveraged Loans
  { symbol: 'HYG',  name: 'iShares HY Bond',       thesis: 'High yield corporate bonds — spread blowout signal' },
  { symbol: 'JNK',  name: 'SPDR Junk Bonds',       thesis: 'Junk bond ETF — credit stress barometer' },
  { symbol: 'BKLN', name: 'Invesco Senior Loans',   thesis: 'Leveraged loan ETF — CLO collateral' },
  { symbol: 'SRLN', name: 'SPDR Senior Loans',      thesis: 'Floating rate loans — rate sensitivity' },
  // Alt Managers with private credit exposure
  { symbol: 'BX',   name: 'Blackstone',             thesis: 'Largest alt manager — BCRED is $70B+ private credit' },
  { symbol: 'KKR',  name: 'KKR & Co',               thesis: 'Private credit AUM growing fast — leveraged' },
  { symbol: 'APO',  name: 'Apollo Global',           thesis: 'Athene + private credit = massive duration risk' },
  { symbol: 'ARES', name: 'Ares Management',         thesis: 'Pure-play credit manager — $400B+ AUM' },
  { symbol: 'OWL',  name: 'Blue Owl Capital',        thesis: 'Direct lending + GP stakes — illiquid' },
];

// === THESIS: AI Capex Bubble — overspend vs. who survives ===
export const AI_CAPEX_SYMBOLS: { symbol: string; name: string; thesis: string; camp: 'spender' | 'pick-shovel' | 'winner' }[] = [
  // Hyperscaler spenders — capex way too high relative to AI revenue
  { symbol: 'MSFT',  name: 'Microsoft',    thesis: '$80B+ capex — Azure AI monetization unproven at scale',  camp: 'spender' },
  { symbol: 'GOOGL', name: 'Alphabet',     thesis: '$75B capex — Gemini losing to Claude, search moat eroding', camp: 'spender' },
  { symbol: 'META',  name: 'Meta',         thesis: '$65B capex — Llama open-source = no moat, Reality Labs burn', camp: 'spender' },
  { symbol: 'AMZN',  name: 'Amazon',       thesis: '$100B+ capex — AWS margins under pressure, Anthropic investor', camp: 'spender' },
  { symbol: 'ORCL',  name: 'Oracle',       thesis: 'Gen2 cloud capex surge — late to the game',              camp: 'spender' },
  // Pick & shovel — overvalued if capex cycle turns
  { symbol: 'NVDA',  name: 'NVIDIA',       thesis: 'Priced for $200B+ data center — what if orders slow?',   camp: 'pick-shovel' },
  { symbol: 'AMD',   name: 'AMD',          thesis: 'MI300 gaining share but NVDA ecosystem lock-in',         camp: 'pick-shovel' },
  { symbol: 'AVGO',  name: 'Broadcom',     thesis: 'Custom AI chips for Google/Meta — tied to their spend',  camp: 'pick-shovel' },
  { symbol: 'SMCI',  name: 'Super Micro',  thesis: 'AI server assembly — commodity margins, accounting risk', camp: 'pick-shovel' },
  { symbol: 'VRT',   name: 'Vertiv',       thesis: 'Power/cooling for data centers — capex derivative',      camp: 'pick-shovel' },
  // Winners — Claude prevails, Anthropic ecosystem
  { symbol: 'AMZN',  name: 'Amazon (Anthropic)',  thesis: 'Largest Anthropic investor — Claude on Bedrock', camp: 'winner' },
  { symbol: 'GOOGL', name: 'Alphabet (Anthropic)', thesis: 'Early Anthropic investor — hedged bet',        camp: 'winner' },
  { symbol: 'PLTR',  name: 'Palantir',     thesis: 'AI platform play — benefits from Claude integration',    camp: 'winner' },
  { symbol: 'CRM',   name: 'Salesforce',   thesis: 'Agentforce using Claude — enterprise AI distribution',   camp: 'winner' },
  { symbol: 'SNOW',  name: 'Snowflake',    thesis: 'Data cloud + Cortex AI — Claude partnership potential',  camp: 'winner' },
];

export const BOND_SERIES: { seriesId: string; label: string }[] = [
  { seriesId: 'DGS1MO', label: '1M' },
  { seriesId: 'DGS3MO', label: '3M' },
  { seriesId: 'DGS6MO', label: '6M' },
  { seriesId: 'DGS1',   label: '1Y' },
  { seriesId: 'DGS2',   label: '2Y' },
  { seriesId: 'DGS5',   label: '5Y' },
  { seriesId: 'DGS10',  label: '10Y' },
  { seriesId: 'DGS30',  label: '30Y' },
  { seriesId: 'T10Y2Y', label: '10Y-2Y Spread' },
  { seriesId: 'T10Y3M', label: '10Y-3M Spread' },
];

export const MACRO_SERIES: { seriesId: string; name: string; unit: string; category: string }[] = [
  // Rates & Monetary Policy
  { seriesId: 'FEDFUNDS', name: 'Fed Funds Rate',       unit: '%',     category: 'rates' },
  { seriesId: 'DGS10',    name: '10Y Treasury',         unit: '%',     category: 'rates' },
  { seriesId: 'DGS2',     name: '2Y Treasury',          unit: '%',     category: 'rates' },
  { seriesId: 'T10Y2Y',   name: '10Y-2Y Spread',       unit: '%',     category: 'rates' },
  { seriesId: 'DFII10',   name: '10Y TIPS (Real)',      unit: '%',     category: 'rates' },
  { seriesId: 'BAMLH0A0HYM2', name: 'HY OAS Spread',   unit: '%',     category: 'credit' },

  // Inflation & Prices
  { seriesId: 'CPIAUCSL', name: 'CPI',                  unit: 'index', category: 'prices' },
  { seriesId: 'PCEPILFE', name: 'Core PCE',             unit: 'index', category: 'prices' },
  { seriesId: 'CSUSHPISA', name: 'Case-Shiller Home',   unit: 'index', category: 'prices' },

  // Labor
  { seriesId: 'UNRATE',   name: 'Unemployment Rate',    unit: '%',     category: 'employment' },
  { seriesId: 'ICSA',     name: 'Initial Jobless Claims', unit: 'K',   category: 'employment' },

  // Output & Activity
  { seriesId: 'GDP',      name: 'GDP',                  unit: '$B',    category: 'output' },
  { seriesId: 'INDPRO',   name: 'Industrial Production', unit: 'index', category: 'output' },
  { seriesId: 'RSAFS',    name: 'Retail Sales',         unit: '$M',    category: 'output' },

  // Money & Balance Sheet
  { seriesId: 'WALCL',    name: 'Fed Balance Sheet',    unit: '$M',    category: 'monetary' },
  { seriesId: 'M2SL',     name: 'M2 Money Supply',      unit: '$B',    category: 'monetary' },
  { seriesId: 'BOGMBASE', name: 'Monetary Base',        unit: '$B',    category: 'monetary' },

  // FX & Trade
  { seriesId: 'DTWEXBGS', name: 'USD Index (Broad)',    unit: 'index', category: 'fx' },
];
