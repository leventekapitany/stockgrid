export const SCREEN_SORT_BY = [
  "pe",
  "marketCap",
  "changePercent",
  "dividendYield",
  "none",
] as const;

export type ScreenSortBy = (typeof SCREEN_SORT_BY)[number];
