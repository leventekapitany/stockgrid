# Stock Chart Plan

## Decisions

- Show an always-visible mini chart on each ticker card.
- Use a separate pure UI component named `StockChart`.
- Render charts with `lightweight-charts`.
- Each card owns its own selected range.
- Fetch history on card mount for the default range, then re-fetch when that card's range changes.
- Default range is `1M`.
- Supported ranges are `1D`, `5D`, `1M`, `3M`, `6M`, `1Y`, `5Y`, and `MAX`.
- The client sends only `symbol` and `range`; the server chooses the interval preset.
- Historical data and live subscriptions are both served by the standalone ticker app; the TanStack backend remains focused on app/auth/db procedures.
- History responses are cached in memory by `(symbol, range)` with a small LRU and roughly 5-60 minute TTLs.
- Use adjusted historical prices when Yahoo provides them, falling back to raw prices when needed.
- Keep the chart snapshot frozen after history loads. Live quote updates continue to update the text fields outside the chart.
- Cap the watchlist at a hardcoded `MAX_CHARTS = 25`.
- Range state is ephemeral per card for MVP.
- If chart history fails or is empty, show plain `error` text in the chart area.
- Include post-market data when available and render it in a distinct purple color.

## Data Contract

Add ticker history validators in `@acme/validators`:

- `HistoryRange`: enum of `1D`, `5D`, `1M`, `3M`, `6M`, `1Y`, `5Y`, `MAX`.
- `HistoryInput`: `{ symbol, range }`, reusing the symbol normalization rules from `WatchInput`.
- `HistoryBar`: canonical OHLC bar shape:
  - `time`: Unix seconds or business-day compatible value for `lightweight-charts`.
  - `open`: adjusted number when available.
  - `high`: adjusted number when available.
  - `low`: adjusted number when available.
  - `close`: adjusted number when available.
  - `volume`: nullable number.
  - `session`: `regular` or `post`.

The chart should initially render the `close` value as a compact line or area series. Keeping OHLC in the contract preserves room for candlesticks later.

## Backend Plan

Add `ticker.history` as a public tRPC query in `packages/api/src/router/ticker.ts`.

`@acme/api` owns the typed router contract only. It should call an injected `marketData` provider from tRPC context instead of importing Yahoo directly. The standalone ticker app provides that `marketData` implementation.

Ticker app responsibilities:

- Validate `symbol` and `range`.
- Map range to Yahoo interval and period options.
- Fetch historical bars through `yahoo-finance2` from the standalone ticker process.
- Normalize Yahoo rows into `HistoryBar`.
- Prefer adjusted values when available.
- Include post-market rows for ranges where the provider returns them.
- Cache successful responses in an in-memory LRU keyed by `${symbol}:${range}`.
- Deduplicate concurrent requests for the same key.
- Return a typed array of bars; return an empty array only when the provider has no usable data.

Suggested interval presets:

- `1D`: smallest practical intraday interval.
- `5D`: intraday interval suitable for a mini chart.
- `1M`, `3M`, `6M`: daily bars.
- `1Y`, `5Y`, `MAX`: coarser daily or weekly bars if needed to control payload size.

Exact Yahoo options should be verified against `yahoo-finance2` during implementation.

## UI Plan

Add `StockChart` to `packages/ui` and export it from `@acme/ui/stock-chart`.

Component contract:

```ts
type StockChartBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  session: "regular" | "post";
};

type StockChartProps = {
  data: StockChartBar[];
  className?: string;
};
```

Rendering behavior:

- Use `lightweight-charts` imperatively inside the component.
- Render regular-session close values with the default chart color.
- Render post-market close values as a purple overlay or separate line series.
- Resize with the container.
- Hide axes and chrome appropriate for a mini card chart.
- Render `error` text when `data` is empty or chart initialization fails.

Update `TickerCard` in the TanStack Start app:

- Add local `range` state initialized to `1M`.
- Fetch `trpc.ticker.history` using `{ symbol, range }`.
- Add compact per-card range controls.
- Pass loaded bars to `StockChart`.
- Show `error` in the chart area when the history query fails.
- Keep live subscription behavior unchanged for price and change fields.
- Prevent adding symbols once `symbols.length >= MAX_CHARTS`.

## Verification

- Typecheck `@acme/validators`, `@acme/api`, `@acme/ui`, and `@acme/tanstack-start`.
- Run lint for touched packages.
- Manually verify:
  - Adding up to 25 symbols works and the 26th is blocked.
  - Each card defaults to `1M`.
  - Changing range on one card does not affect other cards.
  - Live quote text updates do not mutate the loaded chart.
  - Chart failures show `error` without breaking the card.
  - Post-market data, when present, renders in purple.
