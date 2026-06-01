import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "@trpc/tanstack-react-query";

import type { HistoryRange } from "@stock/validators";

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

  const shared = {
    symbol,
    quote,
    priceFmt,
    history,
    chartTimeDisplayMode,
    onRemove,
  };

  return (
    <>
      <TickerItemMobile
        {...shared}
        regularChangePercent={regularChangePercent}
      />
      <TickerItemDesktop
        {...shared}
        regularChange={regularChange}
        regularChangePercent={regularChangePercent}
        regularPositive={regularPositive}
      />
    </>
  );
}
