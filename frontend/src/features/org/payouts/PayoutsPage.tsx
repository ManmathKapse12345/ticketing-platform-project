import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatMinor } from "@/lib/money";
import { orgKeys, requestPayout, useOrgPayouts } from "../api";
import { useOrgRole } from "../useOrgRole";
import type { PayoutDestination } from "../types";
import { PayoutDetailsDialog } from "./PayoutDetailsDialog";
import { PayoutStatusBadge } from "./PayoutStatusBadge";

function describe(destination: PayoutDestination) {
  switch (destination.method) {
    case "bank":
      return `${destination.accountHolderName} · account ending ${destination.accountLast4} · ${destination.ifsc}`;
    case "upi":
      return `UPI ${destination.upiId}`;
    default:
      return "Saved, but can't be read with the current server key. Save them again.";
  }
}

export default function PayoutsPage() {
  const { organizationId, can } = useOrgRole();
  const isOwner = can("owner");
  const qc = useQueryClient();
  const { data, isPending, isError, error } = useOrgPayouts(organizationId);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (isPending) return <Skeleton className="h-96" />;
  if (isError) return <p className="text-destructive">{getErrorMessage(error)}</p>;

  const { verified, destination, balance, payouts } = data;
  // The first reason that applies is shown under the disabled button.
  const blocker = !verified
    ? "A platform admin has to verify your organization first."
    : !destination || destination.method === "unreadable"
      ? "Add payout details first."
      : balance.availableMinor <= 0
        ? "Nothing to pay out yet. Money becomes available once an event has ended."
        : null;

  const request = async () => {
    const payout = await requestPayout(organizationId);
    qc.invalidateQueries({ queryKey: orgKeys.payouts(organizationId) });
    toast.success(`Payout of ${formatMinor(payout.amountMinor)} requested`);
  };

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Payouts</h1>

      {!verified && (
        <p className="flex items-start gap-2 rounded-lg border p-3 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          Your organization isn't verified yet. You can sell tickets, but payouts start once a platform admin verifies it.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Available to pay out</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <span className="text-4xl font-semibold tabular-nums">{formatMinor(balance.availableMinor)}</span>
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Earned from finished events</dt>
              <dd className="text-right tabular-nums">{formatMinor(balance.settledMinor)}</dd>
              <dt className="text-muted-foreground">Already requested or paid</dt>
              <dd className="text-right tabular-nums">−{formatMinor(balance.reservedMinor)}</dd>
            </dl>
            <p className="text-xs text-muted-foreground">
              Net of refunds and platform fees. Sales for upcoming events are added after the event ends, in case of refunds.
            </p>
            {isOwner ? (
              <div className="grid gap-1">
                <Button className="justify-self-start" disabled={!!blocker} onClick={() => setConfirming(true)}>
                  Request payout
                </Button>
                {blocker && <p className="text-xs text-muted-foreground">{blocker}</p>}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Only the owner can request payouts.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Paid to</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm">{destination ? describe(destination) : "No payout details yet."}</p>
            {isOwner ? (
              <Button variant="outline" className="justify-self-start" onClick={() => setEditing(true)}>
                {destination ? "Change payout details" : "Add payout details"}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Only the owner can change where money is sent.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2">
        <h2 className="text-lg font-semibold">History</h2>
        {payouts.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No payouts yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requested</TableHead><TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead><TableHead>Reference</TableHead><TableHead>Processed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDateTime(p.createdAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMinor(p.amountMinor)}</TableCell>
                  <TableCell><PayoutStatusBadge status={p.status} /></TableCell>
                  <TableCell>
                    <div>{p.reference ?? "—"}</div>
                    {p.note && <div className="text-xs text-muted-foreground">{p.note}</div>}
                  </TableCell>
                  <TableCell>{p.processedAt ? formatDateTime(p.processedAt) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <PayoutDetailsDialog organizationId={organizationId} open={editing} onOpenChange={setEditing} />
      <ConfirmDialog open={confirming} onOpenChange={setConfirming} title="Request a payout?"
        description={`${formatMinor(balance.availableMinor)} will be sent to ${destination ? describe(destination) : "your account"}. A platform admin processes payouts, usually within a few working days.`}
        confirmLabel={`Request ${formatMinor(balance.availableMinor)}`} onConfirm={request} />
    </div>
  );
}
