import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatMinor } from "@/lib/money";
import { useOrgAnalytics } from "../api";
import { EventStatusBadge } from "../EventStatusBadge";
import { useOrgRole } from "../useOrgRole";
import { formatRate } from "./format";
import { StatTile } from "./StatTile";

export default function OrgAnalyticsPage() {
  const { organizationId } = useOrgRole();
  const { data, isPending, isError, error } = useOrgAnalytics(organizationId);

  if (isPending) return <Skeleton className="h-96" />;
  if (isError) return <p className="text-destructive">{getErrorMessage(error)}</p>;

  const { totals, events } = data;
  const byRevenue = [...events].sort((a, b) => b.netMinor - a.netMinor);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Net revenue" value={formatMinor(totals.netMinor)} detail="After approved refunds" />
        <StatTile label="Gross revenue" value={formatMinor(totals.grossMinor)} />
        <StatTile label="Refunded" value={formatMinor(totals.refundedMinor)} />
        <StatTile label="Paid orders" value={totals.paidOrders} detail={`Across ${events.length} event${events.length === 1 ? "" : "s"}`} />
      </div>

      {events.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No events yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-right">Paid orders</TableHead><TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Conversion</TableHead><TableHead className="text-right">Net revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byRevenue.map((e) => (
              <TableRow key={e.eventId}>
                <TableCell>
                  <Link to={`../events/${e.eventId}/analytics`} relative="path" className="font-medium hover:underline">
                    {e.title}
                  </Link>
                  <div className="text-xs text-muted-foreground">{formatDateTime(e.startDate)}</div>
                </TableCell>
                <TableCell><EventStatusBadge status={e.status} /></TableCell>
                <TableCell className="text-right tabular-nums">{e.paidOrders}</TableCell>
                <TableCell className="text-right tabular-nums">{e.views}</TableCell>
                <TableCell className="text-right tabular-nums">{formatRate(e.conversionRate)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMinor(e.netMinor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
