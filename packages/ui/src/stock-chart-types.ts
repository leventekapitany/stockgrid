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

export interface StockChartHover {
  price: number;
  change: number;
  changePercent: number | null;
  time: string;
}
