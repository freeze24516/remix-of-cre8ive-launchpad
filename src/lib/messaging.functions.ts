import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = context.userId;
    const { data, error } = await context.supabase
      .from("conversations")
      .select("id, user_a, user_b, last_message_at")
      .or(`user_a.eq.${me},user_b.eq.${me}`)
      .order("last_message_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const otherIds = Array.from(new Set(rows.map((c: any) => (c.user_a === me ? c.user_b : c.user_a))));
    let byId: Record<string, any> = {};
    if (otherIds.length) {
      const { data: ps } = await context.supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", otherIds);
      byId = Object.fromEntries((ps ?? []).map((p: any) => [p.id, p]));
    }
    return rows.map((c: any) => {
      const otherId = c.user_a === me ? c.user_b : c.user_a;
      return { id: c.id, last_message_at: c.last_message_at, other: byId[otherId] ?? null };
    });
  });

export const startConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ otherUserId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: cid, error } = await context.supabase.rpc("get_or_create_conversation", { _other: data.otherUserId });
    if (error) throw new Error(error.message);
    return { id: cid as string };
  });

export const getMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: msgs, error } = await context.supabase
      .from("messages")
      .select("id, sender_id, body, attachments, created_at, read_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    await context.supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversationId)
      .neq("sender_id", context.userId)
      .is("read_at", null);
    return msgs ?? [];
  });

const attachmentSchema = z.object({
  path: z.string().min(1).max(500),
  name: z.string().min(1).max(200),
  size: z.number().int().min(0).max(26214400),
  mime: z.string().min(1).max(120),
});

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        conversationId: z.string().uuid(),
        body: z.string().max(4000).default(""),
        attachments: z.array(attachmentSchema).max(8).default([]),
      })
      .refine((v) => v.body.trim().length > 0 || v.attachments.length > 0, {
        message: "Message or attachment required",
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("messages")
      .insert({
        conversation_id: data.conversationId,
        sender_id: context.userId,
        body: data.body,
        attachments: data.attachments as any,
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    if (data.ids && data.ids.length) q = q.in("id", data.ids);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });