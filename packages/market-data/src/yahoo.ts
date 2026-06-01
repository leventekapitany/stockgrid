import YahooFinance from "yahoo-finance2";

import type {
  HistoryBar,
  HistoryRange,
  MarketState,
  Quote,
  SearchResult,
} from "@stock/validators";

import { getHistoryRangeConfig } from "./range-policy";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

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

interface RawSearchResult {
  symbol?: string;
  longname?: string;
  shortname?: string;
  exchDisp?: string;
  exchange?: string;
  typeDisp?: string;
  quoteType?: string;
  region?: string;
  currency?: string;
}

export class YahooMarketDataAdapter {
  async quotes(symbols: string[]): Promise<Quote[]> {
    const rawQuotes = await yahooFinance.quote(symbols, {
      return: "array",
    });

    return rawQuotes
      .map((raw) => toQuote(raw as RawQuote))
      .filter((quote): quote is Quote => Boolean(quote));
  }

  async search(query: string): Promise<SearchResult[]> {
    const result = (await yahooFinance.search(
      query,
      {
        quotesCount: 12,
        newsCount: 0,
      },
      { validateResult: false },
    )) as { quotes?: RawSearchResult[] };

    return (result.quotes ?? [])
      .map((raw) => toSearchResult(raw))
      .filter((item): item is SearchResult => Boolean(item));
  }

  async history(symbol: string, range: HistoryRange): Promise<HistoryBar[]> {
    const config = getHistoryRangeConfig(range);
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
}

function toSearchResult(raw: RawSearchResult): SearchResult | null {
  if (!raw.symbol) return null;

  return {
    symbol: raw.symbol,
    name: raw.longname ?? raw.shortname ?? null,
    exchange: raw.exchDisp ?? raw.exchange ?? null,
    type: raw.typeDisp ?? raw.quoteType ?? null,
    region: raw.region ?? null,
    currency: raw.currency ?? null,
  };
}

function toHistoryBar(
  quote: RawChartQuote,
  result: RawChartResult,
  interval: ReturnType<typeof getHistoryRangeConfig>["interval"],
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
  interval: ReturnType<typeof getHistoryRangeConfig>["interval"],
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

function toQuote(raw: RawQuote): Quote | null {
  const marketState = normalizeMarketState(raw.marketState);
  const extendedHours = toExtendedHours(raw, marketState);
  const price = extendedHours?.price ?? raw.regularMarketPrice;

  if (price === undefined || raw.regularMarketPrice === undefined) return null;

  return {
    symbol: raw.symbol,
    price,
    change: raw.regularMarketChange ?? null,
    changePercent: raw.regularMarketChangePercent ?? null,
    regularPrice: raw.regularMarketPrice,
    regularChange: raw.regularMarketChange ?? null,
    regularChangePercent: raw.regularMarketChangePercent ?? null,
    extendedHours,
    marketState,
    currency: raw.currency ?? null,
    shortName: raw.shortName ?? null,
    timestamp: Date.now(),
  };
}

function toExtendedHours(raw: RawQuote, marketState: MarketState) {
  if (marketState === "PRE" || marketState === "PREPRE") {
    if (raw.preMarketPrice === undefined) return null;
    return {
      session: "pre" as const,
      price: raw.preMarketPrice,
      change: raw.preMarketChange ?? null,
      changePercent: raw.preMarketChangePercent ?? null,
    };
  }

  if (marketState === "POST" || marketState === "POSTPOST") {
    if (raw.postMarketPrice === undefined) return null;
    return {
      session: "post" as const,
      price: raw.postMarketPrice,
      change: raw.postMarketChange ?? null,
      changePercent: raw.postMarketChangePercent ?? null,
    };
  }

  return null;
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

export function hasQuoteChanged(prev: Quote, next: Quote) {
  return (
    prev.price !== next.price ||
    prev.change !== next.change ||
    prev.changePercent !== next.changePercent ||
    prev.extendedHours?.price !== next.extendedHours?.price ||
    prev.extendedHours?.change !== next.extendedHours?.change ||
    prev.extendedHours?.changePercent !== next.extendedHours?.changePercent
  );
}
