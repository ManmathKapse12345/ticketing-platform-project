import type { TicketTier } from "./types";

export type TierState = "on_sale" | "sold_out" | "not_started" | "ended";

export const remaining = (t: TicketTier) => Math.max(0, t.quantityTotal - t.quantitySold);

export function getTierState(t: TicketTier, now = new Date()): TierState {
  if (t.salesStart && now < new Date(t.salesStart)) return "not_started";
  if (t.salesEnd && now > new Date(t.salesEnd)) return "ended";
  if (remaining(t) === 0) return "sold_out";
  return "on_sale";
}
