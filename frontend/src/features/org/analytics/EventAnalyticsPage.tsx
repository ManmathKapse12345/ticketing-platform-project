import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { useEventAnalytics } from "../api";
import { useOrgRole } from "../useOrgRole";
import { DailyRevenueChart } from "./DailyRevenueChart";
import { fillDays, formatRate } from "./format";
import { Meter, StatTile } from "./StatTile";

const RANGES = [7, 30, 90] as const;

export default function EventAnalyticsPage() {
  const { eventId = "" } = useParams();
  const { organizationId } = useOrgRole();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const { data, isPending, isError, error, isFetching } = useEventAnalytics(organizationId, eventId, days);

  if (isPending) return <Skeleton className="h-96" />;
  if (isError) return <p className="text-destructive">{getErrorMessage(error)}</p>;

  const { revenue, tiers, attendance, traffic } = data;
  const ticketsSold = tiers.reduce((n, t) => n + t.sold, 0);
  const capacity = tiers.reduce((n, t) => n + t.quantityTotal, 0);

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <Link to=".." relative="path" className={buttonVariants({ variant: "ghost", size: "sm", className: "w-fit" })}>
          <ArrowLeft /> Back to event
        </Link>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-muted-foreground">{data.event.title}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Net revenue" value={formatMinor(revenue.netMinor)}
          detail={`${formatMinor(revenue.grossMinor)} gross · ${formatMinor(revenue.refundedMinor)} refunded`} />
        <StatTile label="Tickets sold" value={`${ticketsSold} / ${capacity}`}
          detail={`${formatRate(capacity ? ticketsSold / capacity : null)} of capacity`} />
        <StatTile label="Attendance" value={formatRate(attendance.attendanceRate)}
          detail={`${attendance.checkedIn} of ${attendance.issued} tickets checked in`} />
        <StatTile label="Conversion" value={formatRate(traffic.conversionRate)}
          detail={`${traffic.paidOrders} paid orders from ${traffic.views} views`} />
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Revenue per day</CardTitle>
          <div className="flex gap-1" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <Button key={r} size="sm" variant={r === days ? "secondary" : "ghost"} aria-pressed={r === days}
                onClick={() => setDays(r)}>
                {r} days
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className={isFetching ? "opacity-60 transition-opacity" : undefined}>
          <DailyRevenueChart data={fillDays(data.dailySales, days)} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Sales by tier</CardTitle></CardHeader>
          <CardContent className="grid gap-5">
            {tiers.length === 0 && <p className="text-sm text-muted-foreground">This event has no ticket tiers.</p>}
            {tiers.map((t) => (
              <div key={t.tierId} className="grid gap-1.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="tabular-nums">{formatMinor(t.revenueMinor)}</span>
                </div>
                <Meter value={t.sold} max={t.quantityTotal} label={`${t.name} sold`} />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t.sold} / {t.quantityTotal} sold · {formatRate(t.sellThroughRate)} · {formatMinor(t.priceMinor)} each
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Check-in</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold tabular-nums">{attendance.checkedIn}</span>
              <span className="text-muted-foreground">of {attendance.issued} at the door</span>
            </div>
            <Meter value={attendance.checkedIn} max={attendance.issued} label="Tickets checked in" />
            <p className="text-xs text-muted-foreground">
              {attendance.issued - attendance.checkedIn} still to arrive
              {attendance.cancelled > 0 && ` · ${attendance.cancelled} cancelled (not counted)`}.
              Updates every 30 seconds.
            </p>
            <Link to="../scan" relative="path" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
              Open scanner
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
