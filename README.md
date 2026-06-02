<p align="center">
  <img src="apps/tanstack-start/public/brand.svg" alt="StockGrid" width="320" />
</p>

# StockGrid

Real-time stock ticker with live WebSocket prices, interactive charts, and a global poller that only fetches what someone is actually watching.

Built with TanStack Start, tRPC v11, lightweight-charts, and yahoo-finance2.

## Architecture

Two services, one tRPC router. The web app handles SSR and regular API calls. A separate ticker server runs a persistent poller and pushes live quotes over WebSocket.

The client uses tRPC's `splitLink` to route `ticker.*` operations through `wsLink` to the ticker service, and everything else through `httpBatchStreamLink` to the web app.

```
Browser
  ├─ ticker.*  ── wsLink ──────────► ticker :4001  (WebSocket, Bun)
  └─ *         ── httpBatchStream ─► web    :3000  (TanStack Start)

ticker service
  StockPoller
    ├─ polls yahoo-finance2.quote() every 1s (30s when markets closed)
    ├─ batches up to 50 symbols per request
    ├─ ref-counted: starts on first subscriber, stops on last
    ├─ emits only when price changes
    └─ serves historical chart data from an in-memory LRU cache
```

## Stack

- **Monorepo** — pnpm workspaces + Turborepo
- **Web** — TanStack Start, React 19, Tailwind CSS v4
- **Mobile** — Expo 54, React Native, NativeWind
- **API** — tRPC v11 (HTTP + WebSocket subscriptions)
- **Auth** — Better Auth (Discord OAuth)
- **Database** — Drizzle ORM, PostgreSQL (Supabase)
- **Charts** — lightweight-charts (TradingView)
- **Market data** — yahoo-finance2 v3
- **Validation** — Zod v4
- **Deploy** — Cloudflare Workers (web), Railway (ticker)

## Structure

```
apps/
  tanstack-start/   Web app — SSR, Vite, Cloudflare Workers
  ticker/           WebSocket ticker service — Bun
  expo/             React Native mobile app

packages/
  api/              tRPC router definitions
  auth/             Better Auth config + middleware
  db/               Drizzle schema + client
  ui/               React components (shadcn/ui, StockChart)
  validators/       Shared Zod schemas

tooling/
  eslint/ prettier/ tailwind/ typescript/
```

## Getting started

```bash
pnpm install
cp .env.example .env   # then fill in your values
pnpm db:push
pnpm --filter @stock/auth generate

# run everything
pnpm dev

# or individually
pnpm --filter @stock/tanstack-start dev   # web on :3000
pnpm --filter @stock/ticker dev           # ticker on :4001
```

Requires Node >= 22 and pnpm >= 10.19.

## Environment variables

See `.env.example`. The important ones:

| Variable                     | What                                               |
| ---------------------------- | -------------------------------------------------- |
| `POSTGRES_URL`               | Supabase connection string                         |
| `AUTH_SECRET`                | Session signing secret (`openssl rand -base64 32`) |
| `AUTH_DISCORD_ID` / `SECRET` | Discord OAuth credentials                          |
| `VITE_TICKER_WS_URL`         | Ticker WS endpoint (default `ws://localhost:4001`) |
| `TICKER_PORT`                | Ticker service port (default `4001`)               |

## Deploy

- **Web** — `pnpm --filter @stock/tanstack-start deploy` pushes to Cloudflare Workers
- **Ticker** — any long-lived host (Railway, Fly, a VPS). Needs a persistent process for the poller and WebSocket server.
- **Database** — Supabase or any PostgreSQL

## License

MIT
