import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getMyStaffRoles, grantRole, listUsers, revokeRole, setUserSuspension } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["my-staff-roles"], queryFn: () => getMyStaffRoles() });
  const { data, isLoading } = useQuery({ queryKey: ["admin-users", search], queryFn: () => listUsers({ data: { q: search || undefined } }) });

  const suspend = useMutation({
    mutationFn: (vars: { userId: string; suspended: boolean }) => setUserSuspension({ data: vars }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const grant = useMutation({
    mutationFn: (vars: { userId: string; role: "admin" | "moderator" }) => grantRole({ data: vars }),
    onSuccess: () => { toast.success("Role granted"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const revoke = useMutation({
    mutationFn: (vars: { userId: string; role: "admin" | "moderator" }) => revokeRole({ data: vars }),
    onSuccess: () => { toast.success("Role revoked"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const isAdmin = !!me?.isAdmin;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">Manage roles and suspensions.</p>
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }}>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username or name" className="w-64" />
          <Button type="submit" variant="outline" size="sm">Search</Button>
        </form>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">No users.</div>
      ) : (
        <div className="space-y-2">
          {data.map((u: any) => {
            const isUserAdmin = u.roles?.includes("admin");
            const isUserMod = u.roles?.includes("moderator");
            return (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-9 w-9 overflow-hidden rounded-full bg-muted">
                    {u.avatar_url ? <img src={u.avatar_url} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <Link to="/u/$username" params={{ username: u.username }} className="font-medium hover:underline">{u.display_name}</Link>
                    <div className="text-xs text-muted-foreground">@{u.username} · {u.kind}</div>
                  </div>
                  <div className="ml-2 flex flex-wrap gap-1">
                    {isUserAdmin && <Badge variant="outline" className="border-accent/60 text-accent">admin</Badge>}
                    {isUserMod && <Badge variant="secondary">moderator</Badge>}
                    {u.is_suspended && <Badge variant="outline" className="border-destructive/60 text-destructive">suspended</Badge>}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex flex-wrap gap-2">
                    {isUserMod ? (
                      <Button size="sm" variant="ghost" onClick={() => revoke.mutate({ userId: u.id, role: "moderator" })}>Remove mod</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => grant.mutate({ userId: u.id, role: "moderator" })}>Make mod</Button>
                    )}
                    {isUserAdmin ? (
                      <Button size="sm" variant="ghost" onClick={() => revoke.mutate({ userId: u.id, role: "admin" })}>Remove admin</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => grant.mutate({ userId: u.id, role: "admin" })}>Make admin</Button>
                    )}
                    <Button size="sm" variant={u.is_suspended ? "outline" : "ghost"} onClick={() => suspend.mutate({ userId: u.id, suspended: !u.is_suspended })}>
                      {u.is_suspended ? "Unsuspend" : "Suspend"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}