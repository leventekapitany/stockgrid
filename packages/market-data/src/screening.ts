import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

export const SCREEN_SORT_BY = [
  "pe",
  "marketCap",
  "changePercent",
  "dividendYield",
  "none",
] as const;

export type ScreenSortBy = (typeof SCREEN_SORT_BY)[number];

export interface ScreenedStock {
  symbol: string;
  name: string | null;
}

interface RawScreenQuote {
  symbol?: string;
  regularMarketPrice?: number;
  shortName?: string;
  longName?: string;
  displayName?: string;
  trailingPE?: number;
  marketCap?: number;
  regularMarketChangePercent?: number;
  dividendYield?: number;
  trailingAnnualDividendYield?: number;
}

interface Candidate {
  symbol: string;
  name: string | null;
  order: number;
  pe: number | null;
  marketCap: number | null;
  changePercent: number | null;
  dividendYield: number | null;
}

// Upper bound on how many AI-suggested tickers we'll verify against Yahoo in one go.
const MAX_CANDIDATES = 40;

/**
 * Verify a list of candidate ticker symbols against Yahoo Finance, then rank
 * them by the requested metric and return the top `count`.
 *
 * Symbols that Yahoo can't price (typos / hallucinated tickers) are dropped.
 */
export async function screenSymbols(
  symbols: string[],
  sortBy: ScreenSortBy,
  count: number,
): Promise<ScreenedStock[]> {
  const cleaned = dedupe(
    symbols
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0 && s.length <= 16),
  ).slice(0, MAX_CANDIDATES);

  if (cleaned.length === 0) return [];

  let rawQuotes: RawScreenQuote[];
  try {
    rawQuotes = (await yahooFinance.quote(
      cleaned,
      { return: "array" },
      { validateResult: false },
    )) as RawScreenQuote[];
  } catch {
    return [];
  }

  const bySymbol = new Map<string, RawScreenQuote>();
  for (const raw of rawQuotes) {
    if (raw.symbol) bySymbol.set(raw.symbol.toUpperCase(), raw);
  }

  const candidates: Candidate[] = [];
  cleaned.forEach((symbol, order) => {
    const raw = bySymbol.get(symbol);
    // Drop anything Yahoo couldn't price — keeps invalid/hallucinated tickers out.
    if (!raw || raw.regularMarketPrice === undefined) return;

    candidates.push({
      symbol,
      name: raw.shortName ?? raw.longName ?? raw.displayName ?? null,
      order,
      pe: raw.trailingPE ?? null,
      marketCap: raw.marketCap ?? null,
      changePercent: raw.regularMarketChangePercent ?? null,
      dividendYield: raw.dividendYield ?? raw.trailingAnnualDividendYield ?? null,
    });
  });

  sortCandidates(candidates, sortBy);

  const take = Math.max(1, Math.min(count, candidates.length));
  return candidates.slice(0, take).map(({ symbol, name }) => ({ symbol, name }));
}

function sortCandidates(candidates: Candidate[], sortBy: ScreenSortBy) {
  switch (sortBy) {
    case "pe":
      // Lowest positive P/E first (classic "cheap by earnings"); missing P/E last.
      candidates.sort((a, b) => {
        const av = a.pe != null && a.pe > 0 ? a.pe : Infinity;
        const bv = b.pe != null && b.pe > 0 ? b.pe : Infinity;
        return av - bv || a.order - b.order;
      });
      break;
    case "marketCap":
      candidates.sort(byNumberDesc((c) => c.marketCap));
      break;
    case "changePercent":
      candidates.sort(byNumberDesc((c) => c.changePercent));
      break;
    case "dividendYield":
      candidates.sort(byNumberDesc((c) => c.dividendYield));
      break;
    case "none":
      candidates.sort((a, b) => a.order - b.order);
      break;
  }
}

function byNumberDesc(pick: (c: Candidate) => number | null) {
  return (a: Candidate, b: Candidate) => {
    const av = pick(a) ?? -Infinity;
    const bv = pick(b) ?? -Infinity;
    return bv - av || a.order - b.order;
  };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
