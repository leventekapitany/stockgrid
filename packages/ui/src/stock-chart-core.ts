import type { IChartApi, ISeriesApi } from "lightweight-charts";
import {
  BaselineSeries,
  ColorType,
  createChart,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";

export function createStockChartParts(
  container: HTMLDivElement,
  { interactive }: { interactive: boolean },
): {
  chart: IChartApi;
  series: ISeriesApi<"Baseline">;
} {
  const { textColor, upColor, downColor } = getChartThemeColors();
  const chart = createChart(container, {
    width: container.clientWidth,
    height: container.clientHeight,
    autoSize: true,
    layout: {
      background: { type: ColorType.Solid, color: "transparent" },
      textColor,
      attributionLogo: false,
      fontSize: 10,
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
    rightPriceScale: {
      visible: false,
      // Keep the series clear of the time-axis labels overlaid along the
      // bottom edge (~16px) while leaving headroom for the hover dot on top.
      scaleMargins: { top: 0.1, bottom: 0.24 },
    },
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

  return { chart, series };
}

function getChartThemeColors() {
  const rootStyle = getComputedStyle(document.documentElement);

  return {
    textColor:
      rootStyle.getPropertyValue("--muted-foreground").trim() || "#7c828a",
    upColor: rootStyle.getPropertyValue("--chart-2").trim() || "#05b169",
    downColor: rootStyle.getPropertyValue("--chart-3").trim() || "#cf202f",
  };
}
