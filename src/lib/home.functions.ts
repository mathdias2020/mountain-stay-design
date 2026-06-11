import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signOne } from "@/lib/storage-signing";

export type CurationMode = "manual" | "random" | "pinned";

export type PropertiesCuration = {
  mode: CurationMode;
  pinned_ids: (string | null)[]; // length 3; null = empty slot
  manual_order: string[];
};

const curationSchema = z.object({
  mode: z.enum(["manual", "random", "pinned"]),
  pinned_ids: z.array(z.string().nullable()).max(3),
  manual_order: z.array(z.string()),
});

export type HomeAbout = {
  title: string;
  body: string;
  image_path: string;
  cta_label: string;
};

const aboutSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(800),
  image_path: z.string(),
  cta_label: z.string().min(1).max(60),
});

function defaultCuration(): PropertiesCuration {
  return { mode: "random", pinned_ids: [null, null, null], manual_order: [] };
}

function defaultAbout(): HomeAbout {
  return {
    title: "Sobre a RotainStay",
    body: "Casas e chalés selecionados nas montanhas do Espírito Santo. Conforto, natureza e hospitalidade para sua próxima escapada.",
    image_path: "",
    cta_label: "Conheça nossa história",
  };
}

function parseCuration(raw: unknown): PropertiesCuration {
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    const parsed = curationSchema.parse(obj);
    const slots: (string | null)[] = [null, null, null];
    for (let i = 0; i < 3; i++) slots[i] = parsed.pinned_ids[i] ?? null;
    return { ...parsed, pinned_ids: slots };
  } catch {
    return defaultCuration();
  }
}

function parseAbout(raw: unknown): HomeAbout {
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    return aboutSchema.parse(obj);
  } catch {
    return defaultAbout();
  }
}

async function readSetting(key: string): Promise<string | null> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}

async function writeSetting(key: string, value: unknown) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const json = typeof value === "string" ? value : JSON.stringify(value);
  const { error } = await supabaseAdmin
    .from("site_settings")
    .upsert({ key, value: json }, { onConflict: "key" });
  if (error) throw new Error(error.message);
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

export const getHomeCuration = createServerFn({ method: "GET" }).handler(
  async (): Promise<PropertiesCuration> => {
    setResponseHeader(
      "cache-control",
      "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
    );
    const raw = await readSetting("home_properties_curation");
    return parseCuration(raw);
  },
);

export const getHomeAbout = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeAbout & { image_url: string | null }> => {
    setResponseHeader(
      "cache-control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    );
    const raw = await readSetting("home_about");
    const about = parseAbout(raw);
    const image_url = about.image_path
      ? await signOne("home-assets", about.image_path)
      : null;
    return { ...about, image_url };
  },
);

export const getWhatsappNumber = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ number: string | null }> => {
    setResponseHeader(
      "cache-control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    );
    const raw = await readSetting("admin_whatsapp");
    const digits = (raw ?? "").replace(/\D/g, "");
    return { number: digits.length >= 8 ? digits : null };
  },
);

// ---------- Admin ----------

export const setHomeCuration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: PropertiesCuration) => curationSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await writeSetting("home_properties_curation", data);
    return { ok: true };
  });

export const setHomeAbout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: HomeAbout) => aboutSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await writeSetting("home_about", data);
    return { ok: true };
  });

// ---------- Curation utility (used client + server safely; pure) ----------

export function applyCuration<T extends { id: string }>(
  items: T[],
  curation: PropertiesCuration,
): T[] {
  if (items.length === 0) return items;
  const byId = new Map(items.map((p) => [p.id, p]));

  if (curation.mode === "manual") {
    const ordered: T[] = [];
    const seen = new Set<string>();
    for (const id of curation.manual_order) {
      const it = byId.get(id);
      if (it && !seen.has(id)) {
        ordered.push(it);
        seen.add(id);
      }
    }
    for (const it of items) if (!seen.has(it.id)) ordered.push(it);
    return ordered;
  }

  if (curation.mode === "pinned") {
    const slots: (T | null)[] = [null, null, null];
    const used = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const id = curation.pinned_ids[i];
      if (id) {
        const it = byId.get(id);
        if (it) {
          slots[i] = it;
          used.add(id);
        }
      }
    }
    const rest = items.filter((it) => !used.has(it.id));
    // Shuffle rest
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    const out: T[] = [];
    for (let i = 0; i < 3; i++) {
      if (slots[i]) out.push(slots[i] as T);
      else if (rest.length > 0) out.push(rest.shift()!);
    }
    out.push(...rest);
    return out;
  }

  // random
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}