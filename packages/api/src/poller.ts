import type {
  HistoryBar,
  HistoryRange,
  Quote,
  SearchResult,
} from "@stock/validators";

export interface MarketDataHandle {
  subscribe(symbol: string, emit: (quote: Quote) => void): () => void;
  peek(symbol: string): Quote | undefined;
  search(query: string): Promise<SearchResult[]>;
  history(symbol: string, range: HistoryRange): Promise<HistoryBar[]>;
}
