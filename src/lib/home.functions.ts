import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signOne, signMany } from "@/lib/storage-signing";

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

export const HERO_MAX_IMAGES = 5;

export type HomeHero = {
  title: string;
  subtitle: string;
  overlay_opacity: number; // 0-100
  images: string[]; // storage paths, max 5
};

const heroSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().min(1).max(200),
  overlay_opacity: z.number().int().min(0).max(100),
  images: z.array(z.string().min(1)).max(HERO_MAX_IMAGES),
});

const DEFAULT_HERO_TITLE =
  "Sua próxima escapada nas montanhas do Espírito Santo";
const DEFAULT_HERO_SUBTITLE =
  "Casas e chalés para temporada em Domingos Martins, Pedra Azul e região serrana.";

function defaultHero(): HomeHero {
  return {
    title: DEFAULT_HERO_TITLE,
    subtitle: DEFAULT_HERO_SUBTITLE,
    overlay_opacity: 35,
    images: [],
  };
}

function parseHero(raw: unknown): HomeHero {
  try {
    const obj =
      typeof raw === "string"
        ? (JSON.parse(raw) as Record<string, unknown>)
        : ((raw ?? {}) as Record<string, unknown>);
    // Backward compat: legacy { image_path, overlay_opacity }
    const legacyPath =
      typeof obj.image_path === "string" && obj.image_path
        ? (obj.image_path as string)
        : null;
    const images = Array.isArray(obj.images)
      ? (obj.images as unknown[]).filter(
          (x): x is string => typeof x === "string" && x.length > 0,
        )
      : legacyPath
        ? [legacyPath]
        : [];
    const merged = {
      title:
        typeof obj.title === "string" && obj.title.trim()
          ? obj.title
          : DEFAULT_HERO_TITLE,
      subtitle:
        typeof obj.subtitle === "string" && obj.subtitle.trim()
          ? obj.subtitle
          : DEFAULT_HERO_SUBTITLE,
      overlay_opacity:
        typeof obj.overlay_opacity === "number" ? obj.overlay_opacity : 35,
      images: images.slice(0, HERO_MAX_IMAGES),
    };
    return heroSchema.parse(merged);
  } catch {
    return defaultHero();
  }
}

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

export const getHomeHero = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeHero & { image_urls: string[] }> => {
    setResponseHeader(
      "cache-control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    );
    const raw = await readSetting("home_hero");
    const hero = parseHero(raw);
    const signed =
      hero.images.length > 0
        ? await signMany("home-assets", hero.images)
        : new Map<string, string>();
    const image_urls = hero.images
      .map((p) => signed.get(p))
      .filter((u): u is string => !!u);
    return { ...hero, image_urls };
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

export const setHomeHero = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: HomeHero) => heroSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await writeSetting("home_hero", data);
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