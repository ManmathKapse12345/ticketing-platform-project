import type { OrgRole } from "@/features/auth/types";

const ORG_RANK: Record<OrgRole, number> = { viewer: 0, editor: 1, admin: 2, owner: 3 };

export const hasRole = (role: OrgRole | null | undefined, min: OrgRole) =>
  !!role && ORG_RANK[role] >= ORG_RANK[min];
