# MarketPulse

Real-time financial intelligence dashboard with a 3D globe, 12 live data panels, and an AI analyst copilot.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Vite](https://img.shields.io/badge/Vite-6.0-purple)
![deck.gl](https://img.shields.io/badge/deck.gl-9.1-green)

## Features

- **3D Financial Globe** — Interactive map powered by deck.gl + MapLibre showing 27 stock exchanges, 19 financial centers, 14 central banks, and 10 commodity trading hubs
- **12 Live Data Panels** — Global indices, top stocks, sector heatmap, forex, treasury yields (with yield curve), commodities, crypto, macro indicators, earnings calendar, news feed, IPO calendar, central bank rates
- **AI Analyst Copilot** — Slide-out chat powered by Groq (Llama 3.3 70B) with real-time market context injection
- **Bloomberg Terminal Aesthetic** — Dense, data-rich dark theme with monospace numbers, green/red change indicators, inline sparklines
- **Auto-Refresh** — Configurable polling intervals with jitter, hidden-tab backoff, and circuit breaker fault tolerance
- **Dark/Light Themes** — CSS variable-based theming with persistent preference

## Quick Start

```bash
# Install dependencies
npm install

# Add API keys
cp .env.example .env
# Edit .env with your keys (see below)

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## API Keys

Create a `.env` file with:

```env
GROQ_API_KEY=your_groq_key          # Required for AI Copilot
FINNHUB_API_KEY=your_finnhub_key    # Quotes, earnings, IPOs, company news
ALPHA_VANTAGE_API_KEY=your_av_key   # FX rates, economic indicators (25 req/day free)
```

**Free tier API sources:**
- [Groq](https://console.groq.com/) — Free tier available
- [Finnhub](https://finnhub.io/) — 60 API calls/minute free
- [Alpha Vantage](https://www.alphavantage.co/support/#api-key) — 25 API calls/day free
- [FRED](https://fred.stlouisfed.org/) — No key required for basic access
- Yahoo Finance — Proxied via Vite dev server (no key needed)

## Data Sources & Refresh Intervals

| Panel | Source | Refresh |
|-------|--------|---------|
| Indices, Stocks, FX, Commodities, Crypto | Yahoo Finance | 60s |
| Sector Heatmap | Yahoo Finance | 60s |
| Treasury Yields, Macro | FRED | 30 min |
| Earnings Calendar | Finnhub | 1 hour |
| IPO Calendar | Finnhub | 1 hour |
| News Feed | RSS (MarketWatch, CNBC, Reuters, Investing.com) | 5 min |
| Central Banks | FRED + Static | 30 min |

## Architecture

```
App.init()
  1. initTheme()
  2. PanelLayoutManager → Header + DeckGLMap + 12 Panels + CopilotDrawer
  3. DataLoaderManager.loadAllData() → parallel API fetches
  4. RefreshScheduler → polling with jitter + backoff
  5. Event listeners
```

All API calls are wrapped in a generic `CircuitBreaker<T>` that provides:
- Automatic failure detection (3 strikes → OPEN)
- Cooldown with half-open retry
- Stale data fallback from last successful fetch

## Tech Stack

- **TypeScript** — Strict mode, no framework
- **Vite** — Build tooling + dev proxy for Yahoo Finance CORS
- **deck.gl + MapLibre GL** — 3D globe with financial geography layers
- **d3-shape/d3-scale** — Sparkline SVG rendering
- **Groq** — AI chat completions (Llama 3.3 70B)
- **fast-xml-parser** — RSS feed parsing
- **marked + DOMPurify** — Safe markdown rendering in copilot

## Build

```bash
npm run build    # Production build → dist/
npm run preview  # Preview production build
```

## License

MIT
