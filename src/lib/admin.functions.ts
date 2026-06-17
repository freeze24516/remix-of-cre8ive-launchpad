import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertStaff(ctx: any) {
  const [{ data: isAdmin }, { data: isMod }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "moderator" }),
  ]);
  if (!isAdmin && !isMod) throw new Error("Forbidden");
  return { isAdmin: !!isAdmin, isMod: !!isMod };
}

export const getMyStaffRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: isAdmin }, { data: isMod }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "moderator" }),
    ]);
    return { isAdmin: !!isAdmin, isModerator: !!isMod };
  });

/* -------- Reports (any authenticated user can submit) -------- */

const REPORT_TARGETS = ["creator", "client", "job", "portfolio", "message"] as const;

export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        target_type: z.enum(REPORT_TARGETS),
        target_id: z.string().uuid(),
        reason: z.string().min(3).max(120),
        details: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reports").insert({
      target_type: data.target_type,
      target_id: data.target_id,
      reason: data.reason,
      details: data.details ?? null,
      reporter_id: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ status: z.enum(["open", "reviewing", "resolved", "dismissed", "all"]).default("open") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("reports")
      .select("id, target_type, target_id, reason, details, status, created_at, reporter_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r) => r.reporter_id)));
    const { data: ps } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, username, display_name").in("id", ids)
      : { data: [] as any[] };
    const byId = Object.fromEntries((ps ?? []).map((p: any) => [p.id, p]));
    return (rows ?? []).map((r: any) => ({ ...r, reporter: byId[r.reporter_id] ?? null }));
  });

export const updateReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "reviewing", "resolved", "dismissed"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("reports").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------- Verification -------- */

export const requestVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("creators")
      .update({ verification_requested_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listVerificationRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("creators")
      .select(
        "id, user_id, headline, is_verified, verification_requested_at",
      )
      .not("verification_requested_at", "is", null)
      .eq("is_verified", false)
      .order("verification_requested_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.user_id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", ids);
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return rows.map((r) => ({ ...r, profile: map.get(r.user_id) ?? null }));
  });

export const setCreatorVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ creatorId: z.string().uuid(), verified: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("creators")
      .update({
        is_verified: data.verified,
        verification_requested_at: data.verified ? null : null,
      })
      .eq("id", data.creatorId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------- Content moderation -------- */

export const listPendingPortfolios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("portfolios")
      .select(
        "id, title, description, cover_image, project_url, created_at, creator:creators(id, user_id, profile:profiles!creators_user_id_profiles_fkey(username, display_name))",
      )
      .eq("is_approved", false)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setPortfolioApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), approved: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("portfolios")
      .update({ is_approved: data.approved })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPortfolioFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), featured: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("portfolios").update({ is_featured: data.featured }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------- Users -------- */

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ q: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, avatar_url, kind, is_suspended, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.q) q = q.or(`username.ilike.%${data.q}%,display_name.ilike.%${data.q}%`);
    const { data: profiles, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (profiles ?? []).map((p) => p.id);
    const { data: roleRows } = ids.length
      ? await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] as any[] };
    const rolesById: Record<string, string[]> = {};
    (roleRows ?? []).forEach((r: any) => {
      (rolesById[r.user_id] ??= []).push(r.role);
    });
    return (profiles ?? []).map((p: any) => ({ ...p, roles: rolesById[p.id] ?? [] }));
  });

export const setUserSuspension = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), suspended: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { isAdmin } = await assertStaff(context);
    if (!isAdmin) throw new Error("Admin only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ is_suspended: data.suspended }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["admin", "moderator", "user"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { isAdmin } = await assertStaff(context);
    if (!isAdmin) throw new Error("Admin only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["admin", "moderator", "user"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { isAdmin } = await assertStaff(context);
    if (!isAdmin) throw new Error("Admin only");
    if (data.userId === context.userId && data.role === "admin") {
      throw new Error("You can't revoke your own admin role");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------- Admin overview stats -------- */

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [users, creators, jobs, openReports, pendingVerif, pendingPort] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("creators").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabaseAdmin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabaseAdmin
        .from("creators")
        .select("id", { count: "exact", head: true })
        .not("verification_requested_at", "is", null)
        .eq("is_verified", false),
      supabaseAdmin.from("portfolios").select("id", { count: "exact", head: true }).eq("is_approved", false),
    ]);
    return {
      users: users.count ?? 0,
      creators: creators.count ?? 0,
      openJobs: jobs.count ?? 0,
      openReports: openReports.count ?? 0,
      pendingVerifications: pendingVerif.count ?? 0,
      pendingPortfolios: pendingPort.count ?? 0,
    };
  });