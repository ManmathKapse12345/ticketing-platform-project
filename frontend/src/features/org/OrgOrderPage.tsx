import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { OrderStatusBadge } from "@/features/orders/StatusBadge";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatMinor } from "@/lib/money";
import { orgKeys, useOrgOrder } from "./api";
import { RefundDialog } from "./RefundDialog";
import { useOrgRole } from "./useOrgRole";

export default function OrgOrderPage() {
  const { orderId = "" } = useParams();
  const { organizationId } = useOrgRole();
  const qc = useQueryClient();
  const { data: order, isPending, isError, error } = useOrgOrder(organizationId, orderId);
  const [refunding, setRefunding] = useState(false);

  if (isPending) return <FullPageSpinner />;
  if (isError) return <p className="text-destructive">{getErrorMessage(error)}</p>;

  const payment = order.payments?.find((p) => p.status === "SUCCESS" || p.status === "REFUNDED");
  const refundable = payment ? payment.amountMinor - payment.refundedMinor : 0;
  const refunds = order.payments?.flatMap((p) => p.refunds) ?? [];

  return (
    <div className="grid max-w-3xl gap-6">
      <Link to=".." relative="path" className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" /> All orders
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Order {order.id.slice(0, 8)}</h1>
          <p className="text-muted-foreground">{order.event?.title} · {formatDateTime(order.createdAt)}</p>
          <p className="text-sm">{order.user?.name} &lt;{order.user?.email}&gt;</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.paymentStatus} />
          {order.paymentStatus === "PAID" && refundable > 0 && (
            <Button variant="destructive" onClick={() => setRefunding(true)}>Refund</Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-2">
          {order.items.map((i) => (
            <div key={i.id} className="flex justify-between text-sm">
              <span>{i.tierName} × {i.quantity}</span><span>{formatMinor(i.subtotalMinor)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>Total</span><span>{formatMinor(order.totalAmountMinor)}</span>
          </div>
          {payment && payment.refundedMinor > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Refunded</span><span>−{formatMinor(payment.refundedMinor)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {refunds.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Refunds</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            {refunds.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span>{formatDateTime(r.createdAt)}{r.reason && ` · ${r.reason}`}</span>
                <span className="flex items-center gap-2">{formatMinor(r.amountMinor)} <Badge variant="outline">{r.status}</Badge></span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <RefundDialog organizationId={organizationId} orderId={order.id} refundableMinor={refundable}
        open={refunding} onOpenChange={setRefunding}
        onDone={() => qc.invalidateQueries({ queryKey: orgKeys.orders(organizationId) })} />
    </div>
  );
}
