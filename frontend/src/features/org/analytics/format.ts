import type { EventAnalytics } from "../types";

/** 0.4567 -> "45.7%", null -> "—" (no data is not the same as 0%) */
export const formatRate = (rate: number | null) =>
  rate === null ? "—" : `${Number((rate * 100).toFixed(1))}%`;

const compactInr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 12_50_000 paise -> "₹12.5K", for chart axes */
export const formatMinorCompact = (minor: number) => compactInr.format(minor / 100);

// The backend buckets sales by day in India time, so the empty days are filled in the same zone.
const REPORT_TIME_ZONE = "Asia/Kolkata";
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: REPORT_TIME_ZONE }); // "YYYY-MM-DD"
const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** "2026-10-12" -> "12 Oct" */
export const formatDay = (day: string) => dayLabel.format(new Date(`${day}T00:00:00Z`));

export type DailyPoint = EventAnalytics["dailySales"][number];

/** The API only returns days that had sales; a chart needs every day in the range. */
export const fillDays = (sales: DailyPoint[], days: number): DailyPoint[] => {
  const byDay = new Map(sales.map((s) => [s.day, s]));
  const now = Date.now();
  const result: DailyPoint[] = [];
  for (let i = days; i >= 0; i--) {
    const day = dayKey.format(new Date(now - i * 24 * 60 * 60 * 1000));
    result.push(byDay.get(day) ?? { day, orders: 0, tickets: 0, revenueMinor: 0 });
  }
  return result;
};
