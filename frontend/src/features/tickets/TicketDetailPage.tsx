import { Link, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { useTicket } from "@/features/orders/api";
import { TicketStatusBadge } from "@/features/orders/StatusBadge";
import { getErrorMessage } from "@/lib/api";
import { formatDateRange } from "@/lib/dates";

export default function TicketDetailPage() {
  const { ticketId = "" } = useParams();
  const { data: ticket, isPending, isError, error } = useTicket(ticketId);

  if (isPending) return <FullPageSpinner />;
  if (isError) return <p className="px-4 py-16 text-center">{getErrorMessage(error)}</p>;

  return (
    <div className="mx-auto grid max-w-sm gap-4 px-4 py-8">
      <Link to="/tickets" className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" /> My tickets
      </Link>
      <Card>
        <CardContent className="grid justify-items-center gap-4 text-center">
          <div className={`rounded-xl bg-white p-4 ${ticket.status !== "active" ? "opacity-30" : ""}`}>
            <QRCodeSVG value={ticket.qrCode} size={240} level="M" />
          </div>
          <TicketStatusBadge status={ticket.status} />
          {ticket.status === "used" && <p className="text-sm text-muted-foreground">This ticket has already been scanned.</p>}
          <div className="grid gap-1">
            <h1 className="text-xl font-semibold">{ticket.event?.title ?? "Ticket"}</h1>
            <p className="font-medium">{ticket.ticketTier?.name ?? "General admission"}</p>
            {ticket.event && (
              <>
                <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                  <CalendarDays className="size-4" /> {formatDateRange(ticket.event.startDate, ticket.event.endDate)}
                </p>
                {ticket.event.venue && (
                  <p className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-4" /> {ticket.event.venue}
                  </p>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Show this QR code at the entrance. Turn your screen brightness up.</p>
        </CardContent>
      </Card>
    </div>
  );
}
