import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/FormField";
import { getErrorMessage } from "@/lib/api";
import { orgKeys, updatePayoutDetails } from "../api";

// Same rules as the backend's payout.validator.js
const bankSchema = z.object({
  accountHolderName: z.string().trim().min(2, "At least 2 characters").max(100),
  accountNumber: z.string().trim().regex(/^\d{9,18}$/, "Account number must be 9-18 digits"),
  ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code, e.g. HDFC0001234"),
});
const upiSchema = z.object({
  upiId: z.string().trim().regex(/^[\w.-]{2,256}@[a-zA-Z]{2,64}$/, "Invalid UPI ID, e.g. name@okaxis"),
});

interface Props {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayoutDetailsDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>{props.open && <PayoutDetailsForm {...props} />}</DialogContent>
    </Dialog>
  );
}

function PayoutDetailsForm({ organizationId, onOpenChange }: Props) {
  const [method, setMethod] = useState<"bank" | "upi">("bank");
  const qc = useQueryClient();

  const saved = async (body: Parameters<typeof updatePayoutDetails>[1]) => {
    try {
      await updatePayoutDetails(organizationId, body);
      qc.invalidateQueries({ queryKey: orgKeys.payouts(organizationId) });
      toast.success("Payout details saved");
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Payout details</DialogTitle>
        <DialogDescription>
          Where your earnings are sent. They're stored encrypted, and only the last digits are ever shown again.
        </DialogDescription>
      </DialogHeader>
      <div className="flex gap-1" role="group" aria-label="Payout method">
        {(["bank", "upi"] as const).map((m) => (
          <Button key={m} type="button" size="sm" variant={m === method ? "secondary" : "ghost"}
            aria-pressed={m === method} onClick={() => setMethod(m)}>
            {m === "bank" ? "Bank account" : "UPI"}
          </Button>
        ))}
      </div>
      {method === "bank"
        ? <BankForm onSave={(v) => saved({ method: "bank", ...v })} onCancel={() => onOpenChange(false)} />
        : <UpiForm onSave={(v) => saved({ method: "upi", ...v })} onCancel={() => onOpenChange(false)} />}
    </div>
  );
}

interface FormProps<T> {
  onSave: (values: T) => Promise<void>;
  onCancel: () => void;
}

function BankForm({ onSave, onCancel }: FormProps<z.infer<typeof bankSchema>>) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(bankSchema),
    defaultValues: { accountHolderName: "", accountNumber: "", ifsc: "" },
  });
  return (
    <form onSubmit={handleSubmit(onSave)} className="grid gap-4">
      <FormField id="accountHolderName" label="Account holder name" autoComplete="off"
        error={errors.accountHolderName?.message} {...register("accountHolderName")} />
      <FormField id="accountNumber" label="Account number" inputMode="numeric" autoComplete="off"
        error={errors.accountNumber?.message} {...register("accountNumber")} />
      <FormField id="ifsc" label="IFSC code" autoComplete="off" className="uppercase"
        error={errors.ifsc?.message} {...register("ifsc")} />
      <Footer busy={isSubmitting} onCancel={onCancel} />
    </form>
  );
}

function UpiForm({ onSave, onCancel }: FormProps<z.infer<typeof upiSchema>>) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(upiSchema),
    defaultValues: { upiId: "" },
  });
  return (
    <form onSubmit={handleSubmit(onSave)} className="grid gap-4">
      <FormField id="upiId" label="UPI ID" placeholder="name@okaxis" autoComplete="off"
        error={errors.upiId?.message} {...register("upiId")} />
      <Footer busy={isSubmitting} onCancel={onCancel} />
    </form>
  );
}

function Footer({ busy, onCancel }: { busy: boolean; onCancel: () => void }) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
    </DialogFooter>
  );
}
