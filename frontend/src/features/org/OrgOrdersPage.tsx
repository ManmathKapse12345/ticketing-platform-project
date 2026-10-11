import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusBadge } from "@/features/orders/StatusBadge";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatMinor } from "@/lib/money";
import { useOrgOrders } from "./api";
import { useOrgRole } from "./useOrgRole";

export default function OrgOrdersPage() {
  const { organizationId } = useOrgRole();
  const { data: orders, isPending, isError, error } = useOrgOrders(organizationId);

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Orders</h1>
      {isPending ? <Skeleton className="h-40" /> : isError ? (
        <p className="text-destructive">{getErrorMessage(error)}</p>
      ) : orders.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No orders yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Event</TableHead>
              <TableHead className="text-right">Tickets</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell><Link to={o.id} className="hover:underline">{formatDateTime(o.createdAt)}</Link></TableCell>
                <TableCell>
                  <div>{o.user?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{o.user?.email}</div>
                </TableCell>
                <TableCell>{o.event?.title ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{o.items.reduce((n, i) => n + i.quantity, 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMinor(o.totalAmountMinor)}</TableCell>
                <TableCell><OrderStatusBadge status={o.paymentStatus} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
