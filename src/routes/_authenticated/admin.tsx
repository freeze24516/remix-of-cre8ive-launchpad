import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shield, Flag, BadgeCheck, FolderKanban, Users } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { getMyStaffRoles } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — CRE8IVE" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Overview", Icon: Shield, exact: true },
  { to: "/admin/reports", label: "Reports", Icon: Flag, exact: false },
  { to: "/admin/verifications", label: "Verifications", Icon: BadgeCheck, exact: false },
  { to: "/admin/portfolios", label: "Portfolios", Icon: FolderKanban, exact: false },
  { to: "/admin/users", label: "Users", Icon: Users, exact: false },
] as const;

function AdminLayout() {
  const { data: roles, isLoading } = useQuery({ queryKey: ["my-staff-roles"], queryFn: () => getMyStaffRoles() });
  const { pathname } = useLocation();

  if (isLoading || !roles) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="grid flex-1 place-items-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!roles.isAdmin && !roles.isModerator) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="mx-auto grid w-full max-w-3xl flex-1 place-items-center px-6 py-16 text-center">
          <div>
            <h1 className="font-display text-3xl font-bold">Restricted</h1>
            <p className="mt-2 text-muted-foreground">This area is reserved for moderators and admins.</p>
            <Link to="/dashboard" className="mt-6 inline-block text-sm text-accent hover:underline">Back to dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-6 py-10 md:grid-cols-[220px,1fr]">
        <aside className="md:sticky md:top-20 md:self-start">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs font-medium">
            <Shield className="h-3 w-3 text-accent" /> {roles.isAdmin ? "Admin" : "Moderator"}
          </div>
          <nav className="flex gap-1 overflow-x-auto md:flex-col">
            {nav.map(({ to, label, Icon, exact }) => {
              const active = exact ? pathname === to : pathname.startsWith(to);
              return (
                <Link key={to} to={to} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"}`}>
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}