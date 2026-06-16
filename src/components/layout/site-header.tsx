import { Link } from "@tanstack/react-router";
import { Sparkles, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth, signOut } from "@/hooks/use-auth";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { getMyStaffRoles } from "@/lib/admin.functions";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const { data: roles } = useQuery({
    queryKey: ["my-staff-roles"],
    queryFn: () => getMyStaffRoles(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const isStaff = !!(roles?.isAdmin || roles?.isModerator);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)]">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          CRE8IVE
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link to="/browse" className="transition-colors hover:text-foreground">Browse creators</Link>
          <Link to="/jobs" className="transition-colors hover:text-foreground">Jobs</Link>
          <a href="#categories" className="transition-colors hover:text-foreground">Categories</a>
          <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
        </nav>
        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <>
              <NotificationsBell />
              {isStaff && (
                <Button asChild variant="ghost" size="sm" className="gap-1">
                  <Link to="/admin"><Shield className="h-4 w-4 text-accent" />Admin</Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm"><Link to="/dashboard">Dashboard</Link></Button>
              <Button size="sm" variant="outline" onClick={() => signOut()}>Sign out</Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
              <Button asChild size="sm" className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-glow)] hover:opacity-95">
                <Link to="/auth" search={{ mode: "signup" }}>Join CRE8IVE</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}