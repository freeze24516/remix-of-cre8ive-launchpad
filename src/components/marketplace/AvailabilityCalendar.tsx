import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarOff, Plane } from "lucide-react";
import { getMyAvailability, setVacation, toggleUnavailableDate } from "@/lib/marketplace.functions";

export function AvailabilityCalendar() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["my-availability"], queryFn: () => getMyAvailability() });
  const [from, setFrom] = useState(data?.creator?.vacation_from ?? "");
  const [to, setTo] = useState(data?.creator?.vacation_to ?? "");

  const toggle = useMutation({
    mutationFn: (date: string) => toggleUnavailableDate({ data: { date } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-availability"] }),
    onError: (e: any) => toast.error(e.message),
  });
  const vac = useMutation({
    mutationFn: (vars: { from: string | null; to: string | null }) => setVacation({ data: vars }),
    onSuccess: () => { toast.success("Vacation updated"); qc.invalidateQueries({ queryKey: ["my-availability"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const blocked = new Set((data?.dates ?? []) as string[]);
  const blockedDates = (data?.dates ?? []).map((d) => new Date(d + "T00:00:00"));

  return (
    <div className="space-y-6 rounded-2xl border border-border/70 bg-card p-5">
      <div>
        <h3 className="flex items-center gap-2 font-semibold"><CalendarOff className="h-4 w-4 text-accent" /> Availability</h3>
        <p className="mt-1 text-sm text-muted-foreground">Click any date to block or unblock it. Blocked dates are visible on your profile.</p>
      </div>
      <Calendar
        mode="single"
        selected={undefined}
        onSelect={(d) => { if (!d) return; const iso = d.toISOString().slice(0, 10); toggle.mutate(iso); }}
        modifiers={{ blocked: blockedDates }}
        modifiersClassNames={{ blocked: "bg-destructive/20 text-destructive line-through" }}
        className="pointer-events-auto rounded-md border"
      />
      <div className="text-xs text-muted-foreground">{blocked.size} upcoming blocked date{blocked.size === 1 ? "" : "s"}</div>

      <div className="border-t border-border/60 pt-5">
        <h4 className="flex items-center gap-2 text-sm font-semibold"><Plane className="h-4 w-4 text-accent" /> Vacation mode</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button size="sm" disabled={vac.isPending || !from || !to} onClick={() => vac.mutate({ from, to })}>
            Set vacation
          </Button>
          {(data?.creator?.vacation_from || data?.creator?.vacation_to) && (
            <Button size="sm" variant="ghost" disabled={vac.isPending} onClick={() => { setFrom(""); setTo(""); vac.mutate({ from: null, to: null }); }}>
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
