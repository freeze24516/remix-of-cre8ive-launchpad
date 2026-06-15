import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { listNotifications } from "@/lib/messaging.functions";

export function NotificationsBell() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["notifications"], queryFn: () => listNotifications() });

  useEffect(() => {
    const channel = supabase
      .channel("notif-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        qc.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const unread = (data ?? []).filter((n: any) => !n.read_at).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="text-sm font-medium">Notifications</span>
          <Link to="/dashboard/notifications" className="text-xs text-accent hover:underline">View all</Link>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {(data ?? []).length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">All caught up.</div>
          ) : (
            (data ?? []).slice(0, 8).map((n: any) => (
              <Link key={n.id} to={n.link ?? "/dashboard/notifications"} className={`block border-b border-border/50 p-3 text-sm hover:bg-secondary/50 ${!n.read_at ? "bg-secondary/30" : ""}`}>
                <div className="font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}