import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { useOrgEvents } from "./api";
import { EventStatusBadge } from "./EventStatusBadge";
import { useOrgRole } from "./useOrgRole";

export default function OrgEventsPage() {
  const { organizationId, can } = useOrgRole();
  const { data: events, isPending, isError, error } = useOrgEvents(organizationId);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Events</h1>
        {can("editor") && <Link to="new" className={buttonVariants()}><Plus /> New event</Link>}
      </div>
      {isPending ? (
        <Skeleton className="h-40" />
      ) : isError ? (
        <p className="text-destructive">{getErrorMessage(error)}</p>
      ) : events.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No events yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow><TableHead>Title</TableHead><TableHead>Starts</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Views</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {events.map((e) => (
              <TableRow key={e.id}>
                <TableCell><Link to={e.id} className="font-medium hover:underline">{e.title}</Link></TableCell>
                <TableCell>{formatDateTime(e.startDate)}</TableCell>
                <TableCell><EventStatusBadge status={e.status} /></TableCell>
                <TableCell className="text-right tabular-nums">{e.viewCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
