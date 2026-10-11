import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Pencil } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { getErrorMessage } from "@/lib/api";
import { formatDateRange } from "@/lib/dates";
import { cancelEvent, invalidateEvent, updateEvent, useOrgEvent, useOrgTiers } from "./api";
import { EventStatusBadge } from "./EventStatusBadge";
import { TiersSection } from "./TiersSection";
import { useOrgRole } from "./useOrgRole";

export default function OrgEventPage() {
  const { eventId = "" } = useParams();
  const { organizationId, can } = useOrgRole();
  const qc = useQueryClient();
  const { data: event, isPending, isError, error } = useOrgEvent(organizationId, eventId);
  const { data: tiers } = useOrgTiers(organizationId, eventId);
  const [confirm, setConfirm] = useState<"publish" | "unpublish" | "cancel" | null>(null);

  if (isPending) return <FullPageSpinner />;
  if (isError) return <p className="text-destructive">{getErrorMessage(error)}</p>;

  const cancelled = event.status === "CANCELLED";
  const close = (open: boolean) => !open && setConfirm(null);

  const setStatus = async (status: "DRAFT" | "PUBLISHED") => {
    await updateEvent(organizationId, eventId, { status });
    invalidateEvent(qc, organizationId, eventId);
    toast.success(status === "PUBLISHED" ? "Event published" : "Event moved back to draft");
  };

  const cancel = async () => {
    const { refunds } = await cancelEvent(organizationId, eventId);
    invalidateEvent(qc, organizationId, eventId);
    qc.invalidateQueries({ queryKey: ["organization", organizationId, "orders"] });
    toast.success(`Event cancelled. ${refunds.requested} refund(s) started.`);
    if (refunds.failed.length) toast.error(`${refunds.failed.length} refund(s) failed. Retry them from Orders.`);
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{event.title}</h1>
            <EventStatusBadge status={event.status} />
          </div>
          <p className="text-muted-foreground">{formatDateRange(event.startDate, event.endDate)}{event.venue && ` · ${event.venue}`}</p>
          <p className="text-sm text-muted-foreground">{event.viewCount} views</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {event.status === "PUBLISHED" && (
            <Link to={`/events/${event.id}`} target="_blank" className={buttonVariants({ variant: "ghost" })}>
              <ExternalLink /> Public page
            </Link>
          )}
          {can("editor") && !cancelled && (
            <>
              <Link to="edit" className={buttonVariants({ variant: "outline" })}><Pencil /> Edit</Link>
              {event.status === "DRAFT" ? (
                <Button disabled={!tiers?.length} title={!tiers?.length ? "Add a ticket tier first" : undefined}
                  onClick={() => setConfirm("publish")}>Publish</Button>
              ) : (
                <Button variant="outline" onClick={() => setConfirm("unpublish")}>Unpublish</Button>
              )}
            </>
          )}
          {can("admin") && !cancelled && (
            <Button variant="destructive" onClick={() => setConfirm("cancel")}>Cancel event</Button>
          )}
        </div>
      </div>

      {event.description && <p className="max-w-3xl whitespace-pre-line text-sm">{event.description}</p>}

      <TiersSection organizationId={organizationId} eventId={eventId} readOnly={cancelled} />

      <ConfirmDialog open={confirm === "publish"} onOpenChange={close} title="Publish this event?"
        description="It will appear in the public event list and people can buy tickets."
        confirmLabel="Publish" onConfirm={() => setStatus("PUBLISHED")} />
      <ConfirmDialog open={confirm === "unpublish"} onOpenChange={close} title="Move back to draft?"
        description="The event disappears from the public list. Tickets already sold stay valid."
        confirmLabel="Unpublish" onConfirm={() => setStatus("DRAFT")} />
      <ConfirmDialog open={confirm === "cancel"} onOpenChange={close} title="Cancel this event?" destructive
        description="This can't be undone. All tickets are cancelled, unpaid orders are released, and every paid order is refunded in full."
        confirmLabel="Cancel event and refund everyone" onConfirm={cancel} />
    </div>
  );
}
