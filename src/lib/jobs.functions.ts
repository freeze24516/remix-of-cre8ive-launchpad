import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const listSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  remote: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
});

export const listJobs = createServerFn({ method: "GET" })
  .inputValidator((d) => listSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pageSize = 20;
    const from = (data.page - 1) * pageSize;
    let q = supabaseAdmin
      .from("jobs")
      .select(
        "id, client_id, title, description, budget_min, budget_max, currency, deadline, location, remote_ok, skills, status, created_at, category:categories(id, slug, name)",
        { count: "exact" },
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (data.q) q = q.or(`title.ilike.%${data.q}%,description.ilike.%${data.q}%`);
    if (data.remote === true) q = q.eq("remote_ok", true);
    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    let filtered = rows ?? [];
    if (data.category) filtered = filtered.filter((j: any) => j.category?.slug === data.category);
    const clientIds = Array.from(new Set(filtered.map((j: any) => j.client_id)));
    let clientsById: Record<string, any> = {};
    if (clientIds.length) {
      const { data: clients } = await supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", clientIds);
      clientsById = Object.fromEntries((clients ?? []).map((c: any) => [c.id, c]));
    }
    const jobs = filtered.map((j: any) => ({ ...j, client: clientsById[j.client_id] ?? null }));
    return { jobs, total: count ?? 0, page: data.page, pageSize };
  });

export const getJob = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select(
        "id, client_id, title, description, budget_min, budget_max, currency, deadline, location, remote_ok, skills, status, created_at, category:categories(id, slug, name)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!job) return null;
    const { data: client } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio")
      .eq("id", job.client_id)
      .maybeSingle();
    return { ...job, client };
  });

const createJobSchema = z.object({
  title: z.string().min(4).max(120),
  description: z.string().min(20).max(8000),
  category_id: z.string().uuid().optional().nullable(),
  budget_min: z.number().min(0).optional().nullable(),
  budget_max: z.number().min(0).optional().nullable(),
  currency: z.string().min(3).max(6).default("USD"),
  deadline: z.string().optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  remote_ok: z.boolean().default(true),
  skills: z.array(z.string().max(40)).max(15).default([]),
  status: z.enum(["draft", "open"]).default("open"),
});

export const createJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createJobSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("jobs")
      .insert({ ...data, client_id: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateJobStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), status: z.enum(["draft", "open", "in_review", "closed", "filled"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("jobs").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const myJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("jobs")
      .select("id, title, status, budget_min, budget_max, currency, created_at, deadline")
      .eq("client_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const jobApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: job } = await context.supabase.from("jobs").select("client_id, title").eq("id", data.jobId).maybeSingle();
    if (!job) throw new Error("Job not found");
    const { data: apps, error } = await context.supabase
      .from("job_applications")
      .select(
        "id, creator_id, pitch, quoted_rate, currency, status, created_at",
      )
      .eq("job_id", data.jobId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((apps ?? []).map((a: any) => a.creator_id)));
    let byId: Record<string, any> = {};
    if (ids.length) {
      const { data: ps } = await context.supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);
      byId = Object.fromEntries((ps ?? []).map((p: any) => [p.id, p]));
    }
    const applications = (apps ?? []).map((a: any) => ({ ...a, creator: byId[a.creator_id] ?? null }));
    return { job, applications };
  });

export const applyToJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ job_id: z.string().uuid(), pitch: z.string().min(20).max(4000), quoted_rate: z.number().optional().nullable(), currency: z.string().default("USD") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("job_applications").insert({ ...data, creator_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pending", "shortlisted", "accepted", "rejected", "withdrawn"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("job_applications").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const myApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("job_applications")
      .select("id, pitch, quoted_rate, currency, status, created_at, job:jobs(id, title, status)")
      .eq("creator_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });