import type { OrgRole } from "@/features/auth/types";
import type { Order } from "@/features/orders/types";
export type { TicketTier } from "@/features/events/types";

export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED";

export interface Organization {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrgEvent {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  venue: string | null;
  startDate: string;
  endDate: string | null;
  status: EventStatus;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  userId: string;
  role: OrgRole;
  joinedAt: string;
  user: { id: string; name: string; email: string };
}

export interface Refund {
  id: string;
  amountMinor: number;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export interface OrgOrder extends Order {
  user?: { id: string; name: string; email: string };
  payments?: { id: string; amountMinor: number; refundedMinor: number; status: string; refunds: Refund[] }[];
}

// Rates are 0..1, or null when there's nothing to divide by ("no data", not 0%).
export interface Revenue {
  grossMinor: number;
  refundedMinor: number;
  netMinor: number;
  paidOrders: number;
}

export interface EventAnalytics {
  event: { id: string; title: string; status: EventStatus; startDate: string };
  revenue: Revenue;
  tiers: {
    tierId: string;
    name: string;
    priceMinor: number;
    quantityTotal: number;
    sold: number;
    revenueMinor: number;
    sellThroughRate: number | null;
  }[];
  dailySales: { day: string; orders: number; tickets: number; revenueMinor: number }[]; // only days with sales
  attendance: { issued: number; checkedIn: number; cancelled: number; attendanceRate: number | null };
  traffic: { views: number; paidOrders: number; conversionRate: number | null };
}

export interface OrgAnalytics {
  totals: Revenue;
  events: (Revenue & {
    eventId: string;
    title: string;
    status: EventStatus;
    startDate: string;
    views: number;
    conversionRate: number | null;
  })[];
}

export type PayoutStatus = "REQUESTED" | "PAID" | "CANCELLED";

export interface Payout {
  id: string;
  organizationId: string;
  amountMinor: number;
  status: PayoutStatus;
  reference: string | null; // bank/UTR reference once PAID
  note: string | null;
  processedAt: string | null;
  createdAt: string;
}

/** Masked by the backend: the full account number / UPI ID never reaches the browser */
export type PayoutDestination =
  | { method: "bank"; accountHolderName: string; accountLast4: string; ifsc: string }
  | { method: "upi"; upiId: string }
  | { method: "unreadable" };

export interface OrgPayouts {
  verified: boolean;
  destination: PayoutDestination | null;
  balance: { settledMinor: number; reservedMinor: number; availableMinor: number };
  payouts: Payout[];
}

export type PayoutDetailsInput =
  | { method: "bank"; accountHolderName: string; accountNumber: string; ifsc: string }
  | { method: "upi"; upiId: string };

export interface CheckedInTicket {
  id: string;
  status: "active" | "used" | "cancelled";
  ticketTier: { name: string } | null;
  owner: { name: string; email: string };
}
