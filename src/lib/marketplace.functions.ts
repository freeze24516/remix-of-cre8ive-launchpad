import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BUDGET_TIERS = ["5k-10k", "10k-25k", "25k-50k", "50k+"] as const;
const LOCATION_SCOPES = ["remote", "india", "global"] as const;
const EXPERIENCE = ["entry", "intermediate", "expert"] as const;
const AVAILABILITY = ["available", "limited", "booked", "vacation"] as const;
const SORTS = ["featured", "rating", "hires", "recent", "newest"] as const;

const browseSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  availability: z.enum(AVAILABILITY).optional(),
  experience: z.enum(EXPERIENCE).optional(),
  budget: z.enum(BUDGET_TIERS).optional(),
  location: z.enum(LOCATION_SCOPES).optional(),
  tool: z.string().optional(),
  sort: z.enum(SORTS).optional(),
  page: z.number().int().min(1).default(1),
});

export const browseCreators = createServerFn({ method: "GET" })
  .inputValidator((data) => browseSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pageSize = 24;
    const from = (data.page - 1) * pageSize;
    let query = supabaseAdmin
      .from("creators")
      .select(
        "id, user_id, headline, about, availability, experience, is_verified, verification_level, is_featured, view_count, hire_count, last_active_at, budget_tier, location_scope, tools, created_at, creator_categories(category:categories(id, slug, name))",
        { count: "exact" },
      )
      .eq("is_approved", true);

    if (data.availability) query = query.eq("availability", data.availability);
    if (data.experience) query = query.eq("experience", data.experience);
    if (data.budget) query = query.eq("budget_tier", data.budget);
    if (data.location) query = query.eq("location_scope", data.location);
    if (data.tool) query = query.contains("tools", [data.tool]);
    if (data.q) query = query.or(`headline.ilike.%${data.q}%,about.ilike.%${data.q}%`);

    const sort = data.sort ?? "featured";
    if (sort === "featured") {
      query = query.order("is_featured", { ascending: false }).order("verification_level", { ascending: false }).order("view_count", { ascending: false });
    } else if (sort === "rating") {
      query = query.order("verification_level", { ascending: false }).order("view_count", { ascending: false });
    } else if (sort === "hires") {
      query = query.order("hire_count", { ascending: false });
    } else if (sort === "recent") {
      query = query.order("last_active_at", { ascending: false });
    } else if (sort === "newest") {
      query = query.order("created_at", { ascending: false });
    }

    query = query.range(from, from + pageSize - 1);

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);

    let filtered = rows ?? [];
    const ids = filtered.map((r: any) => r.user_id);
    let profilesMap = new Map<string, any>();
    if (ids.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, avatar_url, location")
        .in("id", ids);
      profilesMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    }
    filtered = filtered.map((r: any) => ({ ...r, profile: profilesMap.get(r.user_id) ?? null }));
    if (data.category) {
      filtered = filtered.filter((c: any) =>
        c.creator_categories?.some((cc: any) => cc.category?.slug === data.category),
      );
    }
    filtered = filtered.filter((c: any) => c.profile);
    return { creators: filtered, total: count ?? 0, page: data.page, pageSize };
  });

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, slug, name, icon")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getCreatorByUsername = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ username: z.string().min(1).max(40) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio, location, languages, kind")
      .eq("username", data.username)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile) return null;

    const { data: creator } = await supabaseAdmin
      .from("creators")
      .select(
        "id, headline, about, experience, availability, response_hours, is_verified, verification_level, is_featured, is_spotlight, budget_tier, location_scope, tools, hire_count, last_active_at, vacation_from, vacation_to, view_count, creator_categories(category:categories(id, slug, name)), creator_skills(skill)",
      )
      .eq("user_id", profile.id)
      .eq("is_approved", true)
      .maybeSingle();

    let portfolios: any[] = [];
    let unavailableDates: string[] = [];
    if (creator) {
      const { data: items } = await supabaseAdmin
        .from("portfolios")
        .select("id, title, description, cover_image, project_url, software, category_id, view_count, created_at")
        .eq("creator_id", creator.id)
        .eq("is_approved", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      portfolios = items ?? [];
      const today = new Date().toISOString().slice(0, 10);
      const { data: blocked } = await supabaseAdmin
        .from("creator_unavailable_dates")
        .select("date")
        .eq("creator_id", creator.id)
        .gte("date", today)
        .order("date");
      unavailableDates = (blocked ?? []).map((b: any) => b.date);
      await supabaseAdmin
        .from("creators")
        .update({ view_count: (creator.view_count ?? 0) + 1 })
        .eq("id", creator.id);
    }
    return { profile, creator, portfolios, unavailableDates };
  });

export const getFeaturedCreators = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ limit: z.number().int().min(1).max(24).default(6) }).parse(d ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("creators")
      .select("id, user_id, headline, availability, verification_level, is_featured, view_count, hire_count, creator_categories(category:categories(id, slug, name))")
      .eq("is_approved", true)
      .eq("is_featured", true)
      .order("verification_level", { ascending: false })
      .order("view_count", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.user_id);
    if (ids.length === 0) return [];
    const { data: profs } = await supabaseAdmin
      .from("profiles").select("id, username, display_name, avatar_url, location").in("id", ids);
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    return (rows ?? []).map((r: any) => ({ ...r, profile: map.get(r.user_id) ?? null })).filter((r: any) => r.profile);
  });

