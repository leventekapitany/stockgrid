import type { MarketDataHandle } from "@stock/api";
import type {
  HistoryBar,
  HistoryRange,
  Quote,
  SearchResult,
} from "@stock/validators";
import { getHistoryRangeConfig } from "@stock/market-data/range-policy";
import {
  hasQuoteChanged,
  YahooMarketDataAdapter,
} from "@stock/market-data/yahoo";

const ACTIVE_INTERVAL_MS = 1000;
const IDLE_INTERVAL_MS = 30_000;
const BATCH_SIZE = 50;
const HISTORY_CACHE_MAX = 200;

type Subscriber = (quote: Quote) => void;

interface MarketDataProvider {
  quotes(symbols: string[]): Promise<Quote[]>;
  search(query: string): Promise<SearchResult[]>;
  history(symbol: string, range: HistoryRange): Promise<HistoryBar[]>;
}

interface HistoryCacheEntry {
  expiresAt: number;
  bars: HistoryBar[];
}

export class StockPoller implements MarketDataHandle {
  private symbols = new Map<string, Set<Subscriber>>();
  private cache = new Map<string, Quote>();
  private historyCache = new Map<string, HistoryCacheEntry>();
  private inFlightHistory = new Map<string, Promise<HistoryBar[]>>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private currentDelay = ACTIVE_INTERVAL_MS;

  constructor(
    private readonly provider: MarketDataProvider = new YahooMarketDataAdapter(),
  ) {}

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

  search(query: string): Promise<SearchResult[]> {
    return this.provider.search(query);
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
      const config = getHistoryRangeConfig(range);
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
        const quotes = await this.provider.quotes(chunk);
        for (const quote of quotes) {
          if (quote.marketState !== "CLOSED") allClosed = false;
          const prev = this.cache.get(quote.symbol);
          this.cache.set(quote.symbol, quote);
          if (!prev || hasQuoteChanged(prev, quote)) {
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
    return this.provider.history(symbol, range);
  }

  private pruneHistoryCache() {
    while (this.historyCache.size > HISTORY_CACHE_MAX) {
      const oldestKey = this.historyCache.keys().next().value;
      if (!oldestKey) return;
      this.historyCache.delete(oldestKey);
    }
  }
}

export const poller = new StockPoller();
