import { useQuery, type QueryClient } from "@tanstack/react-query";
import axios from "axios";
import { api } from "@/lib/api";
import type { OrgRole } from "@/features/auth/types";
import type {
  CheckedInTicket, EventAnalytics, Member, OrgAnalytics, OrgEvent, OrgOrder, OrgPayouts, Organization, Payout,
  PayoutDetailsInput, TicketTier,
} from "./types";

export const orgKeys = {
  mine: ["organization", "mine"] as const,
  detail: (orgId: string) => ["organization", orgId] as const,
  events: (orgId: string) => ["organization", orgId, "events"] as const,
  event: (orgId: string, eventId: string) => ["organization", orgId, "events", eventId] as const,
  tiers: (orgId: string, eventId: string) => ["organization", orgId, "events", eventId, "tiers"] as const,
  members: (orgId: string) => ["organization", orgId, "members"] as const,
  orders: (orgId: string) => ["organization", orgId, "orders"] as const,
  order: (orgId: string, orderId: string) => ["organization", orgId, "orders", orderId] as const,
  analytics: (orgId: string) => ["organization", orgId, "analytics"] as const,
  payouts: (orgId: string) => ["organization", orgId, "payouts"] as const,
  eventAnalytics: (orgId: string, eventId: string, days: number) =>
    ["organization", orgId, "events", eventId, "analytics", days] as const,
};

const org = (orgId: string) => `/organization/${orgId}`;

// ---------- queries ----------
export function useMyOrganizations(enabled = true) {
  return useQuery({
    queryKey: orgKeys.mine,
    enabled,
    queryFn: async () => {
      try {
        return (await api.get<{ organization: Organization[] }>("/organization")).data.organization;
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) return []; // "no organizations"
        throw err;
      }
    },
  });
}

export const useOrganization = (orgId: string) =>
  useQuery({
    queryKey: orgKeys.detail(orgId),
    queryFn: () => api.get<{ organization: Organization }>(org(orgId)).then((r) => r.data.organization),
  });

export const useOrgEvents = (orgId: string) =>
  useQuery({
    queryKey: orgKeys.events(orgId),
    queryFn: () => api.get<{ events: OrgEvent[] }>(`${org(orgId)}/events`).then((r) => r.data.events),
  });

export const useOrgEvent = (orgId: string, eventId: string, enabled = true) =>
  useQuery({
    queryKey: orgKeys.event(orgId, eventId),
    enabled: enabled && !!eventId,
    queryFn: () => api.get<{ event: OrgEvent }>(`${org(orgId)}/events/${eventId}`).then((r) => r.data.event),
  });

export const useOrgTiers = (orgId: string, eventId: string) =>
  useQuery({
    queryKey: orgKeys.tiers(orgId, eventId),
    queryFn: () => api.get<{ tiers: TicketTier[] }>(`${org(orgId)}/events/${eventId}/tiers`).then((r) => r.data.tiers),
  });

export const useMembers = (orgId: string) =>
  useQuery({
    queryKey: orgKeys.members(orgId),
    queryFn: () => api.get<{ members: Member[] }>(`${org(orgId)}/members`).then((r) => r.data.members),
  });

export const useOrgOrders = (orgId: string) =>
  useQuery({
    queryKey: orgKeys.orders(orgId),
    queryFn: () => api.get<{ orders: OrgOrder[] }>(`${org(orgId)}/orders`).then((r) => r.data.orders),
  });

export const useOrgOrder = (orgId: string, orderId: string) =>
  useQuery({
    queryKey: orgKeys.order(orgId, orderId),
    queryFn: () => api.get<{ order: OrgOrder }>(`${org(orgId)}/orders/${orderId}`).then((r) => r.data.order),
  });

export const useOrgAnalytics = (orgId: string) =>
  useQuery({
    queryKey: orgKeys.analytics(orgId),
    queryFn: () => api.get<{ analytics: OrgAnalytics }>(`${org(orgId)}/analytics`).then((r) => r.data.analytics),
  });

/** Daily sales cover the last `days` days, ending now */
export const useEventAnalytics = (orgId: string, eventId: string, days: number) =>
  useQuery({
    queryKey: orgKeys.eventAnalytics(orgId, eventId, days),
    placeholderData: (previous) => previous, // keep the old chart on screen while a new range loads
    refetchInterval: 30_000, // check-ins change during the event
    queryFn: () => {
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
      return api
        .get<{ analytics: EventAnalytics }>(`${org(orgId)}/events/${eventId}/analytics`, {
          params: { from: from.toISOString(), to: to.toISOString() },
        })
        .then((r) => r.data.analytics);
    },
  });

