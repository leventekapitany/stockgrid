import { useEffect, useLayoutEffect, useRef } from "react";

import { cn } from "@stock/ui";

type DigitDirection = "up" | "down";

type PriceSegment = {
  char: string;
  prevChar: string | null;
  animate: boolean;
  direction: DigitDirection;
};

function alignFormattedStrings(prev: string, next: string): PriceSegment[] {
  const offset = next.length - prev.length;

  return next.split("").map((char, index) => {
    const prevIndex = index - offset;
    const prevChar =
      prevIndex >= 0 && prevIndex < prev.length ? prev[prevIndex]! : null;
    const isDigit = /\d/.test(char);
    const prevDigit =
      prevChar && /\d/.test(prevChar) ? prevChar : null;
    const animate = isDigit && prevDigit != null && prevDigit !== char;

    return {
      char,
      prevChar: prevDigit,
      animate,
      direction:
        animate && Number(char) > Number(prevDigit) ? "up" : "down",
    };
  });
}

function charCellClass(char: string) {
  return cn(
    "inline-flex h-[1em] items-center justify-center overflow-hidden leading-none",
    /\d/.test(char) && "w-[1ch]",
  );
}

function StaticChar({ char }: { char: string }) {
  return <span className={charCellClass(char)}>{char}</span>;
}

function RollingDigit({
  char,
  prevChar,
  direction,
}: {
  char: string;
  prevChar: string;
  direction: DigitDirection;
}) {
  const innerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    const from =
      direction === "up" ? "translateY(0)" : "translateY(-50%)";
    const to =
      direction === "up" ? "translateY(-50%)" : "translateY(0)";

    inner.style.transition = "none";
    inner.style.transform = from;
    void inner.offsetHeight;
    inner.style.transition = "transform 300ms ease-out";
    inner.style.transform = to;
  }, [char, prevChar, direction]);

  const top = direction === "down" ? char : prevChar;
  const bottom = direction === "down" ? prevChar : char;

  return (
    <span
      className="inline-flex h-[1em] w-[1ch] items-start justify-center overflow-hidden leading-none"
      aria-hidden
    >
      <span ref={innerRef} className="flex flex-col">
        <span className="flex h-[1em] items-center justify-center">{top}</span>
        <span className="flex h-[1em] items-center justify-center">
          {bottom}
        </span>
      </span>
    </span>
  );
}

export function RollingPrice({
  value,
  liveValue,
  format,
  animate = true,
  className,
}: {
  value: number | undefined;
  liveValue?: number;
  format: Intl.NumberFormat;
  animate?: boolean;
  className?: string;
}) {
  const prevFormattedRef = useRef("");
  const formatted = value != null ? format.format(value) : null;
  const prevFormatted = prevFormattedRef.current;

  const trackValue = liveValue ?? value;
  const shouldAnimate =
    animate &&
    formatted != null &&
    prevFormatted !== "" &&
    trackValue != null &&
    formatted !== prevFormatted;

  const segments =
    formatted == null
      ? []
      : shouldAnimate
        ? alignFormattedStrings(prevFormatted, formatted)
        : formatted.split("").map((char) => ({
            char,
            prevChar: null,
            animate: false,
            direction: "up" as const,
          }));

  useEffect(() => {
    if (trackValue == null) return;
    prevFormattedRef.current = format.format(trackValue);
  }, [trackValue, format]);

  if (formatted == null) {
    return <span className={className}>—</span>;
  }

  return (
    <span className={cn("inline-flex items-end tabular-nums leading-none", className)}>
      {segments.map((segment, index) =>
        segment.animate && segment.prevChar ? (
          <RollingDigit
            key={`${index}-${segment.prevChar}-${segment.char}`}
            char={segment.char}
            prevChar={segment.prevChar}
            direction={segment.direction}
          />
        ) : (
          <StaticChar key={`${index}-${segment.char}`} char={segment.char} />
        ),
      )}
    </span>
  );
}
