import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { formatMinor } from "@/lib/money";
import { formatDay, formatMinorCompact, type DailyPoint } from "./format";

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };

function DayTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  const point = payload?.[0]?.payload as DailyPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="grid gap-0.5 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <span className="font-medium">{formatDay(point.day)}</span>
      <span className="tabular-nums">{formatMinor(point.revenueMinor)}</span>
      <span className="text-muted-foreground tabular-nums">
        {point.tickets} ticket{point.tickets === 1 ? "" : "s"} · {point.orders} order{point.orders === 1 ? "" : "s"}
      </span>
    </div>
  );
}

export function DailyRevenueChart({ data }: { data: DailyPoint[] }) {
  if (data.every((d) => d.revenueMinor === 0)) {
    return <p className="grid h-60 place-items-center text-sm text-muted-foreground">No sales in this period.</p>;
  }
  return (
    <div className="h-60" role="img" aria-label="Revenue per day">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="day" tickFormatter={formatDay} tick={AXIS_TICK} tickLine={false}
            axisLine={{ stroke: "var(--border)" }} minTickGap={24} />
          <YAxis tickFormatter={formatMinorCompact} tick={AXIS_TICK} tickLine={false} axisLine={false}
            width={56} allowDecimals={false} />
          <Tooltip content={<DayTooltip />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="revenueMinor" fill="var(--viz-series)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
