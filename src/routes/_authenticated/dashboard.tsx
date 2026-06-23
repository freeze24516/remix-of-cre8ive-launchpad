import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, User, Palette, FolderKanban, Briefcase, MessageSquare, Bell, FileText, Heart, Bookmark, BarChart3, CreditCard } from "lucide-react";
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
  { to: "/dashboard/membership", label: "Membership", Icon: CreditCard, exact: false as boolean },
] as const;

function DashboardLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto grid w-full max-w-[1600px] flex-1 gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:gap-8 lg:grid-cols-[240px,1fr] xl:grid-cols-[260px,1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
          <nav
            className="-mx-1 flex gap-1 overflow-x-auto rounded-xl bg-background/80 px-1 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:mx-0 lg:flex-col lg:overflow-visible lg:bg-card/40 lg:p-2 lg:border lg:border-border/60"
            aria-label="Dashboard navigation"
          >
            {nav.map(({ to, label, Icon, exact }) => {
              const active = exact ? pathname === to : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition lg:shrink ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap lg:whitespace-normal">{label}</span>
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