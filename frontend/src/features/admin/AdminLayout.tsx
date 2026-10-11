import { NavLink, Outlet } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";

const LINKS = [
  { to: "payouts", label: "Payouts" },
  { to: "organizations", label: "Organizations" },
  { to: "users", label: "Users" },
];

export function AdminLayout() {
  return (
    <div className="grid gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
      <aside className="grid content-start gap-3">
        <p className="text-sm font-medium">Platform admin</p>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {LINKS.map((l) => (
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
