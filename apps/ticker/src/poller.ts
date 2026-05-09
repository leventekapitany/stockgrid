import YahooFinance from "yahoo-finance2";

import type { MarketDataHandle } from "@acme/api";
import type {
  HistoryBar,
  HistoryRange,
  MarketState,
  Quote,
} from "@acme/validators";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

const ACTIVE_INTERVAL_MS = 1000;
const IDLE_INTERVAL_MS = 30_000;
const BATCH_SIZE = 50;
const HISTORY_CACHE_MAX = 200;

const RANGE_CONFIG = {
  "1D": { days: 2, interval: "5m", ttlMs: 5 * 60_000 },
  "5D": { days: 7, interval: "15m", ttlMs: 5 * 60_000 },
  "1M": { days: 35, interval: "1d", ttlMs: 30 * 60_000 },
  "3M": { days: 100, interval: "1d", ttlMs: 30 * 60_000 },
  "6M": { days: 200, interval: "1d", ttlMs: 60 * 60_000 },
  "1Y": { days: 370, interval: "1d", ttlMs: 60 * 60_000 },
  "5Y": { days: 5 * 370, interval: "1wk", ttlMs: 60 * 60_000 },
  MAX: { days: 50 * 370, interval: "1mo", ttlMs: 60 * 60_000 },
} as const satisfies Record<
  HistoryRange,
  {
    days: number;
    interval: "5m" | "15m" | "1d" | "1wk" | "1mo";
    ttlMs: number;
  }
>;

type Subscriber = (quote: Quote) => void;

interface HistoryCacheEntry {
  expiresAt: number;
  bars: HistoryBar[];
}

interface RawChartQuote {
  date: Date;
  high: number | null;
  low: number | null;
  open: number | null;
  close: number | null;
  volume: number | null;
  adjclose?: number | null;
}

interface RawTradingPeriod {
  start: Date;
  end: Date;
}

interface RawChartResult {
  meta: {
    gmtoffset?: number;
    currentTradingPeriod?: {
      regular?: RawTradingPeriod;
      post?: RawTradingPeriod;
    };
  };
  quotes: RawChartQuote[];
}

export class StockPoller implements MarketDataHandle {
  private symbols = new Map<string, Set<Subscriber>>();
  private cache = new Map<string, Quote>();
  private historyCache = new Map<string, HistoryCacheEntry>();
  private inFlightHistory = new Map<string, Promise<HistoryBar[]>>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private currentDelay = ACTIVE_INTERVAL_MS;

  subscribe(symbol: string, emit: Subscriber): () => void {
    let subs = this.symbols.get(symbol);
    if (!subs) {
      subs = new Set();
      this.symbols.set(symbol, subs);
    }
    subs.add(emit);
    this.ensureRunning();

    return () => {
      const set = this.symbols.get(symbol);
      if (!set) return;
      set.delete(emit);
      if (set.size === 0) {
        this.symbols.delete(symbol);
        this.cache.delete(symbol);
      }
      if (this.symbols.size === 0) {
        this.stop();
      }
    };
  }

  peek(symbol: string): Quote | undefined {
    return this.cache.get(symbol);
  }

  async history(symbol: string, range: HistoryRange): Promise<HistoryBar[]> {
    const key = `${symbol}:${range}`;
    const now = Date.now();
    const cached = this.historyCache.get(key);
    if (cached && cached.expiresAt > now) {
      this.historyCache.delete(key);
      this.historyCache.set(key, cached);
      return cached.bars;
    }

    const existing = this.inFlightHistory.get(key);
    if (existing) return existing;

    const request = this.fetchHistory(symbol, range).then((bars) => {
      const config = RANGE_CONFIG[range];
      this.historyCache.set(key, {
        bars,
        expiresAt: Date.now() + config.ttlMs,
      });
      this.pruneHistoryCache();
      return bars;
    });

    this.inFlightHistory.set(key, request);
    try {
      return await request;
    } finally {
      this.inFlightHistory.delete(key);
    }
  }

  private ensureRunning() {
    if (this.timer) return;
    this.scheduleNext(0);
  }

  private stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext(delay: number) {
    this.timer = setTimeout(() => void this.tick(), delay);
  }

