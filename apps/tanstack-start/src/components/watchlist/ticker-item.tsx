import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";

import type { StockChartHover } from "@stock/ui/stock-chart";
import type { HistoryRange } from "@stock/validators";
import { HISTORY_RANGES } from "@stock/market-data/range-policy";

import { useTRPC } from "~/lib/trpc";
import { TickerItemDesktop, TickerItemMobile } from "./ticker-item-layouts";

export function TickerItem({
  symbol,
  range,
  chartTimeDisplayMode,
  onRemove,
}: {
  symbol: string;
  range: HistoryRange;
  chartTimeDisplayMode: "intraday" | "calendar";
  onRemove: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const sub = useSubscription(
    trpc.ticker.watch.subscriptionOptions({ symbol }),
  );
  const history = useQuery(trpc.ticker.history.queryOptions({ symbol, range }));
  const [chartHoverState, setChartHoverState] = useState<{
    range: HistoryRange;
    hover: StockChartHover | null;
  } | null>(null);
  const prefetchedRangesRef = useRef(new Set<HistoryRange>());

  const quote = sub.data;
  const regularChange = quote?.regularChange ?? quote?.change;
  const regularChangePercent =
    quote?.regularChangePercent ?? quote?.changePercent;

  useEffect(() => {
    if (!history.isSuccess) return;

    prefetchedRangesRef.current.add(range);
    for (const nextRange of HISTORY_RANGES) {
      if (prefetchedRangesRef.current.has(nextRange)) continue;
      prefetchedRangesRef.current.add(nextRange);

      void queryClient.prefetchQuery(
        trpc.ticker.history.queryOptions({ symbol, range: nextRange }),
      );
    }
  }, [history.isSuccess, queryClient, range, symbol, trpc]);

  const rangeChange = useMemo(() => {
    const bars = history.data;
    const first = bars?.[0];
    const last = bars?.at(-1);
    if (!first || !last) return null;

    const change = last.close - first.close;
    return {
      change,
      changePercent: first.close === 0 ? null : (change / first.close) * 100,
    };
  }, [history.data]);

  const chartHover =
    chartHoverState?.range === range ? chartHoverState.hover : null;

  const updateChartHover = useCallback(
    (hover: StockChartHover | null) => {
      setChartHoverState({ range, hover });
    },
    [range],
  );

  const displayedPrice = chartHover?.price ?? quote?.price;
  const displayedChange =
    chartHover?.change ?? rangeChange?.change ?? regularChange;
  const displayedChangePercent =
    chartHover?.changePercent ??
    rangeChange?.changePercent ??
    regularChangePercent;
  const displayedPositive =
    (displayedChange ?? displayedChangePercent ?? 0) >= 0;

  const priceFmt = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: quote?.currency ?? "USD",
        maximumFractionDigits: 2,
      }),
    [quote?.currency],
  );

  const shared = {
    symbol,
    quote,
    priceFmt,
    displayedPrice,
    livePrice: quote?.price,
    animatePrice: !chartHover,
    displayedChange,
    displayedChangePercent,
    displayedPositive,
    chartHover,
    onChartHoverChange: updateChartHover,
    history,
    chartTimeDisplayMode,
    onRemove,
  };

  return (
    <>
      <TickerItemMobile {...shared} />
      <TickerItemDesktop {...shared} />
    </>
  );
}