export const useOrgPayouts = (orgId: string) =>
  useQuery({
    queryKey: orgKeys.payouts(orgId),
    queryFn: () => api.get<OrgPayouts>(`${org(orgId)}/payouts`).then((r) => r.data),
  });

// ---------- mutations ----------
export interface EventInput {
  title: string;
  description?: string;
  venue?: string;
  startDate: string;
  endDate?: string;
  status?: "DRAFT" | "PUBLISHED";
}

export const createEvent = (orgId: string, body: EventInput) =>
  api.post<{ event: OrgEvent }>(`${org(orgId)}/events`, body).then((r) => r.data.event);

export const updateEvent = (orgId: string, eventId: string, body: Partial<EventInput>) =>
  api.patch<{ event: OrgEvent }>(`${org(orgId)}/events/${eventId}`, body).then((r) => r.data.event);

export const cancelEvent = (orgId: string, eventId: string) =>
  api
    .delete<{ event: OrgEvent; refunds: { requested: number; failed: { orderId: string; message: string }[] } }>(
      `${org(orgId)}/events/${eventId}`,
    )
    .then((r) => r.data);

export interface TierInput {
  name: string;
  price: string; // "499.00"
  quantityTotal: number;
  salesStart?: string;
  salesEnd?: string;
}

export const createTier = (orgId: string, eventId: string, body: TierInput) =>
  api.post(`${org(orgId)}/events/${eventId}/tiers`, body);

export const updateTier = (orgId: string, eventId: string, tierId: string, body: Partial<TierInput>) =>
  api.patch(`${org(orgId)}/events/${eventId}/tiers/${tierId}`, body);

export const deleteTier = (orgId: string, eventId: string, tierId: string) =>
  api.delete(`${org(orgId)}/events/${eventId}/tiers/${tierId}`);

export const inviteMember = (orgId: string, email: string, memberRole: Exclude<OrgRole, "owner">) =>
  api.post(`${org(orgId)}/invite`, { email, memberRole });

export const changeMemberRole = (orgId: string, userId: string, newRole: Exclude<OrgRole, "owner">) =>
  api.patch(`${org(orgId)}/members/${userId}/role`, { newRole });

export const removeMember = (orgId: string, userId: string) => api.delete(`${org(orgId)}/members/${userId}`);

export const updateOrganization = (
  orgId: string,
  body: { name?: string; branding?: { logoUrl?: string; primaryColor?: string } },
) => api.patch<{ updated: Organization }>(org(orgId), body).then((r) => r.data.updated);

export const refundOrder = (orgId: string, orderId: string, body: { amountMinor?: number; reason?: string }) =>
  api.post(`${org(orgId)}/orders/${orderId}/refund`, body);

export const updatePayoutDetails = (orgId: string, body: PayoutDetailsInput) =>
  api.put(`${org(orgId)}/payout-details`, body);

/** Always requests the whole available balance */
export const requestPayout = (orgId: string) =>
  api.post<{ payout: Payout }>(`${org(orgId)}/payouts`).then((r) => r.data.payout);

export const checkInTicket =(orgId: string, eventId: string, qrCode: string) =>
  api
    .post<{ ticket: CheckedInTicket }>(`${org(orgId)}/events/${eventId}/checkin`, { qrCode })
    .then((r) => r.data.ticket);

export const acceptInvite =(token: string) =>
  api.post<{ organization: { id: string; name: string } }>(`/organization/invite/${token}/accept`).then((r) => r.data.organization);

export const registerFromInvite = (token: string, name: string, password: string) =>
  api
    .post<{ accessToken: string; organization: { id: string; name: string } }>(
      `/organization/invite/${token}/register`,
      { name, password },
    )
    .then((r) => r.data);

/** After changing an event: refresh the organizer views and the public pages */
export const invalidateEvent = (qc: QueryClient, orgId: string, eventId: string) => {
  qc.invalidateQueries({ queryKey: orgKeys.events(orgId) }); // also covers the event and its tiers
  qc.invalidateQueries({ queryKey: ["events"] });
  qc.invalidateQueries({ queryKey: ["event", eventId] });
};
