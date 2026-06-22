import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ------------- Public: plan catalog ------------- */

export const listSubscriptionPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

/* ------------- Membership: my plan ------------- */

export const getMyMembership = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: pe } = await context.supabase
      .from("profiles")
      .select("subscription_plan, plan_expiry, commission_rate")
      .eq("id", context.userId)
      .maybeSingle();
    if (pe) throw new Error(pe.message);

    const { data: subs } = await context.supabase
      .from("user_subscriptions")
      .select("id, tier, status, started_at, expires_at, billing_cycle, amount_cents, provider")
      .eq("user_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(10);

    const { data: creator } = await context.supabase
      .from("creators")
      .select("id, is_featured, featured_until, boosted_creator, boost_expiry, sponsored_until")
      .eq("user_id", context.userId)
      .maybeSingle();

    return {
      plan: (profile?.subscription_plan ?? "free") as "free" | "pro" | "elite",
      plan_expiry: profile?.plan_expiry ?? null,
      commission_rate: profile?.commission_rate ?? 10,
      history: subs ?? [],
      creator: creator ?? null,
    };
  });

/* ------------- Admin: revenue analytics ------------- */

async function assertAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Admin only");
}

export const getRevenueOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ days: z.number().int().min(7).max(365).default(30) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.days * 86400_000).toISOString();

    const [{ data: events }, { count: activeSubs }, { count: featuredActive }, { count: sponsoredActive }, { count: boostActive }] =
      await Promise.all([
        supabaseAdmin
          .from("billing_events")
          .select("kind, amount_cents, status, occurred_at")
          .gte("occurred_at", since)
          .order("occurred_at", { ascending: false })
          .limit(2000),
        supabaseAdmin.from("user_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabaseAdmin
          .from("creators")
          .select("id", { count: "exact", head: true })
          .gt("featured_until", new Date().toISOString()),
        supabaseAdmin
          .from("creators")
          .select("id", { count: "exact", head: true })
          .gt("sponsored_until", new Date().toISOString()),
        supabaseAdmin
          .from("creators")
          .select("id", { count: "exact", head: true })
          .eq("boosted_creator", true)
          .gt("boost_expiry", new Date().toISOString()),
      ]);

    const rows = events ?? [];
    const byKind: Record<string, { count: number; gross_cents: number; paid_cents: number }> = {};
    let grossCents = 0;
    let paidCents = 0;
    for (const r of rows) {
      const k = (r as any).kind as string;
      byKind[k] ??= { count: 0, gross_cents: 0, paid_cents: 0 };
      byKind[k].count += 1;
      byKind[k].gross_cents += (r as any).amount_cents ?? 0;
      grossCents += (r as any).amount_cents ?? 0;
      if ((r as any).status === "paid") {
        byKind[k].paid_cents += (r as any).amount_cents ?? 0;
        paidCents += (r as any).amount_cents ?? 0;
      }
    }
    // daily series
    const dayMap: Record<string, number> = {};
    for (const r of rows) {
      const d = ((r as any).occurred_at as string).slice(0, 10);
      dayMap[d] = (dayMap[d] ?? 0) + ((r as any).amount_cents ?? 0);
    }
    const series = Object.entries(dayMap)
      .map(([day, cents]) => ({ day, cents }))
      .sort((a, b) => a.day.localeCompare(b.day));

    return {
      windowDays: data.days,
      grossCents,
      paidCents,
      eventCount: rows.length,
      byKind,
      series,
      activeSubscriptions: activeSubs ?? 0,
      featuredActive: featuredActive ?? 0,
      sponsoredActive: sponsoredActive ?? 0,
      boostActive: boostActive ?? 0,
    };
  });

/* ------------- Admin: manual boost / featured / sponsored ------------- */

export const setCreatorBoost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        creatorId: z.string().uuid(),
        kind: z.enum(["featured", "boost", "sponsored"]),
        days: z.number().int().min(0).max(365),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const until = data.days === 0 ? null : new Date(Date.now() + data.days * 86400_000).toISOString();
    const patch =
      data.kind === "featured"
        ? { featured_until: until, is_featured: !!until }
        : data.kind === "boost"
          ? { boost_expiry: until, boosted_creator: !!until }
          : { sponsored_until: until };
    const { error } = await supabaseAdmin.from("creators").update(patch as never).eq("id", data.creatorId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
