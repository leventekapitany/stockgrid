import type {
  BaselineData,
  IChartApi,
  IPriceLine,
  ISeriesApi,
  LineData,
  MouseEventParams,
  Time,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { MismatchDirection } from "lightweight-charts";

import { cn } from "@stock/ui";
import { useTheme } from "@stock/ui/theme";

import type {
  ChartTimeDisplayMode,
  StockChartBar,
  StockChartHover,
} from "./stock-chart-types";
import { createStockChartParts } from "./stock-chart-core";
import {
  animateChartData,
  applyChartData,
  shouldAnimateChartData,
} from "./stock-chart-data";

export type {
  ChartTimeDisplayMode,
  StockChartBar,
  StockChartHover,
} from "./stock-chart-types";

interface HoverState {
  x: number;
  y: number;
  price: number;
  change: number;
  changePercent: number | null;
  time: string;
  positive: boolean;
}

export function StockChart({
  data,
  className,
  interactive = true,
  timeDisplayMode = "intraday",
  onHoverChange,
}: {
  data: StockChartBar[];
  className?: string;
  interactive?: boolean;
  timeDisplayMode?: ChartTimeDisplayMode;
  onHoverChange?: (hover: StockChartHover | null) => void;
}) {
  const { resolvedTheme } = useTheme();
  const [hover, setHover] = useState<HoverState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Baseline"> | null>(null);
  const startLineRef = useRef<IPriceLine | null>(null);
  const barsByTimeRef = useRef(new Map<number, StockChartBar>());
  const dataRef = useRef(data);
  const renderedDataRef = useRef<StockChartBar[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const hoverResetFrameRef = useRef<number | null>(null);
  const onHoverChangeRef = useRef(onHoverChange);
  const isCalendarTimeRef = useRef(timeDisplayMode === "calendar");
  const isCalendarTime = timeDisplayMode === "calendar";
  const hasData = data.length > 0;

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [],
  );

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    onHoverChangeRef.current = onHoverChange;
  }, [onHoverChange]);

  useEffect(() => {
    isCalendarTimeRef.current = isCalendarTime;
  }, [isCalendarTime]);

  useEffect(() => {
    const container = containerRef.current;
    const currentData = dataRef.current;
    if (!container || currentData.length === 0) return;

    const { chart, series } = createStockChartParts(container, interactive);

    chartRef.current = chart;
    seriesRef.current = series;
    barsByTimeRef.current = new Map(currentData.map((bar) => [bar.time, bar]));
    startLineRef.current = applyChartData(
      series,
      chart,
      currentData,
      startLineRef.current,
    );
    renderedDataRef.current = currentData;

    const clearHover = () => {
      chart.clearCrosshairPosition();
      setHover(null);
      onHoverChangeRef.current?.(null);
    };

    const showHover = (datum: LineData<Time>) => {
      if (typeof datum.value !== "number") {
        setHover(null);
        onHoverChangeRef.current?.(null);
        return;
      }

      const y = series.priceToCoordinate(datum.value);
      const x = chart.timeScale().timeToCoordinate(datum.time);
      if (x === null || y === null) {
        setHover(null);
        onHoverChangeRef.current?.(null);
        return;
      }

      const timeValue = typeof datum.time === "number" ? datum.time : null;
      const bar = timeValue ? barsByTimeRef.current.get(timeValue) : undefined;
      const startPrice = barsByTimeRef.current.values().next().value?.close;
      const change = startPrice === undefined ? 0 : datum.value - startPrice;
      const changePercent =
        startPrice === undefined || startPrice === 0
          ? null
          : (change / startPrice) * 100;

      const date = bar ? new Date(bar.time * 1000) : null;
      const timeLabel = date
        ? isCalendarTimeRef.current
          ? dateFormatter.format(date)
          : format(date, "HH:mm")
        : "";

      const nextHover = {
        price: datum.value,
        change,
        changePercent,
        time: timeLabel,
      };

      setHover({
        x,
        y,
        ...nextHover,
        positive: change >= 0,
      });
      onHoverChangeRef.current?.(nextHover);
    };

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      const datum = param.seriesData.get(series) as LineData<Time> | undefined;

      if (!param.point || !datum) {
        clearHover();
        return;
      }

      showHover(datum);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!interactive) return;
      if (event.pointerType === "mouse") return;

      const logical = chart.timeScale().coordinateToLogical(event.offsetX);
      if (logical === null) {
        clearHover();
        return;
      }

      const datum = series.dataByIndex(
        Math.round(logical),
        MismatchDirection.NearestLeft,
      ) as BaselineData<Time> | null;
      if (!datum) {
        clearHover();
        return;
      }

      chart.setCrosshairPosition(datum.value, datum.time, series);
      showHover(datum);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!interactive) return;
      if (event.pointerType === "mouse") return;
      container.setPointerCapture(event.pointerId);
      handlePointerMove(event);
    };

    if (interactive) {
      chart.subscribeCrosshairMove(handleCrosshairMove);
      container.addEventListener("pointerdown", handlePointerDown);
      container.addEventListener("pointermove", handlePointerMove);
      container.addEventListener("pointerup", clearHover);
      container.addEventListener("pointercancel", clearHover);
      container.addEventListener("pointerleave", clearHover);
    }

    return () => {
      if (interactive) {
        chart.unsubscribeCrosshairMove(handleCrosshairMove);
        container.removeEventListener("pointerdown", handlePointerDown);
        container.removeEventListener("pointermove", handlePointerMove);
        container.removeEventListener("pointerup", clearHover);
        container.removeEventListener("pointercancel", clearHover);
        container.removeEventListener("pointerleave", clearHover);
      }
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      startLineRef.current = null;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (hoverResetFrameRef.current !== null) {
        cancelAnimationFrame(hoverResetFrameRef.current);
        hoverResetFrameRef.current = null;
      }
      onHoverChangeRef.current?.(null);
    };
  }, [hasData, resolvedTheme, dateFormatter, interactive]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    const startPrice = data[0]?.close;
    if (!series || !chart || startPrice === undefined) return;

    barsByTimeRef.current = new Map(data.map((bar) => [bar.time, bar]));
    if (hoverResetFrameRef.current !== null) {
      cancelAnimationFrame(hoverResetFrameRef.current);
    }
    hoverResetFrameRef.current = requestAnimationFrame(() => {
      hoverResetFrameRef.current = null;
      setHover(null);
      onHoverChangeRef.current?.(null);
    });

    const previousData = renderedDataRef.current;
    if (shouldAnimateChartData(previousData, data)) {
      startLineRef.current = animateChartData({
        series,
        chart,
        fromData: previousData,
        toData: data,
        startLine: startLineRef.current,
        animationFrameRef,
        onComplete: () => {
          renderedDataRef.current = data;
        },
      });
      return;
    }

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startLineRef.current = applyChartData(
      series,
      chart,
      data,
      startLineRef.current,
    );
    renderedDataRef.current = data;
  }, [data]);

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex h-24 items-center justify-center text-xs",
          className,
        )}
      >
        error
      </div>
    );
  }

  return (
    <div className={cn("relative h-24 w-full", className)}>
      <div ref={containerRef} className="h-full w-full touch-none" />
      {interactive && hover && (
        <>
          <div
            className="pointer-events-none absolute top-0 right-0 bottom-0 z-10"
            style={{
              left: hover.x,
              backgroundColor:
                resolvedTheme === "dark"
                  ? "rgba(0, 0, 0, 0.58)"
                  : "rgba(255, 255, 255, 0.58)",
            }}
          />
          <div
            className={cn(
              "border-background pointer-events-none absolute z-20 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
              hover.positive ? "bg-semantic-up" : "bg-semantic-down",
            )}
            style={{ left: hover.x, top: hover.y }}
          />
        </>
      )}
    </div>
  );
}
