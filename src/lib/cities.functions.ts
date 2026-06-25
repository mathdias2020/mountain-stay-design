import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

const nameSchema = z.string().trim().min(2).max(80);

const cityInputSchema = z.object({
  name: nameSchema,
  active: z.boolean(),
  sort_order: z.number().int().min(0).max(9999),
});

export type CityInput = z.input<typeof cityInputSchema>;

export type City = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
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

// Public: list active cities (used by PropertyForm select and home filters).
export const listActiveCities = createServerFn({ method: "GET" }).handler(
  async (): Promise<City[]> => {
    const supabasePublic = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
    const { data, error } = await supabasePublic
      .from("cities")
      .select("id, name, slug, active, sort_order, created_at, updated_at")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as City[];
  },
);

// Admin: list all cities (active + inactive).
export const listCities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<City[]> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("cities")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as City[];
  });

export const createCity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => cityInputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const name = data.name.trim();
    const { error } = await supabaseAdmin.from("cities").insert({
      name,
      slug: slugify(name),
      active: data.active,
      sort_order: data.sort_order,
    });
    if (error) {
      if (error.code === "23505") {
        throw new Error("Já existe uma cidade com esse nome.");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const updateCity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid() }).merge(cityInputSchema).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    // Fetch previous name to keep properties.city in sync if it changes.
    const { data: previous, error: fetchErr } = await supabaseAdmin
      .from("cities")
      .select("name")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!previous) throw new Error("Cidade não encontrada.");

    const newName = data.name.trim();
    const { error } = await supabaseAdmin
      .from("cities")
      .update({
        name: newName,
        slug: slugify(newName),
        active: data.active,
        sort_order: data.sort_order,
      })
      .eq("id", data.id);
    if (error) {
      if (error.code === "23505") {
        throw new Error("Já existe uma cidade com esse nome.");
      }
      throw new Error(error.message);
    }

    if (previous.name !== newName) {
      const { error: syncErr } = await supabaseAdmin
        .from("properties")
        .update({ city: newName })
        .eq("city", previous.name);
      if (syncErr) throw new Error(syncErr.message);
    }
    return { ok: true };
  });

export const deleteCity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: city, error: fetchErr } = await supabaseAdmin
      .from("cities")
      .select("name")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!city) throw new Error("Cidade não encontrada.");

    const { count, error: countErr } = await supabaseAdmin
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("city", city.name);
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) {
      throw new Error(
        `Não é possível excluir: ${count} propriedade(s) usam esta cidade. Desative em vez de excluir.`,
      );
    }

    const { error } = await supabaseAdmin
      .from("cities")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });