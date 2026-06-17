import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const kinds = [
  "profile_view",
  "portfolio_view",
  "contact_request",
  "hire_request",
  "job_application",
] as const;

export const recordEvent = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        subjectId: z.string().uuid(),
        kind: z.enum(kinds),
        meta: z.record(z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("analytics_events").insert({
      subject_id: data.subjectId,
      kind: data.kind,
      meta: data.meta ?? {},
    });
    return { ok: true };
  });

export const getMyAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const me = context.userId;
    const since30 = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
    const since60 = new Date(Date.now() - 60 * 24 * 3600_000).toISOString();
    const since7 = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
    const since14 = new Date(Date.now() - 14 * 24 * 3600_000).toISOString();

    // Events directed at me
    const { data: events, error } = await context.supabase
      .from("analytics_events")
      .select("kind, created_at")
      .eq("subject_id", me)
      .gte("created_at", since60);
    if (error) throw new Error(error.message);

    // Applications submitted by me (creator side)
    const { data: myApps } = await context.supabase
      .from("job_applications")
      .select("created_at")
      .eq("creator_id", me)
      .gte("created_at", since60);

    const all: { kind: string; created_at: string }[] = [
      ...(events ?? []).map((e: any) => ({ kind: e.kind, created_at: e.created_at })),
      ...(myApps ?? []).map((a: any) => ({ kind: "job_application", created_at: a.created_at })),
    ];

    const countIn = (kind: string, since: string) =>
      all.filter((e) => e.kind === kind && e.created_at >= since).length;

    const inRange = (kind: string, gte: string, lt?: string) =>
      all.filter((e) => e.kind === kind && e.created_at >= gte && (!lt || e.created_at < lt)).length;

    const totals = {
      profile_view: countIn("profile_view", since30),
      portfolio_view: countIn("portfolio_view", since30),
      contact_request: countIn("contact_request", since30),
      hire_request: countIn("hire_request", since30),
      job_application: countIn("job_application", since30),
    };

    const weekly = {
      this: kinds.reduce<Record<string, number>>((acc, k) => ((acc[k] = countIn(k, since7)), acc), {}),
      prev: kinds.reduce<Record<string, number>>(
        (acc, k) => ((acc[k] = inRange(k, since14, since7)), acc),
        {},
      ),
    };
    const monthly = {
      this: kinds.reduce<Record<string, number>>((acc, k) => ((acc[k] = countIn(k, since30)), acc), {}),
      prev: kinds.reduce<Record<string, number>>(
        (acc, k) => ((acc[k] = inRange(k, since60, since30)), acc),
        {},
      ),
    };

    // Daily series for last 30 days
    const series: { date: string; profile_view: number; portfolio_view: number; contact_request: number; hire_request: number; job_application: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      const start = d.toISOString();
      const end = new Date(d.getTime() + 24 * 3600_000).toISOString();
      const point: any = { date: start.slice(5, 10) };
      for (const k of kinds) point[k] = inRange(k, start, end);
      series.push(point);
    }

    return { totals, weekly, monthly, series };
  });
