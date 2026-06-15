import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { listConversations, getMessages, sendMessage } from "@/lib/messaging.functions";
import { useAuth } from "@/hooks/use-auth";

type S = { c?: string };

export const Route = createFileRoute("/_authenticated/dashboard/messages")({
  validateSearch: (s: Record<string, unknown>): S => ({ c: typeof s.c === "string" ? s.c : undefined }),
  component: Messages,
});

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = useMutation({
    mutationFn: () => sendFn({ data: { conversationId, body } }),
    onSuccess: () => { setBody(""); qc.invalidateQueries({ queryKey: ["messages", conversationId] }); qc.invalidateQueries({ queryKey: ["conversations"] }); },
  });

  return (
    <>
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
        {(msgs ?? []).map((m: any) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-[image:var(--gradient-primary)] text-primary-foreground" : "bg-secondary"}`}>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{new Date(m.created_at).toLocaleTimeString()}</div>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (body.trim()) send.mutate(); }} className="flex gap-2 border-t border-border p-3">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" />
        <Button type="submit" disabled={!body.trim() || send.isPending}><Send className="h-4 w-4" /></Button>
      </form>
    </>
  );
}