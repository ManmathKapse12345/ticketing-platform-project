import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { NativeSelect } from "@/components/NativeSelect";
import { useMyOrganizations } from "./api";
import { useOrgRole } from "./useOrgRole";

export function OrgLayout() {
  const { organizationId, role, can } = useOrgRole();
  const navigate = useNavigate();
  const { data: orgs } = useMyOrganizations();

  const links = [
    { to: "events", label: "Events", show: true },
    { to: "analytics", label: "Analytics", show: can("admin") },
    { to: "orders", label: "Orders", show: can("admin") },
    { to: "members", label: "Members", show: true },
    { to: "settings", label: "Settings", show: true },
  ];

  return (
    <div className="grid gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
      <aside className="grid content-start gap-3">
        <NativeSelect aria-label="Organization" value={organizationId}
          onChange={(e) => navigate(`/org/${e.target.value}/events`)}>
          {orgs?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </NativeSelect>
        {role && <p className="text-xs text-muted-foreground">Your role: <span className="capitalize">{role}</span></p>}
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {links.filter((l) => l.show).map((l) => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => buttonVariants({ variant: isActive ? "secondary" : "ghost", className: "justify-start" })}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="min-w-0"><Outlet /></section>
    </div>
  );
}
