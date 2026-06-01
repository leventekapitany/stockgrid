import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useSubscription } from "@trpc/tanstack-react-query";

import type { HistoryRange, Quote } from "@stock/validators";
import { cn, Moon } from "@stock/ui";
import { Button } from "@stock/ui/button";
import { Input } from "@stock/ui/input";
import { StockChart } from "@stock/ui/stock-chart";

import { useTRPC } from "~/lib/trpc";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "NVDA", "TSLA"];
const CHART_RANGES = ["1D", "5D", "1M", "3M", "6M", "1Y", "5Y", "MAX"] as const;
const DEFAULT_CHART_RANGE = "1D" satisfies HistoryRange;
const MAX_CHARTS = 25;

function RouteComponent() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [draft, setDraft] = useState("");
  const [range, setRange] = useState<HistoryRange>(DEFAULT_CHART_RANGE);
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
    <main className="mx-auto max-w-2xl px-4 py-6 lg:max-w-6xl">
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addSymbol();
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add symbol..."
          className="uppercase"
          maxLength={16}
        />
        <Button type="submit" disabled={!canAddSymbol}>
          Add
        </Button>
      </form>

      <GlobalRangeSelector range={range} onRangeChange={setRange} />

      {/* Mobile: list — Desktop: 2-col grid */}
      <div className="divide-border divide-y lg:grid lg:grid-cols-2 lg:gap-3 lg:divide-y-0">
        {symbols.map((symbol) => (
          <TickerItem
            key={symbol}
            symbol={symbol}
            range={range}
            onRemove={() => removeSymbol(symbol)}
          />
        ))}
      </div>

      {symbols.length === 0 && (
        <p className="text-muted-foreground py-16 text-center text-sm">
          No symbols yet. Add one above.
        </p>
      )}

      <footer className="mt-6 text-center">
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

function TickerItem({
  symbol,
  range,
  onRemove,
}: {
  symbol: string;
  range: HistoryRange;
  onRemove: () => void;
}) {
  const trpc = useTRPC();
  const sub = useSubscription(
    trpc.ticker.watch.subscriptionOptions({ symbol }),
  );
  const history = useQuery(trpc.ticker.history.queryOptions({ symbol, range }));

  const quote = sub.data;
  const regularChange = quote?.regularChange ?? quote?.change;
  const regularChangePercent =
    quote?.regularChangePercent ?? quote?.changePercent;
  const regularPositive = (regularChange ?? regularChangePercent ?? 0) >= 0;

  const priceFmt = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: quote?.currency ?? "USD",
        maximumFractionDigits: 2,
      }),
    [quote?.currency],
  );

  const chartContent = history.isLoading ? (
    <div className="bg-muted/30 h-12 animate-pulse rounded lg:h-24" />
  ) : history.isError ? (
    <div className="text-muted-foreground flex h-12 items-center justify-center text-xs lg:h-24">
      error
    </div>
  ) : null;

  return (
    <>
      {/* ── Mobile: compact row ── */}
      <div className="group flex items-center gap-3 py-4 lg:hidden">
        <div className="w-24 shrink-0">
          <div className="text-sm font-bold">{symbol}</div>
          {quote?.shortName && (
            <div className="text-muted-foreground w-24 truncate text-xs">
              {quote.shortName}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {chartContent ?? (
            <StockChart
              data={history.data ?? []}
              className="h-12"
              interactive={false}
            />
          )}
        </div>

        <div className="shrink-0 text-right">
          <div className="font-mono text-sm font-bold tabular-nums">
            {quote ? priceFmt.format(quote.price) : "—"}
          </div>
          <RegularPercentBadge value={regularChangePercent} />
          <ExtendedHoursChange quote={quote} />
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-foreground shrink-0 px-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={`Remove ${symbol}`}
        >
          ✕
        </button>
      </div>

      {/* ── Desktop: full card ── */}
      <div className="bg-muted/40 hover:bg-muted/60 relative hidden flex-col gap-3 rounded-lg border p-4 transition-colors lg:flex">
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
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <div className="font-mono text-3xl tabular-nums">
            {quote ? priceFmt.format(quote.price) : <span>—</span>}
          </div>
          <div className="shrink-0 text-right">
            {regularChange != null && (
              <div
                className={cn(
                  "font-mono text-sm tabular-nums",
                  regularPositive ? "text-semantic-up" : "text-semantic-down",
                )}
              >
                {formatSignedNumber(regularChange)}
                {regularChangePercent != null && (
                  <span className="ml-1">
                    ({formatSignedPercent(regularChangePercent)})
                  </span>
                )}
              </div>
            )}
            <ExtendedHoursChange quote={quote} className="mt-1" />
          </div>
        </div>

        <div className="border-border/60 bg-background/60 overflow-hidden rounded-md border">
          {chartContent ?? <StockChart data={history.data ?? []} />}
        </div>
      </div>
    </>
  );
}

function GlobalRangeSelector({
  range,
  onRangeChange,
}: {
  range: HistoryRange;
  onRangeChange: (range: HistoryRange) => void;
}) {
  return (
    <div className="mb-4">
      <select
        value={range}
        onChange={(event) => onRangeChange(event.target.value as HistoryRange)}
        aria-label="Chart interval"
        className="border-border bg-background text-foreground h-10 w-full rounded-md border px-3 font-mono text-sm lg:hidden"
      >
        {CHART_RANGES.map((nextRange) => (
          <option key={nextRange} value={nextRange}>
            {nextRange}
          </option>
        ))}
      </select>

      <div className="hidden flex-wrap gap-1 lg:flex">
        {CHART_RANGES.map((nextRange) => (
          <button
            key={nextRange}
            type="button"
            onClick={() => onRangeChange(nextRange)}
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

function RegularPercentBadge({ value }: { value?: number | null }) {
  if (value == null) return null;

  return (
    <span
      className={cn(
        "mt-0.5 inline-block rounded-sm px-2 py-0.5 font-mono text-xs font-semibold text-white tabular-nums",
        value >= 0 ? "bg-semantic-up" : "bg-semantic-down",
      )}
    >
      {formatSignedPercent(value)}
    </span>
  );
}

function ExtendedHoursChange({
  quote,
  className,
}: {
  quote?: Quote;
  className?: string;
}) {
  const extended = quote?.extendedHours;
  if (extended?.changePercent == null) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-end gap-1 font-mono text-xs tabular-nums",
        extended.changePercent >= 0 ? "text-semantic-up" : "text-semantic-down",
        className,
      )}
      title={`${extended.session === "post" ? "After-hours" : "Pre-market"} change`}
    >
      <span className="bg-chart-post/20 text-chart-post inline-flex size-4 items-center justify-center rounded-full">
        <Moon className="size-2.5" aria-hidden="true" />
      </span>
      <span>{formatSignedPercent(extended.changePercent)}</span>
    </div>
  );
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatSignedNumber(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}
