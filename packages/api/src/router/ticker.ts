import { EventEmitter, on } from "node:events";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";

import type { Quote } from "@acme/validators";
import { HistoryInput, WatchInput } from "@acme/validators";

import { publicProcedure } from "../trpc";

export const tickerRouter = {
  history: publicProcedure.input(HistoryInput).query(async ({ input, ctx }) => {
    const marketData = ctx.marketData;
    if (!marketData) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Ticker market data is not available on this server",
      });
    }

    return marketData.history(input.symbol, input.range);
  }),

  watch: publicProcedure.input(WatchInput).subscription(async function* ({
    input,
    ctx,
    signal,
  }) {
    const marketData = ctx.marketData;
    if (!marketData) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Ticker market data is not available on this server",
      });
    }

    const ee = new EventEmitter();
    const onQuote = (q: Quote) => ee.emit("q", q);
    const unsubscribe = marketData.subscribe(input.symbol, onQuote);

    try {
      const cached = marketData.peek(input.symbol);
      if (cached) yield cached;

      for await (const [quote] of on(ee, "q", { signal })) {
        yield quote as Quote;
      }
    } finally {
      unsubscribe();
    }
  }),
} satisfies TRPCRouterRecord;
