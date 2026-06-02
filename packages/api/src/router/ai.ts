import type { TRPCRouterRecord } from "@trpc/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { TRPCError } from "@trpc/server";
import { generateObject } from "ai";
import { z } from "zod/v4";

import { screenSymbols, SCREEN_SORT_BY } from "@stock/market-data/screening";
import { AiSearchInput } from "@stock/validators";

import { protectedProcedure } from "../trpc";

const MAX_RESULTS = 25;
const DEFAULT_RESULTS = 10;
const MODEL = "gemini-3.1-flash-lite";

const IntentSchema = z.object({
  error: z
    .string()
    .nullable()
    .describe(
      "A short, user-facing reason ONLY when the request is not a request to find/pick stocks, is nonsensical, or cannot be fulfilled. Otherwise null.",
    ),
  symbols: z
    .array(z.string())
    .describe(
      "Candidate stock ticker symbols in Yahoo Finance format (uppercase, e.g. AAPL, JPM, BRK-B, ASML.AS). Pick real, well-known tickers that match the request. Up to 40.",
    ),
  sortBy: z
    .enum(SCREEN_SORT_BY)
    .describe(
      "How to rank the results: 'pe' (cheapest price/earnings first), 'marketCap' (largest first), 'changePercent' (biggest gainers first), 'dividendYield' (highest yield first), or 'none'.",
    ),
  count: z
    .number()
    .int()
    .describe(
      `How many stocks to return (1-${MAX_RESULTS}). Default ${DEFAULT_RESULTS} if unspecified.`,
    ),
});

const SYSTEM_PROMPT = `You are a stock-picking assistant for a watchlist app.
Given a short natural-language request, return a JSON object describing which real, publicly traded stocks to add.

Rules:
- "symbols" must be real ticker symbols in Yahoo Finance format (uppercase). Use the primary US listing when one exists; otherwise the correct suffixed symbol (e.g. ASML.AS, SHEL.L).
- Choose tickers that genuinely match the requested sector, theme, region, or criteria.
- Provide a few more candidates than requested (so weak matches can be filtered), but never more than 40.
- "sortBy" should reflect any ranking the user asked for (cheapest P/E, biggest, top gainers, highest dividend). Use "none" if no ordering is implied.
- "count" is how many to ultimately return (default ${DEFAULT_RESULTS}, max ${MAX_RESULTS}).
- If the request is not about selecting stocks, is gibberish, or cannot be fulfilled, set "error" to a short friendly message and leave "symbols" empty.`;

export const aiRouter = {
  suggestStocks: protectedProcedure
    .input(AiSearchInput)
    .mutation(async ({ input }) => {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "AI search is not configured on this server.",
        });
      }

      const google = createGoogleGenerativeAI({ apiKey });

      let intent: z.infer<typeof IntentSchema>;
      try {
        const { object, usage } = await generateObject({
          model: google(MODEL),
          schema: IntentSchema,
          system: SYSTEM_PROMPT,
          prompt: input.prompt,
        });
        intent = object;
        console.log(
          "[ai.suggestStocks] prompt:",
          JSON.stringify(input.prompt),
          "\n[ai.suggestStocks] gemini response:",
          JSON.stringify(intent),
          "\n[ai.suggestStocks] usage:",
          JSON.stringify(usage),
        );
      } catch (error) {
        console.error("[ai.suggestStocks] generateObject failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI request failed. Please try again.",
        });
      }

      if (intent.error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: intent.error });
      }

      if (intent.symbols.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Couldn't understand that. Try e.g. “top 10 financial stocks”.",
        });
      }

      const count = Math.min(
        Math.max(intent.count || DEFAULT_RESULTS, 1),
        MAX_RESULTS,
      );

      const symbols = await screenSymbols(intent.symbols, intent.sortBy, count);
      console.log(
        "[ai.suggestStocks] screened symbols:",
        JSON.stringify(symbols.map((s) => s.symbol)),
      );

      if (symbols.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No matching stocks found. Try rephrasing your request.",
        });
      }

      return { symbols };
    }),
} satisfies TRPCRouterRecord;
