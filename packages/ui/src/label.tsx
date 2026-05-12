"use client";

import { Label as LabelPrimitive } from "radix-ui";

import { cn } from "@stock/ui";

export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "text-foreground flex items-center gap-2 text-sm leading-none font-semibold select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-[#a8acb3] peer-disabled:cursor-not-allowed peer-disabled:text-[#a8acb3]",
        className,
      )}
      {...props}
    />
  );
}
