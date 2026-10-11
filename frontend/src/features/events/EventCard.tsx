import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { calendarParts, formatDateTime } from "@/lib/dates";
import type { PublicEvent } from "./types";

export function EventCard({ event }: { event: PublicEvent }) {
  const { month, day } = calendarParts(event.startDate);
  return (
    <Link to={`/events/${event.id}`} className="block rounded-xl focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex gap-4">
          <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
            <span className="text-xs uppercase text-muted-foreground">{month}</span>
            <span className="text-xl font-semibold">{day}</span>
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{event.title}</h3>
            <p className="text-sm text-muted-foreground">{formatDateTime(event.startDate)}</p>
            {event.venue && (
              <p className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" /> {event.venue}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
