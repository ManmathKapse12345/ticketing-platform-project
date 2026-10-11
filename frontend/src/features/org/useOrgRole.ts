import { useParams } from "react-router-dom";
import type { OrgRole } from "@/features/auth/types";
import { hasRole } from "./permissions";
import { useMyOrgRole } from "./useMyOrgRole";

export function useOrgRole() {
  const { organizationId = "" } = useParams();
  const { data: role } = useMyOrgRole(organizationId);
  return { organizationId, role: role ?? null, can: (min: OrgRole) => hasRole(role, min) };
}
