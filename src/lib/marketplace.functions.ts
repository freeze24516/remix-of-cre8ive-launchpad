import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const browseSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  availability: z.enum(["available", "limited", "booked", "vacation"]).optional(),
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
        "id, headline, about, availability, is_verified, is_featured, view_count, profile:profiles!creators_user_id_fkey(id, username, display_name, avatar_url, location), creator_categories(category:categories(id, slug, name))",
        { count: "exact" },
      )
      .eq("is_approved", true)
      .order("is_featured", { ascending: false })
      .order("view_count", { ascending: false })
      .range(from, from + pageSize - 1);

    if (data.availability) query = query.eq("availability", data.availability);
    if (data.q) query = query.or(`headline.ilike.%${data.q}%,about.ilike.%${data.q}%`);

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);

    let filtered = rows ?? [];
    if (data.category) {
      filtered = filtered.filter((c: any) =>
        c.creator_categories?.some((cc: any) => cc.category?.slug === data.category),
      );
    }
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
        "id, headline, about, experience, availability, response_hours, is_verified, is_featured, view_count, creator_categories(category:categories(id, slug, name)), creator_skills(skill)",
      )
      .eq("user_id", profile.id)
      .eq("is_approved", true)
      .maybeSingle();

    let portfolios: any[] = [];
    if (creator) {
      const { data: items } = await supabaseAdmin
        .from("portfolios")
        .select("id, title, description, cover_image, project_url, software, category_id, view_count, created_at")
        .eq("creator_id", creator.id)
        .eq("is_approved", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      portfolios = items ?? [];
      await supabaseAdmin
        .from("creators")
        .update({ view_count: (creator.view_count ?? 0) + 1 })
        .eq("id", creator.id);
    }
    return { profile, creator, portfolios };
  });