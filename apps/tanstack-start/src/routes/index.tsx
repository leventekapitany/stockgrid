import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useSubscription } from "@trpc/tanstack-react-query";

import type { HistoryRange, Quote } from "@stock/validators";
import { cn } from "@stock/ui";
import { Button } from "@stock/ui/button";
import { Input } from "@stock/ui/input";
import { StockChart } from "@stock/ui/stock-chart";

import { useTRPC } from "~/lib/trpc";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "NVDA", "TSLA"];
const CHART_RANGES = ["1D", "5D", "1M", "3M", "6M", "1Y", "5Y", "MAX"] as const;
const DEFAULT_CHART_RANGE = "1M" satisfies HistoryRange;
const MAX_CHARTS = 25;

function RouteComponent() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [draft, setDraft] = useState("");
  const canAddSymbol = symbols.length < MAX_CHARTS;

  const addSymbol = () => {
    const next = draft.trim().toUpperCase();
    if (!next || symbols.includes(next) || !canAddSymbol) return;
    setSymbols((prev) => [...prev, next]);
    setDraft("");
  };

  const removeSymbol = (symbol: string) =>
    setSymbols((prev) => prev.filter((s) => s !== symbol));

  return (
    <main className="container mx-auto max-w-4xl px-4 py-12">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">Live tickers</h1>
        <p className="text-muted-foreground text-sm">
          One global poller, ref-counted subscriptions. Add a symbol to open a
          live tRPC subscription over WebSocket.
        </p>
      </header>

      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addSymbol();
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="AAPL"
          className="uppercase"
          maxLength={16}
        />
        <Button type="submit" disabled={!canAddSymbol}>
          Add
        </Button>
      </form>

      {!canAddSymbol && (
        <p className="text-muted-foreground mb-6 text-sm">
          Maximum of {MAX_CHARTS} charts reached.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {symbols.map((symbol) => (
          <TickerCard
            key={symbol}
            symbol={symbol}
            onRemove={() => removeSymbol(symbol)}
          />
        ))}
      </div>

      {symbols.length === 0 && (
        <p className="text-muted-foreground py-12 text-center text-sm">
          No symbols yet. Add one above.
        </p>
      )}

      <footer className="mt-8 text-center">
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground/60 cursor-default text-xs"
        >
          Charts by TradingView
        </a>
      </footer>
    </main>
  );
}

function TickerCard({
  symbol,
  onRemove,
}: {
  symbol: string;
  onRemove: () => void;
}) {
  const trpc = useTRPC();
  const [range, setRange] = useState<HistoryRange>(DEFAULT_CHART_RANGE);
  const sub = useSubscription(
    trpc.ticker.watch.subscriptionOptions({ symbol }),
  );
  const history = useQuery(trpc.ticker.history.queryOptions({ symbol, range }));

  const quote = sub.data;
  const status = sub.status;

  const positive = (quote?.change ?? 0) >= 0;
  const priceFmt = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: quote?.currency ?? "USD",
        maximumFractionDigits: 2,
      }),
    [quote?.currency],
  );

  return (
    <div className="bg-muted/40 hover:bg-muted/60 relative flex flex-col gap-3 rounded-lg border p-4 transition-colors">
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground absolute top-3 right-3 text-xs"
        aria-label={`Stop watching ${symbol}`}
      >
        ✕
      </button>

      <div className="flex items-baseline justify-between gap-2 pr-6">
        <div>
          <div className="text-lg font-bold">{symbol}</div>
          {quote?.shortName && (
            <div className="text-muted-foreground truncate text-xs">
              {quote.shortName}
            </div>
          )}
        </div>
        <StatusDot status={status} marketState={quote?.marketState} />
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="font-mono text-3xl tabular-nums">
          {quote ? priceFmt.format(quote.price) : <span>—</span>}
        </div>
        {quote?.change !== null && quote?.change !== undefined && (
          <div
            className={cn(
              "font-mono text-sm tabular-nums",
              positive ? "text-emerald-500" : "text-red-500",
            )}
          >
            {positive ? "+" : ""}
            {quote.change.toFixed(2)}
            {quote.changePercent !== null && (
              <span className="ml-1">
                ({positive ? "+" : ""}
                {quote.changePercent.toFixed(2)}%)
              </span>
            )}
          </div>
        )}
      </div>

      <div className="border-border/60 bg-background/60 overflow-hidden rounded-md border">
        {history.isLoading ? (
          <div className="text-muted-foreground flex h-24 items-center justify-center text-xs">
            loading
          </div>
        ) : history.isError ? (
          <div className="text-muted-foreground flex h-24 items-center justify-center text-xs">
            error
          </div>
        ) : (
          <StockChart data={history.data ?? []} />
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {CHART_RANGES.map((nextRange) => (
          <button
            key={nextRange}
            type="button"
            onClick={() => setRange(nextRange)}
            className={cn(
              "text-muted-foreground hover:bg-background hover:text-foreground rounded px-2 py-1 text-[11px] font-medium transition-colors",
              range === nextRange && "bg-background text-foreground shadow-xs",
            )}
          >
            {nextRange}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusDot({
  status,
  marketState,
}: {
  status: string;
  marketState?: Quote["marketState"];
}) {
  const label =
    status === "pending"
      ? "connecting"
      : status === "connecting"
        ? "connecting"
        : status === "error"
          ? "error"
          : marketState
            ? marketState.toLowerCase()
            : "live";
  const color =
    status === "error"
      ? "bg-red-500"
      : marketState === "REGULAR"
        ? "bg-emerald-500 animate-pulse"
        : marketState === "CLOSED"
          ? "bg-zinc-500"
          : "bg-amber-500";

  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </div>
  );
}
