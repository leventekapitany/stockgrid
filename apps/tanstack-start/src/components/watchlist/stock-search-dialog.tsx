import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { SearchResult } from "@stock/validators";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@stock/ui/dialog";
import { Input } from "@stock/ui/input";

import { useTRPC } from "~/lib/trpc";

export function StockSearchDialog({
  open,
  onOpenChange,
  symbols,
  canAddSymbol,
  onAddSymbol,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbols: string[];
  canAddSymbol: boolean;
  onAddSymbol: (symbol: string) => void;
}) {
  const trpc = useTRPC();
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, 250);
  const knownSymbols = new Set(symbols);

  const search = useQuery({
    ...trpc.ticker.search.queryOptions({ query: debouncedQuery || " " }),
    enabled: open && debouncedQuery.length >= 2,
  });

  const results = search.data ?? [];

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) setQuery("");
    onOpenChange(nextOpen);
  };

  const selectResult = (result: SearchResult) => {
    if (knownSymbols.has(result.symbol) || !canAddSymbol) return;
    onAddSymbol(result.symbol);
    changeOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[min(720px,calc(100dvh-2rem))] overflow-hidden p-0">
        <DialogHeader className="border-border border-b px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
          <DialogTitle>Add stock</DialogTitle>
          <DialogDescription>
            Search by ticker or company name.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 sm:px-5">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search stocks..."
            className="uppercase"
          />
        </div>

        <SearchResults
          results={results}
          query={trimmedQuery}
          isDebouncing={trimmedQuery !== debouncedQuery}
          isLoading={search.isFetching}
          isError={search.isError}
          knownSymbols={knownSymbols}
          canAddSymbol={canAddSymbol}
          onSelect={selectResult}
        />
      </DialogContent>
    </Dialog>
  );
}

function SearchResults({
  results,
  query,
  isDebouncing,
  isLoading,
  isError,
  knownSymbols,
  canAddSymbol,
  onSelect,
}: {
  results: SearchResult[];
  query: string;
  isDebouncing: boolean;
  isLoading: boolean;
  isError: boolean;
  knownSymbols: Set<string>;
  canAddSymbol: boolean;
  onSelect: (result: SearchResult) => void;
}) {
  if (query.length < 2) {
    return (
      <SearchState>
        Type at least 2 characters to search global market symbols.
      </SearchState>
    );
  }

  if (isLoading || isDebouncing) {
    return <SearchState>Searching...</SearchState>;
  }

  if (isError) {
    return <SearchState>Search is unavailable right now.</SearchState>;
  }

  if (results.length === 0) {
    return <SearchState>No matches found.</SearchState>;
  }

  return (
    <div className="max-h-[420px] overflow-y-auto px-2 pb-2 sm:px-3 sm:pb-3">
      <div className="divide-border divide-y">
        {results.map((result) => {
          const alreadyAdded = knownSymbols.has(result.symbol);
          const disabled = alreadyAdded || !canAddSymbol;

          return (
            <button
              key={`${result.symbol}:${result.exchange ?? ""}`}
              type="button"
              onClick={() => onSelect(result)}
              disabled={disabled}
              className="hover:bg-accent focus-visible:bg-accent flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-55 sm:px-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className="font-mono text-sm font-bold">
                    {result.symbol}
                  </span>
                  {result.name && (
                    <span className="text-muted-foreground truncate text-sm">
                      {result.name}
                    </span>
                  )}
                </div>
                <div className="text-muted-foreground mt-1 flex flex-wrap gap-1.5 text-xs">
                  <MetaPill value={result.exchange} />
                  <MetaPill value={result.type} />
                  <MetaPill value={result.currency} />
                  <MetaPill value={result.region} />
                </div>
              </div>

              <span
                className={[
                  "inline-flex h-9 shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold",
                  disabled
                    ? "bg-secondary text-[#a8acb3]"
                    : "bg-primary text-primary-foreground",
                ].join(" ")}
              >
                {alreadyAdded
                  ? "Added"
                  : canAddSymbol
                    ? "Add"
                    : "Limit reached"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SearchState({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground px-4 py-12 text-center text-sm sm:px-5">
      {children}
    </div>
  );
}

function MetaPill({ value }: { value?: string | null }) {
  if (!value) return null;

  return (
    <span className="border-border bg-muted/60 rounded-full border px-2 py-0.5">
      {value}
    </span>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, value]);

  return debounced;
}
