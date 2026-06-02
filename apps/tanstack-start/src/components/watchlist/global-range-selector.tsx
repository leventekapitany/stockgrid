import type { HistoryRange } from "@stock/validators";
import { HISTORY_RANGES } from "@stock/market-data/range-policy";
import { cn } from "@stock/ui";

export function GlobalRangeSelector({
  range,
  onRangeChange,
}: {
  range: HistoryRange;
  onRangeChange: (range: HistoryRange) => void;
}) {
  return (
    <div className="min-w-0">
      <select
        value={range}
        onChange={(event) => onRangeChange(event.target.value as HistoryRange)}
        aria-label="Chart interval"
        className="border-border bg-background text-foreground h-10 w-full rounded-md border px-3 font-mono text-sm lg:hidden"
      >
        {HISTORY_RANGES.map((nextRange) => (
          <option key={nextRange} value={nextRange}>
            {nextRange}
          </option>
        ))}
      </select>

      <div className="hidden h-10 flex-wrap items-center justify-end gap-1 lg:flex">
        {HISTORY_RANGES.map((nextRange) => (
          <button
            key={nextRange}
            type="button"
            onClick={() => onRangeChange(nextRange)}
            className={cn(
              "text-muted-foreground hover:bg-background hover:text-foreground cursor-pointer rounded px-2 py-1 text-[11px] font-medium transition-colors",
              range === nextRange && "bg-background text-foreground shadow-xs",
            )}
          >
            {nextRange}
          </button>
        ))}
      </div>
    </div>
  );
}
