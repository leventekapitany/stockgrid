import type { HistoryRange } from "@stock/validators";

export const HISTORY_RANGES = [
  "1D",
  "5D",
  "1M",
  "3M",
  "6M",
  "1Y",
  "5Y",
  "MAX",
] as const satisfies readonly HistoryRange[];

export const DEFAULT_HISTORY_RANGE = "1D" satisfies HistoryRange;

export type ChartTimeDisplayMode = "intraday" | "calendar";

export interface HistoryRangeConfig {
  days: number;
  interval: "5m" | "15m" | "1d" | "1wk" | "1mo";
  ttlMs: number;
  timeDisplayMode: ChartTimeDisplayMode;
}

const HISTORY_RANGE_CONFIG = {
  "1D": {
    days: 2,
    interval: "5m",
    ttlMs: 5 * 60_000,
    timeDisplayMode: "intraday",
  },
  "5D": {
    days: 7,
    interval: "15m",
    ttlMs: 5 * 60_000,
    timeDisplayMode: "intraday",
  },
  "1M": {
    days: 35,
    interval: "1d",
    ttlMs: 30 * 60_000,
    timeDisplayMode: "calendar",
  },
  "3M": {
    days: 100,
    interval: "1d",
    ttlMs: 30 * 60_000,
    timeDisplayMode: "calendar",
  },
  "6M": {
    days: 200,
    interval: "1d",
    ttlMs: 60 * 60_000,
    timeDisplayMode: "calendar",
  },
  "1Y": {
    days: 370,
    interval: "1d",
    ttlMs: 60 * 60_000,
    timeDisplayMode: "calendar",
  },
  "5Y": {
    days: 5 * 370,
    interval: "1wk",
    ttlMs: 60 * 60_000,
    timeDisplayMode: "calendar",
  },
  MAX: {
    days: 50 * 370,
    interval: "1mo",
    ttlMs: 60 * 60_000,
    timeDisplayMode: "calendar",
  },
} as const satisfies Record<HistoryRange, HistoryRangeConfig>;

export function getHistoryRangeConfig(range: HistoryRange): HistoryRangeConfig {
  return HISTORY_RANGE_CONFIG[range];
}

export function getHistoryRangeTimeDisplayMode(
  range: HistoryRange,
): ChartTimeDisplayMode {
  return getHistoryRangeConfig(range).timeDisplayMode;
}
