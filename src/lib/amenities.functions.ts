import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AmenityItem = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

export type AmenityCategory = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  items: AmenityItem[];
};

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

async function fetchCatalog(opts: { onlyActive: boolean }): Promise<AmenityCategory[]> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  let catQ = supabaseAdmin
    .from("amenity_categories")
    .select("id, name, sort_order, is_active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (opts.onlyActive) catQ = catQ.eq("is_active", true);
  let amQ = supabaseAdmin
    .from("amenities")
    .select("id, category_id, name, slug, sort_order, is_active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (opts.onlyActive) amQ = amQ.eq("is_active", true);
  const [catRes, amRes] = await Promise.all([catQ, amQ]);
  if (catRes.error) throw new Error(catRes.error.message);
  if (amRes.error) throw new Error(amRes.error.message);
  const cats = (catRes.data ?? []) as Array<{
    id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
  }>;
  const items = (amRes.data ?? []) as AmenityItem[];
  const byCat = new Map<string, AmenityItem[]>();
  for (const it of items) {
    if (!byCat.has(it.category_id)) byCat.set(it.category_id, []);
    byCat.get(it.category_id)!.push(it);
  }
  return cats.map((c) => ({ ...c, items: byCat.get(c.id) ?? [] }));
}

// ---------- Public ----------

export const listAmenityCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ categories: AmenityCategory[] }> => {
    setResponseHeader(
      "cache-control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    );
    const categories = await fetchCatalog({ onlyActive: true });
    return { categories };
  },
);

// ---------- Admin ----------

export const listAmenityCatalogAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ categories: AmenityCategory[] }> => {
    await assertAdmin(context.userId);
    const categories = await fetchCatalog({ onlyActive: false });
    return { categories };
  });

function slugify(input: string): string {
  return (input || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

const categoryInput = z.object({
  name: z.string().trim().min(1).max(120),
  sort_order: z.number().int().min(0).max(99999).optional(),
  is_active: z.boolean().optional(),
});

export const createAmenityCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => categoryInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row, error } = await supabaseAdmin
      .from("amenity_categories")
      .insert({
        name: data.name,
        sort_order: data.sort_order ?? 999,
        is_active: data.is_active ?? true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updateAmenityCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(120).optional(),
        sort_order: z.number().int().min(0).max(99999).optional(),
        is_active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.sort_order !== undefined) patch.sort_order = data.sort_order;
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    const { error } = await supabaseAdmin
      .from("amenity_categories")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAmenityCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("amenity_categories")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const amenityInput = z.object({
  category_id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(160).optional(),
  sort_order: z.number().int().min(0).max(99999).optional(),
  is_active: z.boolean().optional(),
});

export const createAmenity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => amenityInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    let slug = (data.slug && data.slug.length > 0 ? data.slug : slugify(data.name)).slice(0, 160);
    if (!slug) slug = `item-${Date.now()}`;
    // ensure unique
    let candidate = slug;
    let i = 1;
    while (true) {
      const { data: existing, error: e } = await supabaseAdmin
        .from("amenities")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();
      if (e) throw new Error(e.message);
      if (!existing) break;
      i += 1;
      candidate = `${slug}-${i}`;
    }
    const { data: row, error } = await supabaseAdmin
      .from("amenities")
      .insert({
        category_id: data.category_id,
        name: data.name,
        slug: candidate,
        sort_order: data.sort_order ?? 999,
        is_active: data.is_active ?? true,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, slug: candidate };
  });

export const updateAmenity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        category_id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(120).optional(),
        sort_order: z.number().int().min(0).max(99999).optional(),
        is_active: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.category_id !== undefined) patch.category_id = data.category_id;
    if (data.sort_order !== undefined) patch.sort_order = data.sort_order;
    if (data.is_active !== undefined) patch.is_active = data.is_active;
    const { error } = await supabaseAdmin
      .from("amenities")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAmenity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("amenities")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });