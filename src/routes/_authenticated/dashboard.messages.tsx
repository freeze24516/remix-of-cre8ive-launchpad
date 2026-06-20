import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send, Paperclip, X, FileText, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  listConversations,
  getMessages,
  sendMessage,
  searchMessages,
  markConversationRead,
} from "@/lib/messaging.functions";
import { getAttachmentUrl } from "@/lib/attachments.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { VoiceRecorder } from "@/components/messaging/VoiceRecorder";
import { VoicePlayer } from "@/components/messaging/VoicePlayer";
import { ReadReceipt } from "@/components/messaging/ReadReceipt";

type S = { c?: string };

export const Route = createFileRoute("/_authenticated/dashboard/messages")({
  validateSearch: (s: Record<string, unknown>): S => ({ c: typeof s.c === "string" ? s.c : undefined }),
  component: Messages,
});

const ACCEPT = ".pdf,.zip,.jpg,.jpeg,.png,.mp4,.docx,.webm,.mp3,.m4a,.wav";
const MAX_SIZE = 25 * 1024 * 1024;

type PendingAttachment = { path: string; name: string; size: number; mime: string; kind?: "voice" | "file" };

function Messages() {
  const { c: selected } = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: convs } = useSuspenseQuery({ queryKey: ["conversations"], queryFn: () => listConversations() });
  const [globalSearch, setGlobalSearch] = useState("");
  const searchFn = useServerFn(searchMessages);
  const { data: searchHits } = useQuery({
    queryKey: ["msg-search", globalSearch],
    queryFn: () => searchFn({ data: { query: globalSearch } }),
    enabled: globalSearch.trim().length >= 2,
  });

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

  const filteredConvs = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return convs;
    return convs.filter((c: any) =>
      (c.other?.display_name ?? "").toLowerCase().includes(q) ||
      (c.other?.username ?? "").toLowerCase().includes(q),
    );
  }, [convs, globalSearch]);

  return (
    <div className="grid h-[calc(100vh-180px)] gap-4 md:grid-cols-[320px,1fr]">
      <aside className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Search people or messages…"
              className="h-9 pl-7 text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {globalSearch.trim().length >= 2 && searchHits && searchHits.length > 0 && (
            <div className="mb-2">
              <div className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Message results
              </div>
              {searchHits.map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => { navigate({ search: { c: m.conversation_id } }); setGlobalSearch(""); }}
                  className="flex w-full flex-col gap-0.5 rounded-lg p-2 text-left hover:bg-secondary/50"
                >
                  <div className="line-clamp-2 text-xs">{m.body || "(attachment)"}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
                </button>
              ))}
              <div className="my-2 border-t border-border" />
            </div>
          )}
          {filteredConvs.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessageSquare className="mx-auto h-6 w-6" />
              <p className="mt-2">No conversations yet.</p>
            </div>
          ) : (
            filteredConvs.map((c: any) => (
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
        </div>
      </aside>
      <main className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        {selected ? (
          <Thread
            key={selected}
            conversationId={selected}
            meId={user?.id ?? ""}
            other={convs.find((c: any) => c.id === selected)?.other ?? null}
          />
        ) : (
          <div className="m-auto text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto h-8 w-8" />
            <p className="mt-2">Select a conversation</p>
          </div>
        )}
      </main>
    </div>
  );
}

function Thread({
  conversationId,
  meId,
  other,
}: {
  conversationId: string;
  meId: string;
  other: { display_name?: string; avatar_url?: string | null } | null;
}) {
  const { data: msgs } = useQuery({ queryKey: ["messages", conversationId], queryFn: () => getMessages({ data: { conversationId } }) });
  const qc = useQueryClient();
  const sendFn = useServerFn(sendMessage);
  const markReadFn = useServerFn(markConversationRead);
  const searchFn = useServerFn(searchMessages);
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Realtime: presence/broadcast for typing + window focus mark-read
  useEffect(() => {
    const channel = supabase.channel(`thread:${conversationId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on("broadcast", { event: "typing" }, (payload) => {
      if (payload.payload?.userId && payload.payload.userId !== meId) {
        setOtherTyping(true);
        if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => setOtherTyping(false), 3000);
      }
    });
    channel.on("broadcast", { event: "stop-typing" }, () => setOtherTyping(false));
    channel.subscribe();
    channelRef.current = channel;
    return () => {
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [conversationId, meId]);

  // Mark read when thread opens / focuses
  useEffect(() => {
    markReadFn({ data: { conversationId } }).catch(() => {});
    const onFocus = () => {
      markReadFn({ data: { conversationId } }).catch(() => {});
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [conversationId, markReadFn, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, otherTyping]);

  function emitTyping() {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    channelRef.current?.send({ type: "broadcast", event: "typing", payload: { userId: meId } });
  }
  function emitStopTyping() {
    channelRef.current?.send({ type: "broadcast", event: "stop-typing", payload: { userId: meId } });
  }

  async function uploadFile(file: File, opts?: { kind?: "voice" | "file" }) {
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

      setAttachments((a) => [
        ...a,
        {
          path,
          name: file.name,
          size: file.size,
          mime: file.type || "application/octet-stream",
          kind: opts?.kind ?? "file",
        },
      ]);
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
      emitStopTyping();
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  async function handleVoiceRecorded(file: File, durationMs: number) {
    await uploadFile(file, { kind: "voice" });
    // auto-send voice messages
    setTimeout(() => {
      if (attachments.length === 0) {
        // attachments state hasn't updated yet, so submit on next tick via local logic
      }
      send.mutate();
    }, 0);
    void durationMs;
  }

  const { data: searchResults } = useQuery({
    queryKey: ["thread-search", conversationId, search],
    queryFn: () => searchFn({ data: { conversationId, query: search } }),
    enabled: showSearch && search.trim().length >= 2,
  });

  const highlightIds = new Set((searchResults ?? []).map((m: any) => m.id));

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-muted">
            {other?.avatar_url && <img src={other.avatar_url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{other?.display_name ?? "Conversation"}</div>
            <div className="h-3 text-[11px] text-muted-foreground">
              {otherTyping ? "typing…" : ""}
            </div>
          </div>
        </div>
        <Button type="button" size="icon" variant="ghost" onClick={() => setShowSearch((v) => !v)} title="Search in conversation">
          <Search className="h-4 w-4" />
        </Button>
      </div>
      {showSearch && (
        <div className="border-b border-border p-2">
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in this conversation…"
            className="h-8 text-sm"
          />
          {search.trim().length >= 2 && (
            <div className="mt-1 text-[11px] text-muted-foreground">
              {searchResults?.length ?? 0} match{(searchResults?.length ?? 0) === 1 ? "" : "es"}
            </div>
          )}
        </div>
      )}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {(msgs ?? []).map((m: any) => {
          const mine = m.sender_id === meId;
          const isHit = highlightIds.has(m.id);
          return (
            <div key={m.id} id={`msg-${m.id}`} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-[image:var(--gradient-primary)] text-primary-foreground" : "bg-secondary"} ${isHit ? "ring-2 ring-accent" : ""}`}>
                {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {m.attachments.map((a: PendingAttachment) =>
                      a.kind === "voice" || /^audio\//.test(a.mime) ? (
                        <VoicePlayer key={a.path} path={a.path} name={a.name} mine={mine} />
                      ) : (
                        <AttachmentLink key={a.path} attachment={a} mine={mine} />
                      ),
                    )}
                  </div>
                )}
                <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {mine && <ReadReceipt deliveredAt={m.delivered_at} readAt={m.read_at} />}
                </div>
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
              </span>
            </div>
          </div>
        )}
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
        className="flex flex-wrap items-center gap-2 border-t border-border p-3"
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
        <VoiceRecorder onRecorded={handleVoiceRecorded} disabled={uploadProgress !== null} />
        <Input
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            if (e.target.value) emitTyping();
          }}
          onBlur={emitStopTyping}
          placeholder="Write a message…"
          className="flex-1 min-w-[160px]"
        />
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