  private async tick() {
    this.timer = null;
    if (this.symbols.size === 0) return;
    if (this.inFlight) {
      this.scheduleNext(this.currentDelay);
      return;
    }
    this.inFlight = true;

    const symbols = [...this.symbols.keys()];
    let allClosed = true;
    try {
      for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        const chunk = symbols.slice(i, i + BATCH_SIZE);
        const quotes = await yahooFinance.quote(chunk, {
          return: "array",
        });
        for (const raw of quotes) {
          const quote = toQuote(raw as RawQuote);
          if (!quote) continue;
          if (quote.marketState !== "CLOSED") allClosed = false;
          const prev = this.cache.get(quote.symbol);
          this.cache.set(quote.symbol, quote);
          if (!prev || prev.price !== quote.price) {
            this.fanout(quote);
          }
        }
      }
    } catch (err) {
      console.error("[poller] tick failed:", err);
    } finally {
      this.inFlight = false;
      this.currentDelay = allClosed ? IDLE_INTERVAL_MS : ACTIVE_INTERVAL_MS;
      if (this.symbols.size > 0) this.scheduleNext(this.currentDelay);
    }
  }

  private fanout(quote: Quote) {
    const subs = this.symbols.get(quote.symbol);
    if (!subs) return;
    for (const sub of subs) {
      try {
        sub(quote);
      } catch (err) {
        console.error("[poller] subscriber threw:", err);
      }
    }
  }

  private async fetchHistory(
    symbol: string,
    range: HistoryRange,
  ): Promise<HistoryBar[]> {
    const config = RANGE_CONFIG[range];
    const period2 = new Date();
    const period1 = new Date(
      period2.getTime() - config.days * 24 * 60 * 60_000,
    );

    const result = (await yahooFinance.chart(symbol, {
      period1,
      period2,
      interval: config.interval,
      includePrePost: true,
      return: "array",
    })) as RawChartResult;

    return result.quotes
      .map((quote) => toHistoryBar(quote, result, config.interval))
      .filter((bar): bar is HistoryBar => Boolean(bar));
  }

  private pruneHistoryCache() {
    while (this.historyCache.size > HISTORY_CACHE_MAX) {
      const oldestKey = this.historyCache.keys().next().value;
      if (!oldestKey) return;
      this.historyCache.delete(oldestKey);
    }
  }
}

function toHistoryBar(
  quote: RawChartQuote,
  result: RawChartResult,
  interval: (typeof RANGE_CONFIG)[HistoryRange]["interval"],
): HistoryBar | null {
  if (
    quote.open === null ||
    quote.high === null ||
    quote.low === null ||
    quote.close === null
  ) {
    return null;
  }

  const adjusted = adjustBar({
    open: quote.open,
    high: quote.high,
    low: quote.low,
    close: quote.close,
    adjclose: quote.adjclose,
  });

  return {
    time: Math.floor(quote.date.getTime() / 1000),
    ...adjusted,
    volume: quote.volume,
    session: isPostMarket(quote.date, result, interval) ? "post" : "regular",
  };
}

function adjustBar(quote: {
  open: number;
  high: number;
  low: number;
  close: number;
  adjclose?: number | null;
}) {
  const ratio =
    quote.adjclose && quote.close && quote.close !== 0
      ? quote.adjclose / quote.close
      : 1;

  return {
    open: quote.open * ratio,
    high: quote.high * ratio,
    low: quote.low * ratio,
    close: quote.close * ratio,
  };
}

function isPostMarket(
  date: Date,
  result: RawChartResult,
  interval: (typeof RANGE_CONFIG)[HistoryRange]["interval"],
) {
  if (interval === "1d" || interval === "1wk" || interval === "1mo") {
    return false;
  }

  const post = result.meta.currentTradingPeriod?.post;
  if (post && date >= post.start && date < post.end) return true;

  const gmtoffsetSeconds = result.meta.gmtoffset ?? 0;
  const exchangeDate = new Date(date.getTime() + gmtoffsetSeconds * 1000);
  const minutes =
    exchangeDate.getUTCHours() * 60 + exchangeDate.getUTCMinutes();

  return minutes >= 16 * 60 && minutes < 20 * 60;
}

interface RawQuote {
  symbol: string;
  marketState?: string;
  regularMarketPrice?: number;
  preMarketPrice?: number;
  postMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  preMarketChange?: number;
  preMarketChangePercent?: number;
  postMarketChange?: number;
  postMarketChangePercent?: number;
  currency?: string;
  shortName?: string;
}

function toQuote(raw: RawQuote): Quote | null {
  const marketState = normalizeMarketState(raw.marketState);
  let price: number | undefined;
  let change: number | undefined;
  let changePercent: number | undefined;

  if (marketState === "PRE" || marketState === "PREPRE") {
    price = raw.preMarketPrice ?? raw.regularMarketPrice;
    change = raw.preMarketChange ?? raw.regularMarketChange;
    changePercent =
      raw.preMarketChangePercent ?? raw.regularMarketChangePercent;
  } else if (marketState === "POST" || marketState === "POSTPOST") {
    price = raw.postMarketPrice ?? raw.regularMarketPrice;
    change = raw.postMarketChange ?? raw.regularMarketChange;
    changePercent =
      raw.postMarketChangePercent ?? raw.regularMarketChangePercent;
  } else {
    price = raw.regularMarketPrice;
    change = raw.regularMarketChange;
    changePercent = raw.regularMarketChangePercent;
  }

  if (price === undefined) return null;

  return {
    symbol: raw.symbol,
    price,
    change: change ?? null,
    changePercent: changePercent ?? null,
    marketState,
    currency: raw.currency ?? null,
    shortName: raw.shortName ?? null,
    timestamp: Date.now(),
  };
}

function normalizeMarketState(s: string | undefined): MarketState {
  switch (s) {
    case "PRE":
    case "REGULAR":
    case "POST":
    case "PREPRE":
    case "POSTPOST":
    case "CLOSED":
      return s;
    default:
      return "CLOSED";
  }
}

export const poller = new StockPoller();
