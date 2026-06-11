import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signMany } from "@/lib/storage-signing";

export type AttractionCategory = "atracao" | "restaurante" | "passeio";

export type AttractionCard = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  city: string;
  cover_url: string;
};

export type AttractionDetail = AttractionCard & {
  long_description: string | null;
  external_url: string | null;
  gallery_urls: string[];
};

const categorySchema = z.enum(["atracao", "restaurante", "passeio"]);

type RawRow = {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  long_description: string | null;
  city: string;
  external_url: string | null;
  cover_image_path: string;
  gallery: unknown;
};

function asPaths(g: unknown): string[] {
  if (!Array.isArray(g)) return [];
  return g.filter((x): x is string => typeof x === "string" && x.length > 0);
}

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

// ---------- Public ----------

export const getAttractionsByCategory = createServerFn({ method: "GET" })
  .inputValidator((data: { category: AttractionCategory; city?: string }) =>
    z
      .object({ category: categorySchema, city: z.string().min(1).max(120).optional() })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ items: AttractionCard[] }> => {
    setResponseHeader(
      "cache-control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    );
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    let q = supabaseAdmin
      .from("attractions")
      .select(
        "id, slug, title, short_description, city, cover_image_path",
      )
      .eq("category", data.category)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (data.city) q = q.eq("city", data.city);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Array<{
      id: string;
      slug: string;
      title: string;
      short_description: string | null;
      city: string;
      cover_image_path: string;
    }>;
    if (list.length === 0) return { items: [] };
    const urls = await signMany(
      "attraction-photos",
      list.map((r) => r.cover_image_path),
    );
    const items: AttractionCard[] = list
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        short_description: r.short_description,
        city: r.city,
        cover_url: urls.get(r.cover_image_path) ?? "",
      }))
      .filter((c) => c.cover_url);
    return { items };
  });

export const getCategoryHighlights = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    atracao: { count: number; cover: string | null };
    restaurante: { count: number; cover: string | null };
    passeio: { count: number; cover: string | null };
  }> => {
    setResponseHeader(
      "cache-control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    );
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: rows, error } = await supabaseAdmin
      .from("attractions")
      .select("category, cover_image_path, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);

    const grouped: Record<string, { count: number; cover_path: string | null }> = {
      atracao: { count: 0, cover_path: null },
      restaurante: { count: 0, cover_path: null },
      passeio: { count: 0, cover_path: null },
    };
    for (const r of (rows ?? []) as Array<{
      category: string;
      cover_image_path: string;
    }>) {
      const g = grouped[r.category];
      if (!g) continue;
      g.count += 1;
      if (!g.cover_path) g.cover_path = r.cover_image_path;
    }
    const paths = Object.values(grouped)
      .map((v) => v.cover_path)
      .filter((p): p is string => !!p);
    const urls = paths.length
      ? await signMany("attraction-photos", paths)
      : new Map<string, string>();
    return {
      atracao: {
        count: grouped.atracao.count,
        cover: grouped.atracao.cover_path
          ? (urls.get(grouped.atracao.cover_path) ?? null)
          : null,
      },
      restaurante: {
        count: grouped.restaurante.count,
        cover: grouped.restaurante.cover_path
          ? (urls.get(grouped.restaurante.cover_path) ?? null)
          : null,
      },
      passeio: {
        count: grouped.passeio.count,
        cover: grouped.passeio.cover_path
          ? (urls.get(grouped.passeio.cover_path) ?? null)
          : null,
      },
    };
  },
);

export const getAttractionBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { category: AttractionCategory; slug: string }) =>
    z
      .object({
        category: categorySchema,
        slug: z.string().min(1).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ item: AttractionDetail | null }> => {
    setResponseHeader(
      "cache-control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    );
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row, error } = await supabaseAdmin
      .from("attractions")
      .select(
        "id, slug, title, short_description, long_description, city, external_url, cover_image_path, gallery",
      )
      .eq("category", data.category)
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { item: null };
    const r = row as unknown as RawRow;
    const galleryPaths = asPaths(r.gallery);
    const allPaths = [r.cover_image_path, ...galleryPaths];
    const urls = await signMany("attraction-photos", allPaths);
    return {
      item: {
        id: r.id,
        slug: r.slug,
        title: r.title,
        short_description: r.short_description,
        long_description: r.long_description,
        city: r.city,
        external_url: r.external_url,
        cover_url: urls.get(r.cover_image_path) ?? "",
        gallery_urls: galleryPaths
          .map((p) => urls.get(p))
          .filter((u): u is string => !!u),
      },
    };
  });

// ---------- Admin ----------

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  category: categorySchema,
  title: z.string().min(1).max(160),
  short_description: z.string().max(300).nullable().optional(),
  long_description: z.string().max(5000).nullable().optional(),
  city: z.string().min(1).max(120),
  external_url: z.string().url().max(500).nullable().optional(),
  cover_image_path: z.string().min(1),
  gallery: z.array(z.string().min(1)).max(20),
  sort_order: z.number().int(),
  is_active: z.boolean(),
});

export type AttractionUpsert = z.infer<typeof upsertSchema>;

export const upsertAttraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: AttractionUpsert) => upsertSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const payload = {
      category: data.category,
      title: data.title,
      short_description: data.short_description ?? null,
      long_description: data.long_description ?? null,
      city: data.city,
      external_url: data.external_url ?? null,
      cover_image_path: data.cover_image_path,
      gallery: data.gallery,
      sort_order: data.sort_order,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("attractions")
        .update(payload as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await supabaseAdmin
      .from("attractions")
      .insert({ ...payload, slug: "" } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (ins as { id: string }).id };
  });

export const deleteAttraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    // Read paths to clean storage
    const { data: row } = await supabaseAdmin
      .from("attractions")
      .select("cover_image_path, gallery")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabaseAdmin
      .from("attractions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row) {
      const r = row as unknown as { cover_image_path: string; gallery: unknown };
      const paths = [r.cover_image_path, ...asPaths(r.gallery)].filter(Boolean);
      if (paths.length > 0) {
        await supabaseAdmin.storage.from("attraction-photos").remove(paths);
      }
    }
    return { ok: true };
  });

export const getAdminAttractions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { category: AttractionCategory }) =>
    z.object({ category: categorySchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: rows, error } = await supabaseAdmin
      .from("attractions")
      .select(
        "id, category, slug, title, short_description, long_description, city, external_url, cover_image_path, gallery, sort_order, is_active, created_at",
      )
      .eq("category", data.category)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Array<{
      id: string;
      category: AttractionCategory;
      slug: string;
      title: string;
      short_description: string | null;
      long_description: string | null;
      city: string;
      external_url: string | null;
      cover_image_path: string;
      gallery: unknown;
      sort_order: number;
      is_active: boolean;
      created_at: string;
    }>;
    const paths = list.map((r) => r.cover_image_path).filter(Boolean);
    const urls = paths.length
      ? await signMany("attraction-photos", paths)
      : new Map<string, string>();
    return {
      items: list.map((r) => ({
        ...r,
        gallery: asPaths(r.gallery),
        cover_url: urls.get(r.cover_image_path) ?? "",
      })),
    };
  });