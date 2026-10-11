import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormField } from "@/components/FormField";
import { NativeSelect } from "@/components/NativeSelect";
import { Pagination } from "@/components/Pagination";
import { getErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";
import { formatMinor } from "@/lib/money";
import { PayoutStatusBadge } from "@/features/org/payouts/PayoutStatusBadge";
import type { PayoutDetailsInput, PayoutStatus } from "@/features/org/types";
import { adminKeys, updatePayout, useAdminPayouts, type AdminPayout } from "./api";

function Destination({ details }: { details: PayoutDetailsInput | null }) {
  if (!details) return <span className="text-destructive">No readable payout details</span>;
  if (details.method === "upi") return <span>UPI <span className="font-mono">{details.upiId}</span></span>;
  return (
    <span className="grid">
      <span>{details.accountHolderName}</span>
      <span className="font-mono text-xs">{details.accountNumber} · {details.ifsc}</span>
    </span>
  );
}

export default function AdminPayoutsPage() {
  const [status, setStatus] = useState<PayoutStatus | "">("REQUESTED");
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<{ payout: AdminPayout; action: "PAID" | "CANCELLED" } | null>(null);
  const { data, isPending, isError, error } = useAdminPayouts({ page, status });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Payouts</h1>
        <NativeSelect aria-label="Status" value={status}
          onChange={(e) => { setStatus(e.target.value as PayoutStatus | ""); setPage(1); }}>
          <option value="REQUESTED">Waiting to be paid</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="">All</option>
        </NativeSelect>
      </div>

      {isPending ? <Skeleton className="h-40" /> : isError ? (
        <p className="text-destructive">{getErrorMessage(error)}</p>
      ) : data.payouts.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {status === "REQUESTED" ? "Nothing waiting. All payouts are processed." : "No payouts."}
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requested</TableHead><TableHead>Organization</TableHead>
                <TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
                <TableHead>Send to / reference</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.payouts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDateTime(p.createdAt)}</TableCell>
                  <TableCell>{p.organization.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMinor(p.amountMinor)}</TableCell>
                  <TableCell><PayoutStatusBadge status={p.status} /></TableCell>
                  <TableCell>
                    {p.status === "REQUESTED" ? <Destination details={p.payoutDetails} /> : (
                      <span className="grid">
                        <span>{p.reference ?? "—"}</span>
                        {p.note && <span className="text-xs text-muted-foreground">{p.note}</span>}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === "REQUESTED" && (
                      <div className="flex flex-col items-end gap-1 xl:flex-row xl:justify-end">
                        <Button size="sm" onClick={() => setActing({ payout: p, action: "PAID" })}>Mark paid</Button>
                        <Button size="sm" variant="ghost" onClick={() => setActing({ payout: p, action: "CANCELLED" })}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
        </>
      )}

      <Dialog open={!!acting} onOpenChange={(open) => !open && setActing(null)}>
        <DialogContent>
          {acting && <SettleForm key={acting.payout.id} {...acting} onDone={() => setActing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettleForm({ payout, action, onDone }: { payout: AdminPayout; action: "PAID" | "CANCELLED"; onDone: () => void }) {
  const qc = useQueryClient();
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const paying = action === "PAID";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const trimmedNote = note.trim() || undefined;
      await updatePayout(payout.id, paying
        ? { status: "PAID", reference: reference.trim(), note: trimmedNote }
        : { status: "CANCELLED", note: trimmedNote });
      qc.invalidateQueries({ queryKey: adminKeys.all });
      toast.success(paying ? "Payout marked as paid" : "Payout cancelled. The amount is back in their balance.");
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{paying ? "Mark payout as paid" : "Cancel payout"}</DialogTitle>
        <DialogDescription>
          {formatMinor(payout.amountMinor)} to {payout.organization.name}.{" "}
          {paying
            ? "Only do this after the bank transfer has gone through. This can't be undone."
            : "The amount goes back into their available balance so they can request it again."}
        </DialogDescription>
      </DialogHeader>
      {paying && (
        <FormField id="reference" label="Bank / UTR reference" required maxLength={100}
          value={reference} onChange={(e) => setReference(e.target.value)} />
      )}
      <FormField id="note" label={paying ? "Note (optional)" : "Reason (shown to the organization)"} maxLength={500}
        value={note} onChange={(e) => setNote(e.target.value)} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>Back</Button>
        <Button type="submit" variant={paying ? "default" : "destructive"} disabled={busy || (paying && !reference.trim())}>
          {busy ? "Saving…" : paying ? "Mark paid" : "Cancel payout"}
        </Button>
      </DialogFooter>
    </form>
  );
}
