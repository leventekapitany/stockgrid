import type {
  IChartApi,
  IPriceLine,
  ISeriesApi,
  Time,
} from "lightweight-charts";
import type { MutableRefObject } from "react";
import { LineStyle } from "lightweight-charts";

import type { StockChartBar } from "./stock-chart-types";

const CHART_ANIMATION_MS = 420;

export function applyChartData(
  series: ISeriesApi<"Baseline">,
  chart: IChartApi,
  data: StockChartBar[],
  previousStartLine: IPriceLine | null,
  { fitContent = true }: { fitContent?: boolean } = {},
) {
  const startPrice = data[0]?.close;
  if (startPrice === undefined) return null;

  series.applyOptions({
    baseValue: { type: "price", price: startPrice },
  });
  series.setData(toLineData(data));

  if (previousStartLine) {
    previousStartLine.applyOptions({ price: startPrice });
    if (fitContent) chart.timeScale().fitContent();
    return previousStartLine;
  }

  const startLine = createStartLine(series, startPrice);
  if (fitContent) chart.timeScale().fitContent();

  return startLine;
}

export function animateChartData({
  series,
  chart,
  fromData,
  toData,
  startLine,
  animationFrameRef,
  onComplete,
}: {
  series: ISeriesApi<"Baseline">;
  chart: IChartApi;
  fromData: StockChartBar[];
  toData: StockChartBar[];
  startLine: IPriceLine | null;
  animationFrameRef: MutableRefObject<number | null>;
  onComplete: () => void;
}) {
  if (animationFrameRef.current !== null) {
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }

  const fromStartPrice = fromData[0]?.close ?? toData[0]?.close;
  const toStartPrice = toData[0]?.close;
  if (fromStartPrice === undefined || toStartPrice === undefined) {
    return applyChartData(series, chart, toData, startLine);
  }

  let nextStartLine = startLine;
  nextStartLine ??= createStartLine(series, fromStartPrice);

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reducedMotion || fromData.length === 0) {
    const finalLine = applyChartData(series, chart, toData, nextStartLine);
    onComplete();
    return finalLine;
  }

  const startedAt = performance.now();
  let didFitTargetTimes = false;

  const renderFrame = (now: number) => {
    const progress = Math.min((now - startedAt) / CHART_ANIMATION_MS, 1);
    const eased = easeOutCubic(progress);
    const basePrice = lerp(fromStartPrice, toStartPrice, eased);

    series.applyOptions({
      baseValue: { type: "price", price: basePrice },
    });
    nextStartLine.applyOptions({ price: basePrice });
    series.setData(getInterpolatedLineData(fromData, toData, eased));

    if (!didFitTargetTimes) {
      chart.timeScale().fitContent();
      didFitTargetTimes = true;
    }

    if (progress < 1) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    animationFrameRef.current = null;
    applyChartData(series, chart, toData, nextStartLine, { fitContent: false });
    onComplete();
  };

  animationFrameRef.current = requestAnimationFrame(renderFrame);
  return nextStartLine;
}

export function shouldAnimateChartData(
  previousData: StockChartBar[],
  nextData: StockChartBar[],
) {
  if (previousData.length === 0 || nextData.length === 0) return false;
  if (previousData === nextData) return false;

  return (
    previousData.length !== nextData.length ||
    previousData[0]?.time !== nextData[0]?.time ||
    previousData.at(-1)?.time !== nextData.at(-1)?.time ||
    previousData.at(-1)?.close !== nextData.at(-1)?.close
  );
}

function toLineData(data: StockChartBar[]) {
  return data.map((bar) => ({ time: bar.time as Time, value: bar.close }));
}

function getInterpolatedLineData(
  fromData: StockChartBar[],
  toData: StockChartBar[],
  progress: number,
) {
  return toData.map((bar, index) => ({
    time: bar.time as Time,
    value: lerp(
      sampleCloseAtTargetIndex(fromData, toData.length, index),
      bar.close,
      progress,
    ),
  }));
}

function sampleCloseAtTargetIndex(
  data: StockChartBar[],
  targetLength: number,
  targetIndex: number,
) {
  if (data.length === 0) return 0;
  if (data.length === 1 || targetLength <= 1) return data[0]?.close ?? 0;

  const sourceIndex = (targetIndex / (targetLength - 1)) * (data.length - 1);
  const lowerIndex = Math.floor(sourceIndex);
  const upperIndex = Math.min(Math.ceil(sourceIndex), data.length - 1);
  const lower = data[lowerIndex]?.close ?? 0;
  const upper = data[upperIndex]?.close ?? lower;

  return lerp(lower, upper, sourceIndex - lowerIndex);
}

function createStartLine(series: ISeriesApi<"Baseline">, price: number) {
  return series.createPriceLine({
    price,
    color: "rgba(124, 130, 138, 0.55)",
    lineWidth: 1,
    lineStyle: LineStyle.Dashed,
    axisLabelVisible: false,
    title: "",
  });
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}
