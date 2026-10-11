import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/useAuth";
import { createOrder } from "@/features/orders/api";
import { getErrorMessage } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { TierCard } from "./TierCard";
import type { PublicEvent, TicketTier } from "./types";

export function TicketSelector({ event, tiers }: { event: PublicEvent; tiers: TicketTier[] }) {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());

  const count = Object.values(quantities).reduce((a, b) => a + b, 0);
  const total = tiers.reduce((sum, t) => sum + (quantities[t.id] ?? 0) * t.priceMinor, 0);

  const setQuantity = (tierId: string, quantity: number) => {
    idempotencyKey.current = crypto.randomUUID(); // a different cart is a different order
    setQuantities((q) => ({ ...q, [tierId]: quantity }));
  };

  const handleContinue = async () => {
    if (status !== "authenticated") {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    setSubmitting(true);
    try {
      const items = Object.entries(quantities)
        .filter(([, quantity]) => quantity > 0)
        .map(([ticketTier, quantity]) => ({ ticketTier, quantity }));
      const order = await createOrder(event.organizationId, event.id, items, idempotencyKey.current);
      idempotencyKey.current = crypto.randomUUID();
      navigate(`/checkout/${order.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err)); // e.g. '"VIP" is sold out'
      queryClient.invalidateQueries({ queryKey: ["event", event.id, "tiers"] }); // show fresh availability
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-3">
      {tiers.map((tier) => (
        <TierCard key={tier.id} tier={tier} quantity={quantities[tier.id] ?? 0}
          onQuantityChange={(q) => setQuantity(tier.id, q)} />
      ))}
      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-muted-foreground">{count} ticket{count === 1 ? "" : "s"}</span>
        <span className="text-lg font-semibold">{formatMinor(total)}</span>
      </div>
      <Button disabled={submitting || (status === "authenticated" && count === 0)} onClick={handleContinue}>
        {status !== "authenticated" ? "Log in to buy" : submitting ? "Reserving seats…" : "Continue to payment"}
      </Button>
      <p className="text-xs text-muted-foreground">Seats are held for 15 minutes while you pay.</p>
    </div>
  );
}
