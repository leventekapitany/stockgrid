import { z } from "zod/v4";

export const MarketState = z.enum([
  "PRE",
  "REGULAR",
  "POST",
  "CLOSED",
  "PREPRE",
  "POSTPOST",
]);
export type MarketState = z.infer<typeof MarketState>;

export const Quote = z.object({
  symbol: z.string(),
  price: z.number(),
  change: z.number().nullable(),
  changePercent: z.number().nullable(),
  regularPrice: z.number(),
  regularChange: z.number().nullable(),
  regularChangePercent: z.number().nullable(),
  extendedHours: z
    .object({
      session: z.enum(["pre", "post"]),
      price: z.number(),
      change: z.number().nullable(),
      changePercent: z.number().nullable(),
    })
    .nullable(),
  marketState: MarketState,
  currency: z.string().nullable(),
  shortName: z.string().nullable(),
  timestamp: z.number(),
});
export type Quote = z.infer<typeof Quote>;

export const WatchInput = z.object({
  symbol: z
    .string()
    .min(1)
    .max(16)
    .transform((s) => s.toUpperCase()),
});
export type WatchInput = z.infer<typeof WatchInput>;

export const SearchInput = z.object({
  query: z.string().trim().min(1).max(80),
});
export type SearchInput = z.infer<typeof SearchInput>;

export const SearchResult = z.object({
  symbol: z.string(),
  name: z.string().nullable(),
  exchange: z.string().nullable(),
  type: z.string().nullable(),
  region: z.string().nullable(),
  currency: z.string().nullable(),
});
export type SearchResult = z.infer<typeof SearchResult>;

export const HistoryRange = z.enum([
  "1D",
  "5D",
  "1M",
  "3M",
  "6M",
  "1Y",
  "5Y",
  "MAX",
]);
export type HistoryRange = z.infer<typeof HistoryRange>;

export const HistoryInput = z.object({
  symbol: z
    .string()
    .min(1)
    .max(16)
    .transform((s) => s.toUpperCase()),
  range: HistoryRange,
});
export type HistoryInput = z.infer<typeof HistoryInput>;

export const HistoryBar = z.object({
  time: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().nullable(),
  session: z.enum(["regular", "post"]),
});
export type HistoryBar = z.infer<typeof HistoryBar>;
