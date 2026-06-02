import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import type { SearchResult } from "@stock/validators";
import { AI_SEARCH_MAX_LENGTH } from "@stock/validators";
import { cn } from "@stock/ui";
import { Button } from "@stock/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@stock/ui/dialog";
import { Input } from "@stock/ui/input";
import { toast } from "@stock/ui/toast";

import { authClient } from "~/auth/client";
import { useTRPC } from "~/lib/trpc";

const GRADIENT = "bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500";

export function StockSearchDialog({
  open,
  onOpenChange,
  symbols,
  canAddSymbol,
  onAddSymbol,
  onAddSymbols,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbols: string[];
  canAddSymbol: boolean;
  onAddSymbol: (symbol: string) => void;
  onAddSymbols: (symbols: string[]) => void;
}) {
  const trpc = useTRPC();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const [aiEnabled, setAiEnabled] = useState(false);
  const [query, setQuery] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");

  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, 250);
  const knownSymbols = new Set(symbols);

  const suggest = useMutation(
    trpc.ai.suggestStocks.mutationOptions({
      onSuccess: (data) => {
        onAddSymbols(data.symbols.map((s) => s.symbol));
        toast.success(
          `Added ${data.symbols.length} ${
            data.symbols.length === 1 ? "stock" : "stocks"
          } to your watchlist.`,
        );
        changeOpen(false);
      },
    }),
  );

  const search = useQuery({
    ...trpc.ticker.search.queryOptions({ query: debouncedQuery || " " }),
    enabled: open && !aiEnabled && debouncedQuery.length >= 2,
  });

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) {
      setQuery("");
      setAiPrompt("");
      setAiEnabled(false);
      suggest.reset();
    }
    onOpenChange(nextOpen);
  }

  const enableAi = () => {
    suggest.reset();
    setAiEnabled(true);
  };

  const disableAi = () => {
    suggest.reset();
    setAiEnabled(false);
  };

  const trimmedPrompt = aiPrompt.trim();
  const signedIn = !!session;
  const canSubmitAi =
    aiEnabled &&
    signedIn &&
    canAddSymbol &&
    trimmedPrompt.length > 0 &&
    !suggest.isPending;

  const selectResult = (result: SearchResult) => {
    if (knownSymbols.has(result.symbol) || !canAddSymbol) return;
    onAddSymbol(result.symbol);
    changeOpen(false);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!aiEnabled || !canSubmitAi) return;
    suggest.mutate({ prompt: trimmedPrompt });
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[min(720px,calc(100dvh-2rem))] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-border border-b px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
          <DialogTitle className="flex items-center gap-2">
            Add stock
            {aiEnabled && (
              <button
                type="button"
                onClick={disableAi}
                aria-label="Disable AI search"
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90",
                  GRADIENT,
                )}
              >
                AI <span aria-hidden>✕</span>
              </button>
            )}
          </DialogTitle>
          <DialogDescription>
            {aiEnabled
              ? "Describe what you want — AI builds the list."
              : "Search by ticker or company name."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="px-4 pt-4 pb-4 sm:px-5">
          <div className="flex items-center gap-2">
            {/* Same input slot in both modes — gradient border when AI is on */}
            {aiEnabled ? (
              <div className={cn("h-12 min-w-0 flex-1 rounded-xl p-[2px]", GRADIENT)}>
                <Input
                  autoFocus
                  value={aiPrompt}
                  maxLength={AI_SEARCH_MAX_LENGTH}
                  disabled={suggest.isPending}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="top 10 financial stocks"
                  className="bg-background h-full rounded-[10px] border-0 focus-visible:ring-0"
                />
              </div>
            ) : (
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a ticker..."
                className="min-w-0 flex-1 uppercase placeholder:normal-case"
              />
            )}

            {aiEnabled ? (
              <Button
                type="submit"
                disabled={!canSubmitAi}
                className="shrink-0 gap-1.5"
              >
                {suggest.isPending ? "Working…" : "✨ Generate"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={enableAi}
                className="shrink-0 gap-1.5 shadow-[0_0_22px_-2px] shadow-violet-500/60 transition-shadow hover:shadow-violet-500/90"
              >
                <span aria-hidden>✨</span> Search with AI
              </Button>
            )}
          </div>
        </form>

        {/* Body */}
        {aiEnabled ? (
          <AiBody
            sessionPending={sessionPending}
            signedIn={signedIn}
            isPending={suggest.isPending}
            error={suggest.isError ? suggest.error.message : null}
          />
        ) : (
          <SearchResults
            results={search.data ?? []}
            query={trimmedQuery}
            isDebouncing={trimmedQuery !== debouncedQuery}
            isLoading={search.isFetching}
            isError={search.isError}
            knownSymbols={knownSymbols}
            canAddSymbol={canAddSymbol}
            onSelect={selectResult}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const AI_LOADING_LINES = [
  "Reading your prompt…",
  "Gathering tickers…",
  "Querying the market…",
  "Fetching live quotes…",
  "Checking fundamentals…",
  "Ranking your results…",
];

function AiBody({
  sessionPending,
  signedIn,
  isPending,
  error,
}: {
  sessionPending: boolean;
  signedIn: boolean;
  isPending: boolean;
  error: string | null;
}) {
  if (isPending) {
    return (
      <div className="px-4 py-10 sm:px-5">
        <AiLoadingLines />
      </div>
    );
  }

  if (sessionPending) return null;

  if (!signedIn) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-9 text-center sm:px-5">
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-full text-lg text-white",
            GRADIENT,
          )}
          aria-hidden
        >
          ✨
        </div>
        <p className="text-muted-foreground max-w-xs text-sm">
          To use AI features, please sign in.
        </p>
        <Button
          type="button"
          onClick={() => {
            void authClient.signIn.social({
              provider: "google",
              callbackURL: "/",
            });
          }}
        >
          Sign in with Google
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 pt-3 pb-5 sm:px-5">
        <p className="border-semantic-down/30 bg-semantic-down/10 text-semantic-down rounded-lg border px-3 py-2.5 text-sm">
          {error}
        </p>
      </div>
    );
  }

  return null;
}

function AiLoadingLines() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % AI_LOADING_LINES.length);
    }, 1300);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-center gap-3">
      <span
        className="size-4 shrink-0 animate-spin rounded-full border-2 border-violet-500/25 border-t-violet-500"
        aria-hidden
      />
      <span
        key={index}
        className={cn(
          "animate-in fade-in slide-in-from-bottom-1 bg-clip-text text-sm font-medium text-transparent duration-300",
          GRADIENT,
        )}
      >
        {AI_LOADING_LINES[index]}
      </span>
    </div>
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
      <BodyState>
        Type at least 2 characters to search global market symbols.
      </BodyState>
    );
  }

  if (isLoading || isDebouncing) {
    return <BodyState>Searching...</BodyState>;
  }

  if (isError) {
    return <BodyState>Search is unavailable right now.</BodyState>;
  }

  if (results.length === 0) {
    return <BodyState>No matches found.</BodyState>;
  }

  return (
    <div className="mt-2 max-h-[420px] overflow-y-auto px-2 pb-2 sm:px-3 sm:pb-3">
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
                className={cn(
                  "inline-flex h-9 shrink-0 items-center justify-center rounded-full px-4 text-sm font-semibold",
                  disabled
                    ? "bg-secondary text-[#a8acb3]"
                    : "bg-primary text-primary-foreground",
                )}
              >
                {alreadyAdded ? "Added" : canAddSymbol ? "Add" : "Limit reached"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BodyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground px-4 py-10 text-center text-sm sm:px-5">
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
