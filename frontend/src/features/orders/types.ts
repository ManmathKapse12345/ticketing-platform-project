export type PaymentStatus = "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
export type TicketStatus = "active" | "used" | "cancelled";

export interface EventSummary {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  venue: string | null;
}

export interface OrderItem {
  id: string;
  ticketTierId: string;
  tierName: string;
  quantity: number;
  unitPriceMinor: number;
  subtotalMinor: number;
}

export interface Order {
  id: string;
  eventId: string;
  organizationId: string;
  currency: string;
  subtotalMinor: number;
  feesMinor: number;
  totalAmountMinor: number;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  expiresAt: string;
  createdAt: string;
  items: OrderItem[];
  event?: EventSummary; // from the step-0 backend change
}

export interface Checkout {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
}

export interface Ticket {
  id: string;
  orderId: string;
  eventId: string;
  ticketTierId: string | null;
  qrCode: string;
  status: TicketStatus;
  createdAt: string;
  event?: EventSummary;
  ticketTier?: { name: string } | null;
}
