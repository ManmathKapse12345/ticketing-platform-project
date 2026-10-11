import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/dates";
import { formatMinor } from "@/lib/money";
import { getTierState, remaining } from "./tiers";
import type { TicketTier } from "./types";

const MAX_PER_ORDER = 10;

interface Props {
  tier: TicketTier;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

export function TierCard({ tier, quantity, onQuantityChange }: Props) {
  const state = getTierState(tier);
  const left = remaining(tier);
  const max = Math.min(left,MAX_PER_ORDER);

  return (
    <Card className={state === "on_sale" ? "" : "opacity-70"}>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-medium">{tier.name}</h3>
          <p className="text-sm text-muted-foreground">
            {state === "on_sale" && (left <= 10 ? `Only ${left} left!` : `${left} available`)}
            {state === "sold_out" && "Sold out"}
            {state === "not_started" && `Sales open ${formatDateTime(tier.salesStart!)}`}
            {state === "ended" && "Sales have ended"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">{tier.priceMinor === 0 ? "Free" : formatMinor(tier.priceMinor)}</p>
          {state === "sold_out" && <Badge variant="secondary">Sold out</Badge>}
          {/* Phase 3: quantity picker + "Buy" button goes here */}
        </div>
        <div className="grid justify-items-end gap-2">
          <p className="text-lg font-semibold">{tier.priceMinor === 0 ? "Free" : formatMinor(tier.priceMinor)}</p>
          {state === "on_sale" ? (
            <div className="flex items-center gap-2">
              <Button size="icon-sm" variant="outline" aria-label={`Remove one ${tier.name}`}
                disabled={quantity === 0} onClick={() => onQuantityChange(quantity - 1)}>
                <Minus />
              </Button>
              <span className="w-6 text-center tabular-nums">{quantity}</span>
              <Button size="icon-sm" variant="outline" aria-label={`Add one ${tier.name}`}
                disabled={quantity >= max} onClick={() => onQuantityChange(quantity + 1)}>
                <Plus />
              </Button>
            </div>
          ) : (
            state === "sold_out" && <Badge variant="secondary">Sold out</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
