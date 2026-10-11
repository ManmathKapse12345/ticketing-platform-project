import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Download, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { getErrorMessage } from "@/lib/api";
import { formatDateRange, formatDateTime } from "@/lib/dates";
import { formatMinor } from "@/lib/money";
import { cancelOrder, downloadTicketsPdf, useOrder, useTickets } from "./api";
import { OrderStatusBadge, TicketStatusBadge } from "./StatusBadge";

export default function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const [params] = useSearchParams();
  const justPaid = params.get("paid") === "1";
  const { data: order, isPending, isError, error } = useOrder(orderId, { pollWhilePending: justPaid });
  const tickets = useTickets({ enabled: order?.paymentStatus === "PAID" });
  const [downloading, setDownloading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const qc = useQueryClient();

  if (isPending) return <FullPageSpinner />;
  if (isError) return <p className="px-4 py-16 text-center">{getErrorMessage(error)}</p>;

  const orderTickets = tickets.data?.filter((t) => t.orderId === order.id) ?? [];
  const isLive = order.paymentStatus === "PENDING" && new Date(order.expiresAt) > new Date();

  const download = async () => {
    setDownloading(true);
    try {
      await downloadTicketsPdf(order.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const cancel = async () => {
    await cancelOrder(order.id);
    qc.invalidateQueries({ queryKey: ["orders"] });
    if (order.event) qc.invalidateQueries({ queryKey: ["event", order.event.id] }); // seats are back on sale
    toast.success("Order cancelled");
  };

  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-8">
      {justPaid && order.paymentStatus === "PAID" && (
        <div className="flex items-center gap-3 rounded-lg border border-green-600/40 bg-green-600/10 p-4">
          <CheckCircle2 className="size-6 text-green-600" />
          <div>
            <p className="font-medium">Payment successful!</p>
            <p className="text-sm text-muted-foreground">Your tickets are below and are on their way to your email.</p>
          </div>
        </div>
      )}
      {justPaid && order.paymentStatus === "PENDING" && (
        <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
          <LoaderCircle className="size-5 animate-spin" /> Confirming your payment…
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{order.event?.title ?? `Order ${order.id.slice(0, 8)}`}</h1>
          {order.event && <p className="text-muted-foreground">{formatDateRange(order.event.startDate, order.event.endDate)}</p>}
          <p className="text-sm text-muted-foreground">Ordered {formatDateTime(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.paymentStatus} />
      </div>

      <Card>
        <CardContent className="grid gap-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.tierName} × {item.quantity}</span><span>{formatMinor(item.subtotalMinor)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>Total</span><span>{formatMinor(order.totalAmountMinor)}</span>
          </div>
        </CardContent>
      </Card>

      {isLive && !justPaid && (
        <div className="flex flex-wrap gap-2">
          <Link to={`/checkout/${order.id}`} className={buttonVariants()}>Complete payment</Link>
          <Button variant="outline" onClick={() => setConfirmCancel(true)}>Cancel order</Button>
        </div>
      )}
      <ConfirmDialog open={confirmCancel} onOpenChange={setConfirmCancel} title="Cancel this order?" destructive
        description="Your reserved tickets are released so other people can buy them. You haven't been charged."
        confirmLabel="Cancel order" onConfirm={cancel} />

      {order.paymentStatus === "PAID" && (
        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your tickets</h2>
            <Button variant="outline" onClick={download} disabled={downloading}>
              <Download /> {downloading ? "Preparing…" : "Download PDF"}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {orderTickets.map((t, i) => (
              <Link key={t.id} to={`/tickets/${t.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-4">
                    <div className="rounded bg-white p-1"><QRCodeSVG value={t.qrCode} size={64} /></div>
                    <div className="grid gap-1">
                      <p className="font-medium">{t.ticketTier?.name ?? "Ticket"} #{i + 1}</p>
                      <TicketStatusBadge status={t.status} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
