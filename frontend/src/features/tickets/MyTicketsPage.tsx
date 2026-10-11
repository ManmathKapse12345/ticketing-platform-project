import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { useTickets } from "@/features/orders/api";
import { TicketStatusBadge } from "@/features/orders/StatusBadge";
import { getErrorMessage } from "@/lib/api";
import { formatDateRange } from "@/lib/dates";

export default function MyTicketsPage() {
  const { data: tickets, isPending, isError, error } = useTickets();

  return (
    <div className="mx-auto grid max-w-3xl gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">My tickets</h1>
      {isPending ? (
        Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
      ) : isError ? (
        <p className="text-destructive">{getErrorMessage(error)}</p>
      ) : tickets.length === 0 ? (
        <div className="grid justify-items-center gap-4 py-12 text-center text-muted-foreground">
          <p>No tickets yet.</p>
          <Link to="/" className={buttonVariants()}>Browse events</Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {tickets.map((t) => (
            <Link key={t.id} to={`/tickets/${t.id}`}>
              <Card className={`h-full transition-shadow hover:shadow-md ${t.status !== "active" ? "opacity-70" : ""}`}>
                <CardContent className="grid gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{t.event?.title ?? "Event"}</p>
                    <TicketStatusBadge status={t.status} />
                  </div>
                  {t.event && <p className="text-sm text-muted-foreground">{formatDateRange(t.event.startDate, t.event.endDate)}</p>}
                  <p className="text-sm">{t.ticketTier?.name ?? "General"}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