export const getSpotlightCreator = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date().toISOString();
  let { data: rows } = await supabaseAdmin
    .from("creators")
    .select("id, user_id, headline, about, availability, verification_level, hire_count, view_count, creator_categories(category:categories(id, slug, name))")
    .eq("is_approved", true)
    .eq("is_spotlight", true)
    .or(`spotlight_until.is.null,spotlight_until.gt.${now}`)
    .order("view_count", { ascending: false })
    .limit(1);
  if (!rows || rows.length === 0) {
    const { data: fb } = await supabaseAdmin
      .from("creators")
      .select("id, user_id, headline, about, availability, verification_level, hire_count, view_count, creator_categories(category:categories(id, slug, name))")
      .eq("is_approved", true)
      .eq("is_featured", true)
      .order("view_count", { ascending: false })
      .limit(1);
    rows = fb ?? [];
  }
  const c = rows?.[0];
  if (!c) return null;
  const [{ data: profile }, { data: portfolios }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, username, display_name, avatar_url, location").eq("id", c.user_id).maybeSingle(),
    supabaseAdmin.from("portfolios").select("id, title, cover_image, project_url").eq("creator_id", c.id).eq("is_approved", true).order("is_featured", { ascending: false }).limit(3),
  ]);
  if (!profile) return null;
  return { ...c, profile, portfolios: portfolios ?? [] };
});

export const getMarketplaceStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [creators, jobs, hires, cats] = await Promise.all([
    supabaseAdmin.from("creators").select("id", { count: "exact", head: true }).eq("is_approved", true),
    supabaseAdmin.from("jobs").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("job_applications").select("id", { count: "exact", head: true }).eq("status", "accepted"),
    supabaseAdmin.from("categories").select("id", { count: "exact", head: true }),
  ]);
  return {
    creators: creators.count ?? 0,
    projects: jobs.count ?? 0,
    hires: hires.count ?? 0,
    categories: cats.count ?? 0,
  };
});

/* ------- Availability management (creator) ------- */
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const setVacation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ from: z.string().nullable(), to: z.string().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const update: any = { vacation_from: data.from, vacation_to: data.to };
    if (data.from && data.to) update.availability = "vacation";
    const { error } = await context.supabase.from("creators").update(update).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleUnavailableDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ date: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: cr, error: cErr } = await context.supabase
      .from("creators").select("id").eq("user_id", context.userId).maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cr) throw new Error("No creator profile");
    const { data: existing } = await context.supabase
      .from("creator_unavailable_dates").select("id").eq("creator_id", cr.id).eq("date", data.date).maybeSingle();
    if (existing) {
      await context.supabase.from("creator_unavailable_dates").delete().eq("id", existing.id);
      return { blocked: false };
    }
    await context.supabase.from("creator_unavailable_dates").insert({ creator_id: cr.id, date: data.date });
    return { blocked: true };
  });

export const getMyAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: cr } = await context.supabase
      .from("creators")
      .select("id, availability, vacation_from, vacation_to")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!cr) return { creator: null, dates: [] as string[] };
    const today = new Date().toISOString().slice(0, 10);
    const { data: dates } = await context.supabase
      .from("creator_unavailable_dates")
      .select("date")
      .eq("creator_id", cr.id)
      .gte("date", today)
      .order("date");
    return { creator: cr, dates: (dates ?? []).map((d: any) => d.date) };
  });

/* ------- Admin: featured / verification level / spotlight ------- */

async function assertStaff(ctx: any) {
  const [{ data: isAdmin }, { data: isMod }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "moderator" }),
  ]);
  if (!isAdmin && !isMod) throw new Error("Forbidden");
}

export const setCreatorFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ creatorId: z.string().uuid(), featured: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("creators").update({ is_featured: data.featured }).eq("id", data.creatorId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCreatorVerificationLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ creatorId: z.string().uuid(), level: z.number().int().min(0).max(3) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("creators")
      .update({ verification_level: data.level, is_verified: data.level > 0, verification_requested_at: null })
      .eq("id", data.creatorId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCreatorSpotlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ creatorId: z.string().uuid(), spotlight: z.boolean(), untilDays: z.number().int().min(1).max(60).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.spotlight) {
      await supabaseAdmin.from("creators").update({ is_spotlight: false }).eq("is_spotlight", true);
    }
    const until = data.spotlight && data.untilDays
      ? new Date(Date.now() + data.untilDays * 86400 * 1000).toISOString() : null;
    const { error } = await supabaseAdmin
      .from("creators")
      .update({ is_spotlight: data.spotlight, spotlight_until: until })
      .eq("id", data.creatorId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCreatorMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      budget_tier: z.enum(BUDGET_TIERS).nullable().optional(),
      location_scope: z.enum(LOCATION_SCOPES).nullable().optional(),
      tools: z.array(z.string()).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const update: any = { last_active_at: new Date().toISOString() };
    if ("budget_tier" in data) update.budget_tier = data.budget_tier ?? null;
    if ("location_scope" in data) update.location_scope = data.location_scope ?? null;
    if ("tools" in data) update.tools = data.tools ?? [];
    const { error } = await context.supabase.from("creators").update(update).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
