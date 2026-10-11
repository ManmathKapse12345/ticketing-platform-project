import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/api";
import { formatDateRange } from "@/lib/dates";
import { useEvent, useEventTiers } from "./api";
import { TicketSelector } from "./TicketSelector";

export default function EventDetailPage() {
  const { eventId = "" } = useParams();
  const event = useEvent(eventId);
  const tiers = useEventTiers(eventId);

  if (event.isPending) {
    return (
      <div className="grid gap-4 px-4 py-8">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (event.isError) {
    const status = axios.isAxiosError(event.error) ? event.error.response?.status : undefined;
    const notFound = status === 404 || status === 400; // 400 = the id in the URL isn't a valid UUID
    return (
      <div className="grid justify-items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">{notFound ? "Event not found" : "Couldn't load this event"}</h1>
        {!notFound && <p className="text-muted-foreground">{getErrorMessage(event.error)}</p>}
        <Link to="/" className={buttonVariants({ variant: "outline" })}>Browse events</Link>
      </div>
    );
  }

  const e = event.data;

  return (
    <div className="grid gap-8 px-4 py-8 lg:grid-cols-[1fr_380px]">
      <div className="grid content-start gap-4">
        <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="size-4" /> All events
        </Link>
        <h1 className="text-3xl font-semibold">{e.title}</h1>
        <div className="grid gap-1 text-muted-foreground">
          <p className="flex items-center gap-2"><CalendarDays className="size-4" /> {formatDateRange(e.startDate, e.endDate)}</p>
          {e.venue && <p className="flex items-center gap-2"><MapPin className="size-4" /> {e.venue}</p>}
        </div>
        {e.description && <p className="whitespace-pre-line leading-relaxed">{e.description}</p>}
      </div>

      <aside className="grid content-start gap-3">
        <h2 className="text-lg font-semibold">Tickets</h2>
        {tiers.isPending ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : tiers.isError ? (
          <p className="text-destructive">{getErrorMessage(tiers.error)}</p>
        ) : tiers.data.length === 0 ? (
          <p className="text-muted-foreground">Tickets aren't available yet.</p>
        ) : (
          <TicketSelector event={e} tiers={tiers.data} />
        )}
      </aside>
    </div>
  );
}
