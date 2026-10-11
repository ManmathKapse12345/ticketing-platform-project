import { Badge } from "@/components/ui/badge";
import type { PaymentStatus, TicketStatus } from "./types";

type Variant = "default" | "secondary" | "destructive" | "outline";

const ORDER: Record<PaymentStatus, [string, Variant]> = {
  PAID: ["Paid", "default"],
  PENDING: ["Awaiting payment", "outline"],
  CANCELLED: ["Expired / cancelled", "secondary"],
  REFUNDED: ["Refunded", "secondary"],
};

const TICKET: Record<TicketStatus, [string, Variant]> = {
  active: ["Valid", "default"],
  used: ["Checked in", "secondary"],
  cancelled: ["Cancelled", "destructive"],
};

export function OrderStatusBadge({ status }: { status: PaymentStatus }) {
  const [label, variant] = ORDER[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const [label, variant] = TICKET[status];
  return <Badge variant={variant}>{label}</Badge>;
}
