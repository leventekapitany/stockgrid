import { useState } from "react";

import type { HistoryRange } from "@stock/validators";
import {
  DEFAULT_HISTORY_RANGE,
  getHistoryRangeTimeDisplayMode,
} from "@stock/market-data/range-policy";
import { Button } from "@stock/ui/button";

import { DEFAULT_SYMBOLS, MAX_CHARTS } from "./constants";
import { GlobalRangeSelector } from "./global-range-selector";
import { StockSearchDialog } from "./stock-search-dialog";
import { TickerItem } from "./ticker-item";

export function WatchlistPage() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [range, setRange] = useState<HistoryRange>(DEFAULT_HISTORY_RANGE);
  const chartTimeDisplayMode = getHistoryRangeTimeDisplayMode(range);
  const canAddSymbol = symbols.length < MAX_CHARTS;

  const addSymbol = (symbol: string) => {
    const next = symbol.trim().toUpperCase();
    if (!next || symbols.includes(next) || !canAddSymbol) return;
    setSymbols((prev) => [...prev, next]);
  };

  const addSymbols = (incoming: string[]) => {
    setSymbols((prev) => {
      const seen = new Set(prev);
      const merged = [...prev];
      for (const raw of incoming) {
        const next = raw.trim().toUpperCase();
        if (!next || seen.has(next) || merged.length >= MAX_CHARTS) continue;
        seen.add(next);
        merged.push(next);
      }
      return merged;
    });
  };

  const removeSymbol = (symbol: string) =>
    setSymbols((prev) => prev.filter((s) => s !== symbol));

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 lg:max-w-6xl">
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!canAddSymbol}
          onClick={() => setIsSearchOpen(true)}
          className="justify-self-start rounded-md"
        >
          Add stock
        </Button>

        <GlobalRangeSelector range={range} onRangeChange={setRange} />
      </div>

      <div className="divide-border divide-y lg:grid lg:grid-cols-2 lg:gap-3 lg:divide-y-0">
        {symbols.map((symbol) => (
          <TickerItem
            key={symbol}
            symbol={symbol}
            range={range}
            chartTimeDisplayMode={chartTimeDisplayMode}
            onRemove={() => removeSymbol(symbol)}
          />
        ))}
      </div>

      {symbols.length === 0 && (
        <p className="text-muted-foreground py-16 text-center text-sm">
          No symbols yet. Add one above.
        </p>
      )}

      <footer className="mt-6 text-center">
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground/60 cursor-default text-xs"
        >
          Charts by TradingView
        </a>
      </footer>

      <StockSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        symbols={symbols}
        canAddSymbol={canAddSymbol}
        onAddSymbol={addSymbol}
        onAddSymbols={addSymbols}
      />
    </main>
  );
}
