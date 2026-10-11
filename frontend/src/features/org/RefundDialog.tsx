import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/api";
import { formatMinor, toMinorUnits } from "@/lib/money";
import { refundOrder } from "./api";

interface Props {
  organizationId: string;
  orderId: string;
  refundableMinor: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

export function RefundDialog({ organizationId, orderId, refundableMinor, open, onOpenChange, onDone }: Props) {
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    let amountMinor: number | undefined;
    if (mode === "partial") {
      try {
        amountMinor = toMinorUnits(amount.trim());
      } catch {
        return setError('Enter an amount like "250" or "250.50"');
      }
      if (amountMinor <= 0 || amountMinor > refundableMinor) {
        return setError(`Amount must be between ₹0.01 and ${formatMinor(refundableMinor)}`);
      }
    }
    setBusy(true);
    try {
      // amountMinor undefined = refund everything that's left
      await refundOrder(organizationId, orderId, { amountMinor, reason: reason.trim() || undefined });
      toast.success("Refund started. Razorpay usually takes 5–7 days to return the money.");
      onDone();
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Refund order</DialogTitle>
            <DialogDescription>Up to {formatMinor(refundableMinor)} can still be refunded.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "full"} onChange={() => setMode("full")} />
              Full refund ({formatMinor(refundableMinor)})
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "partial"} onChange={() => setMode("partial")} />
              Partial refund
            </label>
          </div>
          {mode === "partial" && (
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" inputMode="decimal" placeholder="250.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input id="reason" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={busy}>{busy ? "Refunding…" : "Refund"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
