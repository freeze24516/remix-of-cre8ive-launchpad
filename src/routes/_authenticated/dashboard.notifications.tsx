import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, MessageSquare, Star, Briefcase, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { listNotifications, markNotificationsRead } from "@/lib/messaging.functions";

export const Route = createFileRoute("/_authenticated/dashboard/notifications")({
  component: NotificationsPage,
});

const FILTERS = [
  { id: "all", label: "All" },
  { id: "message", label: "Messages" },
  { id: "review", label: "Reviews" },
  { id: "application", label: "Applications" },
  { id: "application_status", label: "Invitations" },
  { id: "system", label: "System" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function iconFor(kind: string) {
  if (kind === "message") return MessageSquare;
  if (kind === "review") return Star;
  if (kind.startsWith("application")) return Briefcase;
  if (kind === "system") return Settings;
  return FileText;
}

function NotificationsPage() {
  const qc = useQueryClient();
  const { data: items } = useSuspenseQuery({ queryKey: ["notifications"], queryFn: () => listNotifications() });
  const markFn = useServerFn(markNotificationsRead);
  const [filter, setFilter] = useState<FilterId>("all");

  useEffect(() => {
    const channel = supabase
      .channel("notif-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const markAll = useMutation({
    mutationFn: () => markFn({ data: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "application") return items.filter((n: any) => n.kind === "application");
    return items.filter((n: any) => n.kind === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const n of items as any[]) c[n.kind] = (c[n.kind] ?? 0) + 1;
    return c;
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">Your inbox of activity across the platform.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
          <CheckCheck className="mr-1 h-4 w-4" />Mark all read
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-card p-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const count = f.id === "all" ? counts.all : counts[f.id] ?? 0;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f.label}
              {count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">All quiet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n: any) => {
            const Icon = iconFor(n.kind);
            const inner = (
              <div className={`flex items-start gap-3 rounded-xl border p-4 transition ${n.read_at ? "border-border bg-card" : "border-primary/30 bg-card shadow-[var(--shadow-glow)]"}`}>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{n.title}</div>
                      {n.body && <div className="mt-1 text-sm text-muted-foreground">{n.body}</div>}
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
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
