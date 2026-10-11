import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { endOfDayISO, startOfDayISO } from "@/lib/dates";
import type { EventListParams, Pagination, PublicEvent, TicketTier } from "./types";

export function useEvents({ page, limit, search, from, to }: EventListParams) {
  return useQuery({
    queryKey: ["events", { page, limit, search, from, to }],
    queryFn: () =>
      api
        .get<{ events: PublicEvent[]; pagination: Pagination }>("/events", {
          // axios drops undefined values, so empty filters aren't sent
          params: {
            page,
            limit,
            search: search || undefined,
            from: from ? startOfDayISO(from) : undefined,
            to: to ? endOfDayISO(to) : undefined,
          },
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData, // keep showing the old page while the next one loads
  });
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: ["event", eventId],
    queryFn: () => api.get<{ event: PublicEvent }>(`/events/${eventId}`).then((r) => r.data.event),
    staleTime: 5 * 60_000, // every fetch counts as a view, so don't refetch needlessly
    retry: false,
  });
}

export function useEventTiers(eventId: string) {
  return useQuery({
    queryKey: ["event", eventId, "tiers"],
    queryFn: () => api.get<{ tiers: TicketTier[] }>(`/events/${eventId}/tiers`).then((r) => r.data.tiers),
    staleTime: 30_000, // availability changes as people buy
    retry: false,
  });
}
