import type {
  IChartApi,
  IPriceLine,
  ISeriesApi,
  LineData,
  MouseEventParams,
  Time,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import {
  BaselineSeries,
  ColorType,
  createChart,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";

import { cn } from "@stock/ui";
import { useTheme } from "@stock/ui/theme";

export interface StockChartBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  session: "regular" | "post";
}

type ChartTimeDisplayMode = "intraday" | "calendar";

interface HoverState {
  x: number;
  y: number;
  price: number;
  time: string;
  positive: boolean;
}

export function StockChart({
  data,
  className,
  interactive = true,
  timeDisplayMode = "intraday",
}: {
  data: StockChartBar[];
  className?: string;
  interactive?: boolean;
  timeDisplayMode?: ChartTimeDisplayMode;
}) {
  const { resolvedTheme } = useTheme();
  const [hover, setHover] = useState<HoverState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Baseline"> | null>(null);
  const startLineRef = useRef<IPriceLine | null>(null);
  const barsByTimeRef = useRef(new Map<number, StockChartBar>());
  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
      }),
    [],
  );
  const isCalendarTime = timeDisplayMode === "calendar";

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
    const container = containerRef.current;
    if (!container || data.length === 0) return;

    const rootStyle = getComputedStyle(document.documentElement);
    const upColor = rootStyle.getPropertyValue("--chart-2").trim() || "#05b169";
    const downColor =
      rootStyle.getPropertyValue("--chart-3").trim() || "#cf202f";

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "transparent",
        attributionLogo: false,
      },
      grid: {
        horzLines: { visible: false },
        vertLines: { visible: false },
      },
      crosshair: interactive
        ? {
            mode: CrosshairMode.Magnet,
            horzLine: {
              color: "rgba(124, 130, 138, 0.45)",
              labelVisible: false,
              visible: true,
            },
            vertLine: {
              color: "rgba(124, 130, 138, 0.55)",
              labelVisible: false,
              style: LineStyle.Dashed,
              visible: true,
            },
          }
        : {
            horzLine: { visible: false },
            vertLine: { visible: false },
          },
      leftPriceScale: { visible: false },
      rightPriceScale: { visible: false },
      timeScale: {
        visible: false,
        borderVisible: false,
      },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(BaselineSeries, {
      baseValue: { type: "price", price: 0 },
      lineWidth: interactive ? 2 : 1,
      topLineColor: upColor,
      bottomLineColor: downColor,
      topFillColor1: "rgba(5, 177, 105, 0.24)",
      topFillColor2: "rgba(5, 177, 105, 0.04)",
      bottomFillColor1: "rgba(207, 32, 47, 0.04)",
      bottomFillColor2: "rgba(207, 32, 47, 0.24)",
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleCrosshairMove = (param: MouseEventParams<Time>) => {
      const point = param.point;
      const datum = param.seriesData.get(series) as LineData<Time> | undefined;

      if (!point || !datum || typeof datum.value !== "number") {
        setHover(null);
        return;
      }

      const y = series.priceToCoordinate(datum.value);
      const x = chart.timeScale().timeToCoordinate(datum.time);
      if (x === null || y === null) {
        setHover(null);
        return;
      }

      const timeValue = typeof datum.time === "number" ? datum.time : null;
      const bar = timeValue ? barsByTimeRef.current.get(timeValue) : undefined;
      const startPrice = barsByTimeRef.current.values().next().value?.close;

      const date = bar ? new Date(bar.time * 1000) : null;
      const timeLabel = date
        ? isCalendarTime
          ? dateFormatter.format(date)
          : format(date, "HH:mm")
        : "";

      setHover({
        x,
        y,
        price: datum.value,
        time: timeLabel,
        positive: startPrice === undefined ? true : datum.value >= startPrice,
      });
    };

    if (interactive) {
      chart.subscribeCrosshairMove(handleCrosshairMove);
    }

    return () => {
      if (interactive) {
        chart.unsubscribeCrosshairMove(handleCrosshairMove);
      }
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      startLineRef.current = null;
    };
  }, [data.length, resolvedTheme, isCalendarTime, dateFormatter, interactive]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    const startPrice = data[0]?.close;
    if (!series || !chart || startPrice === undefined) return;

    barsByTimeRef.current = new Map(data.map((bar) => [bar.time, bar]));
    series.applyOptions({
      baseValue: { type: "price", price: startPrice },
    });
    series.setData(
      data.map((bar) => ({ time: bar.time as Time, value: bar.close })),
    );

    if (startLineRef.current) {
      series.removePriceLine(startLineRef.current);
    }
    startLineRef.current = series.createPriceLine({
      price: startPrice,
      color: "rgba(124, 130, 138, 0.55)",
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: false,
      title: "",
    });
    chart.timeScale().fitContent();
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
      <div ref={containerRef} className="h-full w-full" />
      {interactive && hover && (
        <>
          <div
            className={cn(
              "border-background pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
              hover.positive ? "bg-semantic-up" : "bg-semantic-down",
            )}
            style={{ left: hover.x, top: hover.y }}
          />
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md bg-[#16181c] px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-sm"
            style={{
              left: hover.x,
              top: Math.max(6, hover.y - 44),
            }}
          >
            {priceFormatter.format(hover.price)}{" "}
            <span className="text-white/55">{hover.time}</span>
          </div>
        </>
      )}
    </div>
  );
}
