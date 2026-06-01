# Context

## Domain Terms

- **Market data**: Quotes and historical chart data used by the stock ticker and Web watchlist.
- **Market data adapter**: Module that turns provider-specific market data into the app's shared quote and historical chart data shapes.
- **Historical chart range policy**: Module that defines the supported chart ranges, their ordering, default range, provider fetch parameters, cache TTL, and chart time display mode.
- **StockPoller**: Ticker runtime module that manages active symbol subscriptions, polling cadence, batching, cache, in-flight history dedupe, and subscriber fanout.
