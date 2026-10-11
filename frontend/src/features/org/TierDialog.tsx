import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/FormField";
import { getErrorMessage } from "@/lib/api";
import { fromLocalInput, toLocalInput } from "@/lib/dates";
import { createTier, invalidateEvent, updateTier } from "./api";
import type { TicketTier } from "./types";

interface Props {
  organizationId: string;
  eventId: string;
  tier: TicketTier | null; // null = create
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TierDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        {/* key: fresh form (and default values) for each tier */}
        {props.open && <TierForm key={props.tier?.id ?? "new"} {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function TierForm({ organizationId, eventId, tier, onOpenChange }: Props) {
  const qc = useQueryClient();
  const sold = tier?.quantitySold ?? 0;

  const schema = z
    .object({
      name: z.string().trim().min(1, "Name is required").max(100),
      price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a price like "499" or "499.50"'),
      quantityTotal: z.number({ error: "Enter a number" }).int().min(Math.max(1, sold),
        sold ? `Can't go below the ${sold} already sold` : "At least 1"),
      salesStart: z.string(),
      salesEnd: z.string(),
    })
    .refine((v) => !v.salesStart || !v.salesEnd || v.salesEnd >= v.salesStart, {
      message: "Sales must end after they start", path: ["salesEnd"],
    });
  type Values = z.infer<typeof schema>;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: tier?.name ?? "",
      price: tier ? (tier.priceMinor / 100).toFixed(2) : "",
      quantityTotal: tier?.quantityTotal ?? 100,
      salesStart: toLocalInput(tier?.salesStart),
      salesEnd: toLocalInput(tier?.salesEnd),
    },
  });

  const onSubmit = async (v: Values) => {
    const body = {
      name: v.name, price: v.price, quantityTotal: v.quantityTotal,
      salesStart: fromLocalInput(v.salesStart), salesEnd: fromLocalInput(v.salesEnd),
    };
    try {
      if (tier) await updateTier(organizationId, eventId, tier.id, body);
      else await createTier(organizationId, eventId, body);
      invalidateEvent(qc, organizationId, eventId);
      toast.success(tier ? "Tier updated" : "Tier added");
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <DialogHeader><DialogTitle>{tier ? `Edit ${tier.name}` : "Add ticket tier"}</DialogTitle></DialogHeader>
      <FormField id="name" label="Name" placeholder="General admission" error={errors.name?.message} {...register("name")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="price" label="Price (₹)" inputMode="decimal" placeholder="499.00" error={errors.price?.message} {...register("price")} />
        <FormField id="quantityTotal" label="Quantity" type="number" min={1} error={errors.quantityTotal?.message}
          {...register("quantityTotal", { valueAsNumber: true })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="salesStart" label="Sales start (optional)" type="datetime-local" error={errors.salesStart?.message} {...register("salesStart")} />
        <FormField id="salesEnd" label="Sales end (optional)" type="datetime-local" error={errors.salesEnd?.message} {...register("salesEnd")} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save"}</Button>
      </DialogFooter>
    </form>
  );
}
