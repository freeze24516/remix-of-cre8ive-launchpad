import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, User, Palette, FolderKanban, Briefcase, MessageSquare, Bell, FileText, Heart, Bookmark, BarChart3 } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CRE8IVE" }] }),
  component: DashboardLayout,
});

const nav = [
  { to: "/dashboard", label: "Overview", Icon: LayoutDashboard, exact: true as boolean },
  { to: "/dashboard/profile", label: "Account", Icon: User, exact: false as boolean },
  { to: "/dashboard/creator", label: "Creator profile", Icon: Palette, exact: false as boolean },
  { to: "/dashboard/portfolio", label: "Portfolio", Icon: FolderKanban, exact: false as boolean },
  { to: "/dashboard/analytics", label: "Analytics", Icon: BarChart3, exact: false as boolean },
  { to: "/dashboard/jobs", label: "My jobs", Icon: Briefcase, exact: false as boolean },
  { to: "/dashboard/applications", label: "Applications", Icon: FileText, exact: false as boolean },
  { to: "/dashboard/saved-creators", label: "Saved creators", Icon: Heart, exact: false as boolean },
  { to: "/dashboard/saved-jobs", label: "Saved jobs", Icon: Bookmark, exact: false as boolean },
  { to: "/dashboard/messages", label: "Messages", Icon: MessageSquare, exact: false as boolean },
  { to: "/dashboard/notifications", label: "Notifications", Icon: Bell, exact: false as boolean },
] as const;

function DashboardLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-6 py-10 md:grid-cols-[220px,1fr]">
        <aside className="md:sticky md:top-20 md:self-start">
          <nav className="flex gap-1 overflow-x-auto md:flex-col">
            {nav.map(({ to, label, Icon, exact }) => {
              const active = exact ? pathname === to : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"}`}
                >
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