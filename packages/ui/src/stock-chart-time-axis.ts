import type { StockChartBar, StockChartRange } from "./stock-chart-types";

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export interface PositionedStockChartAxisLabel {
  id: string;
  x: number;
  label: string;
}

interface StockChartAxisLabel {
  index: number;
  label: string;
}

export function positionStockChartAxisLabels({
  container,
  data,
  range,
}: {
  container: HTMLDivElement;
  data: StockChartBar[];
  range: StockChartRange;
}): PositionedStockChartAxisLabel[] {
  const minX = 28;
  const maxX = container.clientWidth - minX;
  // Labels closer together than this overlap visually; keep the first one.
  const minGapX = 36;

  const positioned: PositionedStockChartAxisLabel[] = [];
  for (const label of getStockChartAxisLabels(data, range)) {
    const x = getLabelX(label.index, data.length, minX, maxX);
    if (x < minX || x > maxX) continue;

    const previous = positioned.at(-1);
    if (previous && x - previous.x < minGapX) continue;

    positioned.push({
      id: `${label.index}:${label.label}`,
      x,
      label: label.label,
    });
  }

  return positioned;
}

function getStockChartAxisLabels(
  data: StockChartBar[],
  range: StockChartRange,
): StockChartAxisLabel[] {
  if (data.length < 2) return [];

  switch (range) {
    case "1D":
      return takeEvenly(getFirstBarPerHour(data).slice(1, -1), 4).map(
        (item) => ({
          index: item.index,
          label: formatHour(getDateFromTimestamp(item.bar.time)),
        }),
      );
    case "5D":
      return getFirstBarPerTradingDay(data)
        .slice(1)
        .map((item) => ({
          index: item.index,
          label: WEEKDAYS[getDateFromTimestamp(item.bar.time).getDay()] ?? "",
        }));
    case "1M":
    case "3M":
      return takeEvenly(toIndexedBars(data).slice(1, -1), 4).map((item) => {
        const date = getDateFromTimestamp(item.bar.time);
        return {
          index: item.index,
          label: `${formatMonth(date)} ${date.getDate()}`,
        };
      });
    case "6M":
      return getTrailingMonthIntervalLabels(data, 2).map((item) => ({
        index: item.index,
        label: formatMonth(getDateFromTimestamp(item.bar.time)),
      }));
    case "1Y":
      return getTrailingMonthIntervalLabels(data, 3).map((item) => ({
        index: item.index,
        label: formatMonth(getDateFromTimestamp(item.bar.time)),
      }));
    case "5Y":
    case "MAX":
      return takeEvenly(getFirstBarPerYear(data).slice(1, -1), 4).map(
        (item) => ({
          index: item.index,
          label: String(getDateFromTimestamp(item.bar.time).getFullYear()),
        }),
      );
  }
}

function getFirstBarPerHour(data: StockChartBar[]) {
  return getFirstBarPerBucket(data, (date) => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
  });
}

/**
 * Like daily bucketing, but skips local calendar days that only contain
 * post-market bars. A session that runs past midnight in the viewer's
 * timezone would otherwise create a phantom "day" (e.g. a Saturday bucket
 * holding Friday's late post-market trades).
 */
function getFirstBarPerTradingDay(data: StockChartBar[]) {
  const getBucket = (date: Date) =>
    `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  const buckets: IndexedStockChartBar[][] = [];
  let previousBucket: string | null = null;

  for (const item of toIndexedBars(data)) {
    const { bar } = item;
    const bucket = getBucket(getDateFromTimestamp(bar.time));
    if (bucket !== previousBucket) {
      previousBucket = bucket;
      buckets.push([]);
    }
    buckets.at(-1)?.push(item);
  }

  return buckets.flatMap((bucketItems) => {
    const firstItem = bucketItems[0];
    if (!firstItem) return [];
    if (!bucketItems.some((item) => item.bar.session === "regular")) return [];

    return [firstItem];
  });
}

function getFirstBarPerMonth(data: StockChartBar[]) {
  return getFirstBarPerBucket(data, (date) => {
    return `${date.getFullYear()}-${date.getMonth()}`;
  });
}

function getTrailingMonthIntervalLabels(
  data: StockChartBar[],
  intervalMonths: number,
) {
  const months = getFirstBarPerMonth(data);
  const labels: IndexedStockChartBar[] = [];

  for (
    let index = months.length - 1 - intervalMonths;
    index > 0;
    index -= intervalMonths
  ) {
    const item = months[index];
    if (item) labels.push(item);
  }

  return labels.reverse();
}

function getFirstBarPerYear(data: StockChartBar[]) {
  return getFirstBarPerBucket(data, (date) => {
    return String(date.getFullYear());
  });
}

function getFirstBarPerBucket(
  data: StockChartBar[],
  getBucket: (date: Date) => string,
) {
  const bars: IndexedStockChartBar[] = [];
  let previousBucket: string | null = null;

  for (const item of toIndexedBars(data)) {
    const { bar } = item;
    const bucket = getBucket(getDateFromTimestamp(bar.time));
    if (bucket === previousBucket) continue;
    previousBucket = bucket;
    bars.push(item);
  }

  return bars;
}

interface IndexedStockChartBar {
  bar: StockChartBar;
  index: number;
}

function toIndexedBars(data: StockChartBar[]): IndexedStockChartBar[] {
  return data.map((bar, index) => ({ bar, index }));
}

function getLabelX(
  index: number,
  dataLength: number,
  minX: number,
  maxX: number,
) {
  if (dataLength <= 1) return (minX + maxX) / 2;

  return minX + (index / (dataLength - 1)) * (maxX - minX);
}

function takeEvenly<T>(items: T[], maxItems: number) {
  if (items.length <= maxItems) return items;
  if (maxItems <= 0) return [];
  if (maxItems === 1)
    return [items[Math.floor(items.length / 2)]].filter(
      (item): item is T => item !== undefined,
    );

  const step = (items.length - 1) / (maxItems - 1);
  return Array.from({ length: maxItems }, (_, index) => {
    return items[Math.round(index * step)];
  }).filter((item): item is T => item !== undefined);
}

function getDateFromTimestamp(time: number) {
  return new Date(time * 1000);
}

function formatHour(date: Date) {
  const hour = date.getHours();
  const displayHour = hour % 12 || 12;
  const period = hour < 12 ? "am" : "pm";

  return `${displayHour}${period}`;
}

function formatMonth(date: Date) {
  return MONTHS[date.getMonth()] ?? "";
}
