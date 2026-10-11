import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatMinor } from "@/lib/money";
import { useOrders } from "./api";
import { OrderStatusBadge } from "./StatusBadge";

export default function MyOrdersPage() {
  const { data: orders, isPending, isError, error } = useOrders();

  return (
    <div className="mx-auto grid max-w-3xl gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">My orders</h1>
      {isPending ? (
        Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
      ) : isError ? (
        <p className="text-destructive">{getErrorMessage(error)}</p>
      ) : orders.length === 0 ? (
        <div className="grid justify-items-center gap-4 py-12 text-center text-muted-foreground">
          <p>You haven't ordered any tickets yet.</p>
          <Link to="/" className={buttonVariants()}>Browse events</Link>
        </div>
      ) : (
        orders.map((order) => (
          <Link key={order.id} to={`/orders/${order.id}`}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{order.event?.title ?? `Order ${order.id.slice(0, 8)}`}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.items.reduce((n, i) => n + i.quantity, 0)} tickets · {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className="grid justify-items-end gap-1">
                  <span className="font-semibold">{formatMinor(order.totalAmountMinor)}</span>
                  <OrderStatusBadge status={order.paymentStatus} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
