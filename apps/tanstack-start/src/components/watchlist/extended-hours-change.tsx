import type { Quote } from "@stock/validators";
import { cn, Moon } from "@stock/ui";

import { formatSignedPercent } from "./formatters";

export function ExtendedHoursChange({
  quote,
  className,
}: {
  quote?: Quote;
  className?: string;
}) {
  const extended = quote?.extendedHours;
  if (extended?.changePercent == null) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-end gap-1 font-mono text-xs tabular-nums",
        extended.changePercent >= 0 ? "text-semantic-up" : "text-semantic-down",
        className,
      )}
      title={`${extended.session === "post" ? "After-hours" : "Pre-market"} change`}
    >
      <span className="bg-chart-post/20 text-chart-post inline-flex size-4 items-center justify-center rounded-full">
        <Moon className="size-2.5" aria-hidden="true" />
      </span>
      <span>{formatSignedPercent(extended.changePercent)}</span>
    </div>
  );
}
