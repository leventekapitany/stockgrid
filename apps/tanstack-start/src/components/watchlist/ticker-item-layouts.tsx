import type { StockChartHover } from "@stock/ui/stock-chart";
import type { HistoryRange, Quote } from "@stock/validators";
import { cn } from "@stock/ui";

import type { HistoryQueryState } from "./ticker-chart";
import { ExtendedHoursChange } from "./extended-hours-change";
import { formatSignedNumber, formatSignedPercent } from "./formatters";
import { RegularPercentBadge } from "./regular-percent-badge";
import { RollingPrice } from "./rolling-price";
import { TickerChart } from "./ticker-chart";

export function TickerItemMobile({
  symbol,
  quote,
  priceFmt,
  displayedPrice,
  livePrice,
  animatePrice,
  displayedChangePercent,
  chartHover,
  onChartHoverChange,
  history,
  range,
  chartTimeDisplayMode,
  onRemove,
}: {
  symbol: string;
  quote?: Quote;
  priceFmt: Intl.NumberFormat;
  displayedPrice?: number;
  livePrice?: number;
  animatePrice: boolean;
  displayedChangePercent?: number | null;
  chartHover: StockChartHover | null;
  onChartHoverChange: (hover: StockChartHover | null) => void;
  history: HistoryQueryState;
  range: HistoryRange;
  chartTimeDisplayMode: "intraday" | "calendar";
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
          range={range}
          chartTimeDisplayMode={chartTimeDisplayMode}
          className="h-16"
          onHoverChange={onChartHoverChange}
        />
      </div>

      <div className="flex min-h-14 shrink-0 flex-col items-end justify-center text-right">
        <RollingPrice
          value={displayedPrice}
          liveValue={livePrice}
          format={priceFmt}
          animate={animatePrice}
          className="font-mono text-sm font-bold"
        />
        <RegularPercentBadge value={displayedChangePercent} />
        <div className="mt-0.5 h-4">
          {!chartHover && <ExtendedHoursChange quote={quote} />}
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer px-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
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
  displayedPrice,
  livePrice,
  animatePrice,
  displayedChange,
  displayedChangePercent,
  displayedPositive,
  chartHover,
  onChartHoverChange,
  history,
  range,
  chartTimeDisplayMode,
  onRemove,
}: {
  symbol: string;
  quote?: Quote;
  priceFmt: Intl.NumberFormat;
  displayedPrice?: number;
  livePrice?: number;
  animatePrice: boolean;
  displayedChange?: number | null;
  displayedChangePercent?: number | null;
  displayedPositive: boolean;
  chartHover: StockChartHover | null;
  onChartHoverChange: (hover: StockChartHover | null) => void;
  history: HistoryQueryState;
  range: HistoryRange;
  chartTimeDisplayMode: "intraday" | "calendar";
  onRemove: () => void;
}) {
  return (
    <div className="bg-muted/40 hover:bg-muted/60 relative hidden flex-col gap-3 rounded-lg border p-4 transition-colors lg:flex">
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground absolute top-3 right-3 cursor-pointer text-xs"
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

      <div className="flex min-h-12 items-start justify-between gap-2">
        <RollingPrice
          value={displayedPrice}
          liveValue={livePrice}
          format={priceFmt}
          animate={animatePrice}
          className="font-mono text-3xl"
        />
        <div className="min-h-12 shrink-0 text-right">
          {displayedChange != null && (
            <div
              className={cn(
                "font-mono text-sm tabular-nums",
                displayedPositive ? "text-semantic-up" : "text-semantic-down",
              )}
            >
              {formatSignedNumber(displayedChange)}
              {displayedChangePercent != null && (
                <span className="ml-1">
                  ({formatSignedPercent(displayedChangePercent)})
                </span>
              )}
            </div>
          )}
          <div className="mt-1 h-4">
            {!chartHover && <ExtendedHoursChange quote={quote} />}
          </div>
        </div>
      </div>

      <div className="border-border/60 bg-background/60 overflow-hidden rounded-md border">
        <TickerChart
          history={history}
          range={range}
          chartTimeDisplayMode={chartTimeDisplayMode}
          onHoverChange={onChartHoverChange}
        />
      </div>
    </div>
  );
}
