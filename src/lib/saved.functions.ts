import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// -------- Saved creators (heart) --------
// saved_creators schema: (client_id uuid, creator_id uuid) — creator_id = creators.id

export const toggleSavedCreator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ creatorId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("saved_creators")
      .select("client_id")
      .eq("client_id", context.userId)
      .eq("creator_id", data.creatorId)
      .maybeSingle();
    if (existing) {
      const { error } = await context.supabase
        .from("saved_creators")
        .delete()
        .eq("client_id", context.userId)
        .eq("creator_id", data.creatorId);
      if (error) throw new Error(error.message);
      return { saved: false };
    }
    const { error } = await context.supabase
      .from("saved_creators")
      .insert({ client_id: context.userId, creator_id: data.creatorId });
    if (error) throw new Error(error.message);
    return { saved: true };
  });

export const listSavedCreators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("saved_creators")
      .select("creator_id, created_at")
      .eq("client_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r: any) => r.creator_id);
    if (!ids.length) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: creators } = await supabaseAdmin
      .from("creators")
      .select("id, user_id, headline, availability, is_verified, creator_categories(category:categories(id, slug, name))")
      .in("id", ids);
    const userIds = (creators ?? []).map((c: any) => c.user_id);
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, avatar_url, location")
      .in("id", userIds);
    const pmap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    return (creators ?? []).map((c: any) => ({ ...c, profile: pmap[c.user_id] ?? null }));
  });

export const savedCreatorIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_creators")
      .select("creator_id")
      .eq("client_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => r.creator_id as string);
  });

// -------- Saved jobs (bookmark) --------

export const toggleSavedJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("saved_jobs")
      .select("user_id")
      .eq("user_id", context.userId)
      .eq("job_id", data.jobId)
      .maybeSingle();
    if (existing) {
      const { error } = await context.supabase
        .from("saved_jobs")
        .delete()
        .eq("user_id", context.userId)
        .eq("job_id", data.jobId);
      if (error) throw new Error(error.message);
      return { saved: false };
    }
    const { error } = await context.supabase
      .from("saved_jobs")
      .insert({ user_id: context.userId, job_id: data.jobId });
    if (error) throw new Error(error.message);
    return { saved: true };
  });

export const savedJobIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_jobs")
      .select("job_id")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => r.job_id as string);
  });

export const listSavedJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("saved_jobs")
      .select("job_id, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r: any) => r.job_id);
    if (!ids.length) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: jobs } = await supabaseAdmin
      .from("jobs")
      .select(
        "id, title, description, budget_min, budget_max, currency, remote_ok, location, deadline, status, created_at, category:categories(id, slug, name)",
      )
      .in("id", ids);
    const byId = Object.fromEntries((jobs ?? []).map((j: any) => [j.id, j]));
    return (rows ?? []).map((r: any) => ({ saved_at: r.created_at, job: byId[r.job_id] ?? null })).filter((x) => x.job);
  });
