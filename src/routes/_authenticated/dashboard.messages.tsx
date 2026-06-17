import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Paperclip, X, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { listConversations, getMessages, sendMessage } from "@/lib/messaging.functions";
import { getAttachmentUrl } from "@/lib/attachments.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type S = { c?: string };

export const Route = createFileRoute("/_authenticated/dashboard/messages")({
  validateSearch: (s: Record<string, unknown>): S => ({ c: typeof s.c === "string" ? s.c : undefined }),
  component: Messages,
});

const ACCEPT = ".pdf,.zip,.jpg,.jpeg,.png,.mp4,.docx";
const MAX_SIZE = 25 * 1024 * 1024;

type PendingAttachment = { path: string; name: string; size: number; mime: string };

function Messages() {
  const { c: selected } = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: convs } = useSuspenseQuery({ queryKey: ["conversations"], queryFn: () => listConversations() });

  useEffect(() => {
    const channel = supabase
      .channel("conv-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
        if (selected) qc.invalidateQueries({ queryKey: ["messages", selected] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, selected]);

  return (
    <div className="grid h-[calc(100vh-180px)] gap-4 md:grid-cols-[300px,1fr]">
      <aside className="overflow-y-auto rounded-xl border border-border bg-card p-2">
        {convs.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto h-6 w-6" />
            <p className="mt-2">No conversations yet.</p>
          </div>
        ) : (
          convs.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate({ search: { c: c.id } })}
              className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition ${selected === c.id ? "bg-secondary" : "hover:bg-secondary/50"}`}
            >
              <div className="h-9 w-9 overflow-hidden rounded-full bg-muted">
                {c.other?.avatar_url && <img src={c.other.avatar_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{c.other?.display_name ?? "Unknown"}</div>
                <div className="truncate text-xs text-muted-foreground">{new Date(c.last_message_at).toLocaleString()}</div>
              </div>
            </button>
          ))
        )}
      </aside>
      <main className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        {selected ? <Thread conversationId={selected} meId={user?.id ?? ""} /> : (
          <div className="m-auto text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto h-8 w-8" />
            <p className="mt-2">Select a conversation</p>
          </div>
        )}
      </main>
    </div>
  );
}

function Thread({ conversationId, meId }: { conversationId: string; meId: string }) {
  const { data: msgs } = useQuery({ queryKey: ["messages", conversationId], queryFn: () => getMessages({ data: { conversationId } }) });
  const qc = useQueryClient();
  const sendFn = useServerFn(sendMessage);
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  async function uploadFile(file: File) {
    if (file.size > MAX_SIZE) {
      toast.error("File exceeds 25MB limit");
      return;
    }
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const path = `${conversationId}/${crypto.randomUUID()}-${safeName}`;
    setUploadProgress(0);
    try {
      const { data: signed, error } = await supabase.storage
        .from("message-attachments")
        .createSignedUploadUrl(path);
      if (error || !signed) throw error ?? new Error("Failed");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signed.signedUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });

      setAttachments((a) => [...a, { path, name: file.name, size: file.size, mime: file.type || "application/octet-stream" }]);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploadProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const send = useMutation({
    mutationFn: () => sendFn({ data: { conversationId, body, attachments } }),
    onSuccess: () => {
      setBody("");
      setAttachments([]);
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <>
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {(msgs ?? []).map((m: any) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-[image:var(--gradient-primary)] text-primary-foreground" : "bg-secondary"}`}>
                {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {m.attachments.map((a: PendingAttachment) => (
                      <AttachmentLink key={a.path} attachment={a} mine={mine} />
                    ))}
                  </div>
                )}
                <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{new Date(m.created_at).toLocaleTimeString()}</div>
              </div>
            </div>
          );
        })}
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-border px-3 pt-2">
          {attachments.map((a, i) => (
            <div key={a.path} className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-2 py-1 text-xs">
              <FileText className="h-3 w-3" />
              <span className="max-w-[160px] truncate">{a.name}</span>
              <button type="button" onClick={() => setAttachments((arr) => arr.filter((_, idx) => idx !== i))}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {uploadProgress !== null && (
        <div className="border-t border-border px-3 pt-2">
          <div className="mb-1 text-[11px] text-muted-foreground">Uploading… {uploadProgress}%</div>
          <Progress value={uploadProgress} className="h-1.5" />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim() || attachments.length > 0) send.mutate();
        }}
        className="flex gap-2 border-t border-border p-3"
      >
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f);
          }}
        />
        <Button type="button" size="icon" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploadProgress !== null}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" />
        <Button type="submit" disabled={(!body.trim() && attachments.length === 0) || send.isPending || uploadProgress !== null}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </>
  );
}

function AttachmentLink({ attachment, mine }: { attachment: PendingAttachment; mine: boolean }) {
  const getUrlFn = useServerFn(getAttachmentUrl);
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const { url } = await getUrlFn({ data: { path: attachment.path } });
      window.open(url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to open");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={loading}
      className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition ${mine ? "border-primary-foreground/30 hover:bg-primary-foreground/10" : "border-border hover:bg-card"}`}
    >
      <FileText className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 truncate">{attachment.name}</span>
      <span className="opacity-70">{Math.round(attachment.size / 1024)}KB</span>
      <Download className="h-3 w-3 opacity-70" />
    </button>
  );
}
