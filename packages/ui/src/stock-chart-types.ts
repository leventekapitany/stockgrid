export interface StockChartBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  session: "regular" | "post";
}

export type ChartTimeDisplayMode = "intraday" | "calendar";

export type StockChartRange =
  | "1D"
  | "5D"
  | "1M"
  | "3M"
  | "6M"
  | "1Y"
  | "5Y"
  | "MAX";

export interface StockChartHover {
  price: number;
  change: number;
  changePercent: number | null;
  time: string;
}
