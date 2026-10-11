export interface PublicEvent {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  venue: string | null;
  startDate: string;
  endDate: string | null;
  status: "PUBLISHED";
  createdAt: string;
  updatedAt: string;
}

export interface TicketTier {
  id: string;
  eventId: string;
  organizationId: string;
  name: string;
  priceMinor: number;
  quantityTotal: number;
  quantitySold: number;
  salesStart: string | null;
  salesEnd: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EventListParams {
  page: number;
  limit: number;
  search?: string;
  from?: string; // "YYYY-MM-DD" from the date input
  to?: string;
}
