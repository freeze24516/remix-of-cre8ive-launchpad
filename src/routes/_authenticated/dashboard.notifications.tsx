import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listNotifications, markNotificationsRead } from "@/lib/messaging.functions";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const { data: items } = useSuspenseQuery({ queryKey: ["notifications"], queryFn: () => listNotifications() });
  const markFn = useServerFn(markNotificationsRead);
  const markAll = useMutation({
    mutationFn: () => markFn({ data: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">Stay on top of activity.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAll.mutate()}><CheckCheck className="mr-1 h-4 w-4" />Mark all read</Button>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">All quiet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n: any) => {
            const inner = (
              <div className={`rounded-xl border p-4 transition ${n.read_at ? "border-border bg-card" : "border-primary/30 bg-card shadow-[var(--shadow-glow)]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{n.title}</div>
                    {n.body && <div className="mt-1 text-sm text-muted-foreground">{n.body}</div>}
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </div>
            );
            return n.link ? <Link key={n.id} to={n.link}>{inner}</Link> : <div key={n.id}>{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}