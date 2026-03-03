> **Master directory**: See `~/claude/CLAUDE.md` for the full index of all Claude projects.

# MarketPulse — Financial Intelligence Dashboard

## Overview
Real-time financial intelligence dashboard for investment banking. Vanilla TypeScript SPA with deck.gl globe, 12 data panels, and Groq-powered AI analyst copilot.

## Tech Stack
- **Frontend**: TypeScript, Vite, CSS (no framework)
- **Globe**: deck.gl + MapLibre GL (CARTO dark-matter basemap)
- **Data APIs**: Yahoo Finance (via Vite proxy), Finnhub, Alpha Vantage, FRED
- **AI Copilot**: Groq (llama-3.3-70b-versatile)
- **Other**: d3 (sparklines), fast-xml-parser (RSS), DOMPurify + marked (copilot markdown)

## Project Structure
```
src/
├── main.ts              # Entry point
├── App.ts               # Root orchestrator (6-phase init)
├── app/
│   ├── app-context.ts   # Shared AppContext + all data interfaces
│   ├── panel-layout.ts  # Creates header, map, panels grid
│   ├── data-loader.ts   # Orchestrates all API fetches
│   └── refresh-scheduler.ts  # Polling with jitter + hidden-tab backoff
├── components/          # 12 panels + Header + CopilotDrawer + DeckGLMap + MapPopup
├── services/            # API clients (yahoo, finnhub, alpha-vantage, fred, groq, rss) + circuit-breaker
├── config/              # Symbol lists, RSS feeds, geo coordinates, panel definitions
├── utils/               # DOM helpers, formatters, sparkline SVG, theme, storage
└── styles/              # CSS: main, panels, map, header, copilot
```

## Commands
- `npm run dev` — Start dev server (port 5173)
- `npm run build` — Production build to `dist/`
- `npx tsc --noEmit` — Type check

## API Keys
Set in `.env` (never committed):
- `GROQ_API_KEY` — Groq chat (for copilot)
- `FINNHUB_API_KEY` — Finnhub (quotes, earnings, IPO, news)
- `ALPHA_VANTAGE_API_KEY` — Alpha Vantage (FX, economic indicators, 25/day free limit)
- FRED requires no key for basic access

## Architecture Notes

### Data Flow
1. `App.init()` → `PanelLayoutManager.init()` creates DOM
2. `DataLoaderManager.loadAllData()` fires parallel fetches via `Promise.allSettled`
3. Each loader fetches data → updates `AppContext` → calls `panel.update(data)`
4. `RefreshScheduler` polls at intervals: quotes 60s, news 5min, FRED 30min, earnings/IPO 1hr

### Circuit Breaker
All API calls wrapped in `CircuitBreaker<T>` — max 3 failures → OPEN for cooldown → HALF_OPEN retry. Stale fallback returns last good result when OPEN.

### Yahoo Finance Proxy
Yahoo endpoints proxied through Vite dev server to avoid CORS:
- `/yahoo-api/*` → `query1.finance.yahoo.com`
- `/yahoo-spark/*` → `query2.finance.yahoo.com`

### Globe Layers (toggleable)
- Stock Exchanges (27, color-coded by tier: mega/major/emerging)
- Financial Centers (19, sized by GFCI rank)
- Central Banks (14, with currency labels)
- Commodity Hubs (10, typed by commodity class)

### Panel Components
All extend `Panel` base class. Each has `update(data)` called by DataLoaderManager:
- IndicesPanel, MarketsPanel, HeatmapPanel, FXPanel, BondsPanel (with yield curve SVG)
- CommoditiesPanel, CryptoPanel, MacroPanel, EarningsPanel, NewsPanel, IPOPanel, CentralBanksPanel

### Copilot
Slide-out drawer. Sends chat to Groq with system prompt + live market snapshot from AppContext. Renders markdown responses via marked + DOMPurify.

## Conventions
- No React/Vue/Angular — vanilla TS with `h()` DOM helper
- All data types defined in `app-context.ts`
- Channel/symbol lists in `config/markets.ts` — never inline
- CSS variables for theming (dark/light) — dark is default
- Panel grid: CSS Grid, `auto-fill, minmax(280px, 1fr)`
- Monospace font for all numeric values
