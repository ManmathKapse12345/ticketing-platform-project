import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { useMyOrgRole } from "@/features/org/useMyOrgRole";
import { useAuth } from "./useAuth";
import type { OrgRole } from "./types";
import { hasRole } from "../org/permissions";
// const ORG_RANK: Record<OrgRole, number> = { viewer: 0, editor: 1, admin: 2, owner: 3 };

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <FullPageSpinner />;
  if (status === "guest") return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

// Login/register pages: once logged in, send the user back to where they came from
export function GuestOnly() {
  const { status } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  if (status === "loading") return <FullPageSpinner />;
  if (status === "authenticated") return <Navigate to={from} replace />;
  return <Outlet />;
}

// Use inside RequireAuth
export function RequirePlatformAdmin() {
  const { user } = useAuth();
  return user?.role === "platformAdmin" ? <Outlet /> : <Navigate to="/" replace />;
}

// Use on routes that contain :organizationId (Phase 4). The backend still enforces roles;
// this only stops people from opening pages they can't use.
export function RequireOrgRole({ min }: { min: OrgRole }) {
  const { organizationId } = useParams();
  const { data: role, isPending } = useMyOrgRole(organizationId);
  if (isPending) return <FullPageSpinner />;
  if (!hasRole(role, min)) return <Navigate to="/" replace />;
  return <Outlet />;
}
