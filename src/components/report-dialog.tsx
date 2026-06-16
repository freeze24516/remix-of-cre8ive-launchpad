import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitReport } from "@/lib/admin.functions";

type TargetType = "creator" | "client" | "job" | "portfolio" | "message";

export function ReportDialog({ targetType, targetId, label = "Report" }: { targetType: TargetType; targetId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  const submit = useMutation({
    mutationFn: () => submitReport({ data: { target_type: targetType, target_id: targetId, reason, details: details || undefined } }),
    onSuccess: () => {
      toast.success("Report submitted — thank you");
      setOpen(false);
      setReason("");
      setDetails("");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
          <Flag className="h-3.5 w-3.5" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit a report</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (reason.trim().length < 3) return toast.error("Reason is too short");
            submit.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Spam, scam, inappropriate content" maxLength={120} required />
          </div>
          <div className="space-y-1.5">
            <Label>Details (optional)</Label>
            <Textarea rows={4} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submit.isPending} className="bg-[image:var(--gradient-primary)]">
              {submit.isPending ? "Submitting…" : "Submit report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}