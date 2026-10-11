import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { useAuth } from "@/features/auth/useAuth";
import { useNow } from "@/hooks/useNow";
import { getErrorMessage } from "@/lib/api";
import { formatDateRange } from "@/lib/dates";
import { formatMinor } from "@/lib/money";
import { PaymentCancelled, payWithRazorpay } from "@/lib/razorpay";
import { cancelOrder, startCheckout, useOrder, verifyPayment } from "./api";
import { toast } from "sonner";

const formatCountdown = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function CheckoutPage() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: order, isPending, isError, error } = useOrder(orderId);
  const now = useNow();
  const [paying, setPaying] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (isPending) return <FullPageSpinner />;
  if (isError) {
    return (
      <div className="grid justify-items-center gap-4 px-4 py-16 text-center">
        <p>{getErrorMessage(error)}</p>
        <Link to="/orders" className={buttonVariants({ variant: "outline" })}>
          My orders
        </Link>
      </div>
    );
  }
  if (order.paymentStatus === "PAID") return <Navigate to={`/orders/${order.id}`} replace />;

  const msLeft = new Date(order.expiresAt).getTime() - now;
  const expired = order.paymentStatus !== "PENDING" || msLeft <= 0;

  const pay = async () => {
    setPaying(true);
    setFailure(null);
    let paid = false;
    try {
      const checkout = await startCheckout(order.id);
      const result = await payWithRazorpay({
        key: checkout.keyId,
        order_id: checkout.razorpayOrderId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: "Ticketing",
        description: order.event?.title ?? `Order ${order.id.slice(0, 8)}`,
        prefill: { name: user?.name, email: user?.email },
      });
      paid = true;
      await verifyPayment(order.id, result);
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: ["tickets"] });
      navigate(`/orders/${order.id}?paid=1`, { replace: true });
    } catch (err) {
      if (paid) {
        // Razorpay took the money; the webhook will finish the order. Let the order page wait for it.
        navigate(`/orders/${order.id}?paid=1`, { replace: true });
      } else if (!(err instanceof PaymentCancelled)) {
        setFailure(
          err instanceof Error && !("isAxiosError" in err) ? err.message : getErrorMessage(err),
        );
      }
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-lg gap-4 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{order.event?.title ?? "Checkout"}</CardTitle>
          {order.event && (
            <p className="text-sm text-muted-foreground">
              {formatDateRange(order.event.startDate, order.event.endDate)}
            </p>
          )}
        </CardHeader>
        <CardContent className="grid gap-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.tierName} × {item.quantity}
              </span>
              <span>{formatMinor(item.subtotalMinor)}</span>
            </div>
          ))}
          {order.feesMinor > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Fees</span>
              <span>{formatMinor(order.feesMinor)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-3 font-semibold">
            <span>Total</span>
            <span>{formatMinor(order.totalAmountMinor)}</span>
          </div>

          {expired ? (
            <div className="grid gap-3 rounded-lg bg-muted p-4 text-center">
              <p>Your reservation expired and the seats were released.</p>
              <Link to={`/events/${order.eventId}`} className={buttonVariants()}>
                Choose tickets again
              </Link>
            </div>
          ) : (
            <>
              <p
                className={`flex items-center justify-center gap-2 text-sm ${msLeft < 2 * 60_000 ? "text-destructive" : "text-muted-foreground"}`}
              >
                <Clock className="size-4" /> Seats held for {formatCountdown(msLeft)}
              </p>
              {failure && (
                <p className="rounded-lg border border-destructive/50 p-3 text-sm text-destructive">
                  Payment failed: {failure}. You can try again.
                </p>
              )}
              <Button size="lg" disabled={paying} onClick={pay}>
                {paying
                  ? "Processing…"
                  : failure
                    ? "Try again"
                    : `Pay ${formatMinor(order.totalAmountMinor)}`}
              </Button>
              <Button
                variant="ghost"
                disabled={paying}
                onClick={async () => {
                  if (!confirm("Cancel this order and release the seats?")) return;
                  try {
                    await cancelOrder(order.id);
                    queryClient.invalidateQueries({ queryKey: ["orders"] });
                    queryClient.invalidateQueries({ queryKey: ["event", order.eventId, "tiers"] });
                    navigate(`/events/${order.eventId}`);
                  } catch (err) {
                    toast.error(getErrorMessage(err));
                  }
                }}
              >
                Cancel order
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
