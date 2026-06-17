import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listReviewsFor = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("reviews")
      .select("id, reviewer_id, reviewee_id, job_id, rating, body, direction, created_at")
      .eq("reviewee_id", data.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const reviewerIds = Array.from(new Set((rows ?? []).map((r: any) => r.reviewer_id)));
    let byId: Record<string, any> = {};
    if (reviewerIds.length) {
      const { data: ps } = await supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", reviewerIds);
      byId = Object.fromEntries((ps ?? []).map((p: any) => [p.id, p]));
    }
    const reviews = (rows ?? []).map((r: any) => ({ ...r, reviewer: byId[r.reviewer_id] ?? null }));

    const ratings = reviews.map((r) => r.rating);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    // completed projects = accepted applications involving this user (as creator or client)
    const { count: completedAsCreator } = await supabaseAdmin
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", data.userId)
      .eq("status", "accepted");
    const { data: clientJobs } = await supabaseAdmin
      .from("jobs")
      .select("id")
      .eq("client_id", data.userId);
    let completedAsClient = 0;
    if (clientJobs && clientJobs.length) {
      const ids = clientJobs.map((j: any) => j.id);
      const { count } = await supabaseAdmin
        .from("job_applications")
        .select("id", { count: "exact", head: true })
        .in("job_id", ids)
        .eq("status", "accepted");
      completedAsClient = count ?? 0;
    }
    const completedProjects = (completedAsCreator ?? 0) + completedAsClient;

    return {
      reviews,
      summary: {
        average: Math.round(avg * 10) / 10,
        count: reviews.length,
        completedProjects,
      },
    };
  });

const createSchema = z.object({
  revieweeId: z.string().uuid(),
  jobId: z.string().uuid().nullable().optional(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional().nullable(),
  direction: z.enum(["client_to_creator", "creator_to_client"]),
});

export const createReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    if (data.revieweeId === context.userId) throw new Error("You cannot review yourself.");

    // Eligibility: an accepted application must exist between the two parties
    // (either party may have been the creator or the client).
    let eligible = false;
    if (data.jobId) {
      const { data: app } = await context.supabase
        .from("job_applications")
        .select("id, creator_id, status, job:jobs(client_id)")
        .eq("job_id", data.jobId)
        .eq("status", "accepted")
        .maybeSingle();
      if (app) {
        const clientId = (app as any).job?.client_id;
        const creatorId = (app as any).creator_id;
        const me = context.userId;
        const them = data.revieweeId;
        eligible =
          (me === clientId && them === creatorId) || (me === creatorId && them === clientId);
      }
    } else {
      // No specific job — allow if any accepted application links the two parties
      const { data: apps } = await context.supabase
        .from("job_applications")
        .select("creator_id, status, job:jobs(client_id)")
        .eq("status", "accepted");
      eligible = (apps ?? []).some((a: any) => {
        const c = a.creator_id;
        const cl = a.job?.client_id;
        return (
          (c === context.userId && cl === data.revieweeId) ||
          (cl === context.userId && c === data.revieweeId)
        );
      });
    }
    if (!eligible) throw new Error("You can only review someone after completing a project together.");

    const { error } = await context.supabase.from("reviews").upsert(
      {
        reviewer_id: context.userId,
        reviewee_id: data.revieweeId,
        job_id: data.jobId ?? null,
        rating: data.rating,
        body: data.body ?? null,
        direction: data.direction,
      },
      { onConflict: "reviewer_id,reviewee_id,job_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Batch summary for cards/lists
export const reviewSummaries = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ userIds: z.array(z.string().uuid()).max(200) }).parse(d))
  .handler(async ({ data }) => {
    if (!data.userIds.length) return {} as Record<string, { average: number; count: number }>;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("reviews")
      .select("reviewee_id, rating")
      .in("reviewee_id", data.userIds);
    if (error) throw new Error(error.message);
    const map: Record<string, { sum: number; count: number }> = {};
    for (const r of rows ?? []) {
      const k = (r as any).reviewee_id as string;
      if (!map[k]) map[k] = { sum: 0, count: 0 };
      map[k].sum += (r as any).rating;
      map[k].count += 1;
    }
    const out: Record<string, { average: number; count: number }> = {};
    for (const [k, v] of Object.entries(map)) {
      out[k] = { average: Math.round((v.sum / v.count) * 10) / 10, count: v.count };
    }
    return out;
  });
