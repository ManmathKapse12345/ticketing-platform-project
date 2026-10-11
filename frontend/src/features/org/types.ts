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

export interface CheckedInTicket {
  id: string;
  status: "active" | "used" | "cancelled";
  ticketTier: { name: string } | null;
  owner: { name: string; email: string };
}
