import type { HistoryBar, HistoryRange, Quote } from "@stock/validators";

export interface MarketDataHandle {
  subscribe(symbol: string, emit: (quote: Quote) => void): () => void;
  peek(symbol: string): Quote | undefined;
  history(symbol: string, range: HistoryRange): Promise<HistoryBar[]>;
}
