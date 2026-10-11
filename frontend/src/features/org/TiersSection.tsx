import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatMinor } from "@/lib/money";
import { deleteTier, invalidateEvent, useOrgTiers } from "./api";
import { TierDialog } from "./TierDialog";
import type { TicketTier } from "./types";
import { useOrgRole } from "./useOrgRole";

interface Props { organizationId: string; eventId: string; readOnly: boolean }

export function TiersSection({ organizationId, eventId, readOnly }: Props) {
  const { can } = useOrgRole();
  const qc = useQueryClient();
  const { data: tiers, isPending, isError, error } = useOrgTiers(organizationId, eventId);
  const [editing, setEditing] = useState<TicketTier | "new" | null>(null);
  const [deleting, setDeleting] = useState<TicketTier | null>(null);

  const salesWindow = (t: TicketTier) =>
    !t.salesStart && !t.salesEnd ? "Always" :
    `${t.salesStart ? formatDateTime(t.salesStart) : "now"} → ${t.salesEnd ? formatDateTime(t.salesEnd) : "event start"}`;

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ticket tiers</h2>
        {can("editor") && !readOnly && (
          <Button size="sm" onClick={() => setEditing("new")}><Plus /> Add tier</Button>
        )}
      </div>

      {isPending ? <Skeleton className="h-24" /> : isError ? (
        <p className="text-destructive">{getErrorMessage(error)}</p>
      ) : tiers.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          No tiers yet. Add at least one before publishing.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Sold</TableHead>
              <TableHead>Sales window</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{t.priceMinor === 0 ? "Free" : formatMinor(t.priceMinor)}</TableCell>
                <TableCell className="tabular-nums">{t.quantitySold} / {t.quantityTotal}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{salesWindow(t)}</TableCell>
                <TableCell className="text-right">
                  {can("editor") && !readOnly && (
                    <Button size="icon-sm" variant="ghost" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}><Pencil /></Button>
                  )}
                  {can("admin") && !readOnly && t.quantitySold === 0 && (
                    <Button size="icon-sm" variant="ghost" aria-label={`Delete ${t.name}`} onClick={() => setDeleting(t)}><Trash2 /></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <TierDialog organizationId={organizationId} eventId={eventId}
        tier={editing === "new" ? null : editing} open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} />

      <ConfirmDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)} destructive
        title={`Delete "${deleting?.name}"?`} description="This tier has no orders, so it can be removed."
        confirmLabel="Delete tier"
        onConfirm={async () => {
          await deleteTier(organizationId, eventId, deleting!.id);
          invalidateEvent(qc, organizationId, eventId);
          toast.success("Tier deleted");
        }} />
    </section>
  );
}
