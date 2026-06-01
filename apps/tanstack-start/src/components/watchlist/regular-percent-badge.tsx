import { cn } from "@stock/ui";

import { formatSignedPercent } from "./formatters";

export function RegularPercentBadge({ value }: { value?: number | null }) {
  if (value == null) return null;

  return (
    <span
      className={cn(
        "mt-0.5 inline-block rounded-sm px-2 py-0.5 font-mono text-xs font-semibold text-white tabular-nums",
        value >= 0 ? "bg-semantic-up" : "bg-semantic-down",
      )}
    >
      {formatSignedPercent(value)}
    </span>
  );
}
