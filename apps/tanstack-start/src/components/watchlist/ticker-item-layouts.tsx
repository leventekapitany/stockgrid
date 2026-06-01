import type { Quote } from "@stock/validators";
import { cn } from "@stock/ui";

import { ExtendedHoursChange } from "./extended-hours-change";
import { formatSignedNumber, formatSignedPercent } from "./formatters";
import { RegularPercentBadge } from "./regular-percent-badge";
import type { HistoryQueryState } from "./ticker-chart";
import { TickerChart } from "./ticker-chart";

export function TickerItemMobile({
  symbol,
  quote,
  priceFmt,
  history,
  chartTimeDisplayMode,
  regularChangePercent,
  onRemove,
}: {
  symbol: string;
  quote?: Quote;
  priceFmt: Intl.NumberFormat;
  history: HistoryQueryState;
  chartTimeDisplayMode: "intraday" | "calendar";
  regularChangePercent?: number | null;
  onRemove: () => void;
}) {
  return (
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
        <TickerChart
          history={history}
          chartTimeDisplayMode={chartTimeDisplayMode}
          className="h-12"
          interactive={false}
        />
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
  );
}

export function TickerItemDesktop({
  symbol,
  quote,
  priceFmt,
  history,
  chartTimeDisplayMode,
  regularChange,
  regularChangePercent,
  regularPositive,
  onRemove,
}: {
  symbol: string;
  quote?: Quote;
  priceFmt: Intl.NumberFormat;
  history: HistoryQueryState;
  chartTimeDisplayMode: "intraday" | "calendar";
  regularChange?: number | null;
  regularChangePercent?: number | null;
  regularPositive: boolean;
  onRemove: () => void;
}) {
  return (
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
        <TickerChart history={history} chartTimeDisplayMode={chartTimeDisplayMode} />
      </div>
    </div>
  );
}
