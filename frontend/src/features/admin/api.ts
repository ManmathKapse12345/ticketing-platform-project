import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User, UserRole, OrgRole } from "@/features/auth/types";
import type { Pagination } from "@/features/events/types";
import type { Organization, Payout, PayoutDetailsInput, PayoutStatus } from "@/features/org/types";

export interface AdminOrganization extends Organization {
  _count: { members: number; events: number };
}

export interface AdminUser extends User {
  memberships: { role: OrgRole; organization: { id: string; name: string } }[];
}

export interface AdminPayout extends Payout {
  organization: { id: string; name: string };
  payoutDetails: PayoutDetailsInput | null; // full details, only while REQUESTED
}

export const adminKeys = {
  all: ["admin"] as const,
  payouts: (params: object) => ["admin", "payouts", params] as const,
  organizations: (params: object) => ["admin", "organizations", params] as const,
  users: (params: object) => ["admin", "users", params] as const,
};

// Empty strings mean "no filter", so they're left out of the query string.
const clean = (params: Record<string, string | number | undefined>) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== undefined));

export const useAdminPayouts = (params: { page: number; status: PayoutStatus | "" }) =>
  useQuery({
    queryKey: adminKeys.payouts(params),
    placeholderData: keepPreviousData,
    queryFn: () =>
      api
        .get<{ payouts: AdminPayout[]; pagination: Pagination }>("/admin/payouts", { params: clean(params) })
        .then((r) => r.data),
  });

export const useAdminOrganizations = (params: { page: number; search: string; verified: "" | "true" | "false" }) =>
  useQuery({
    queryKey: adminKeys.organizations(params),
    placeholderData: keepPreviousData,
    queryFn: () =>
      api
        .get<{ organizations: AdminOrganization[]; pagination: Pagination }>("/admin/organizations", {
          params: clean(params),
        })
        .then((r) => r.data),
  });

export const useAdminUsers = (params: { page: number; search: string; role: UserRole | "" }) =>
  useQuery({
    queryKey: adminKeys.users(params),
    placeholderData: keepPreviousData,
    queryFn: () =>
      api
        .get<{ users: AdminUser[]; pagination: Pagination }>("/admin/users", { params: clean(params) })
        .then((r) => r.data),
  });

export type PayoutUpdate =
  | { status: "PAID"; reference: string; note?: string }
  | { status: "CANCELLED"; note?: string };

export const updatePayout = (payoutId: string, body: PayoutUpdate) =>
  api.patch<{ payout: Payout }>(`/admin/payouts/${payoutId}`, body).then((r) => r.data.payout);

export const setOrganizationVerified = (organizationId: string, verified: boolean) =>
  api.patch(`/admin/organizations/${organizationId}/verification`, { verified });
