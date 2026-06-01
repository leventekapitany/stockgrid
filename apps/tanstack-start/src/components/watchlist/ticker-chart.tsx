import type { StockChartHover } from "@stock/ui/stock-chart";
import type { HistoryBar } from "@stock/validators";
import { StockChart } from "@stock/ui/stock-chart";

export interface HistoryQueryState {
  isLoading: boolean;
  isError: boolean;
  data: HistoryBar[] | undefined;
}

export function TickerChart({
  history,
  chartTimeDisplayMode,
  className,
  interactive = true,
  onHoverChange,
}: {
  history: HistoryQueryState;
  chartTimeDisplayMode: "intraday" | "calendar";
  className?: string;
  interactive?: boolean;
  onHoverChange?: (hover: StockChartHover | null) => void;
}) {
  if (history.isLoading) {
    return (
      <div
        className={`bg-muted/30 h-12 animate-pulse rounded lg:h-24 ${className ?? ""}`}
      />
    );
  }

  if (history.isError) {
    return (
      <div
        className={`text-muted-foreground flex h-12 items-center justify-center text-xs lg:h-24 ${className ?? ""}`}
      >
        error
      </div>
    );
  }

  return (
    <StockChart
      data={history.data ?? []}
      className={className}
      interactive={interactive}
      timeDisplayMode={chartTimeDisplayMode}
      onHoverChange={onHoverChange}
    />
  );
}
