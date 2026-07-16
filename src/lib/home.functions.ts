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

export type AboutPageSection = {
  title: string;
  body: string;
};

export type AboutPage = {
  hero_title: string;
  hero_intro: string;
  image_path: string;
  sections: AboutPageSection[];
  cta_title: string;
  cta_subtitle: string;
  cta_button_label: string;
  cta_button_link: string;
};

const aboutSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(800),
  image_path: z.string(),
  cta_label: z.string().min(1).max(60),
});

const aboutPageSectionSchema = z.object({
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(900),
});

const aboutPageSchema = z.object({
  hero_title: z.string().min(1).max(120),
  hero_intro: z.string().min(1).max(900),
  image_path: z.string(),
  sections: z.array(aboutPageSectionSchema).length(3),
  cta_title: z.string().min(1).max(120),
  cta_subtitle: z.string().min(1).max(220),
  cta_button_label: z.string().min(1).max(60),
  cta_button_link: z.string().min(1).max(160),
});

export const HERO_MAX_IMAGES = 20;
export const HERO_INTERVAL_OPTIONS = [3000, 5000, 6000, 8000, 10000] as const;
export type HeroIntervalMs = (typeof HERO_INTERVAL_OPTIONS)[number];

export type HomeHero = {
  title: string;
  subtitle: string;
  overlay_opacity: number; // 0-100
  images: string[]; // storage paths, max 5
  title_scale: number; // 50-200 (%), 100 = padrão
  subtitle_scale: number; // 50-200 (%), 100 = padrão
  slide_interval_ms: HeroIntervalMs;
  // Mobile-specific overrides (fall back to desktop values when omitted)
  mobile_images: string[]; // storage paths, max HERO_MAX_IMAGES
  mobile_overlay_opacity: number; // 0-100
  mobile_title_scale: number; // 50-200 (%)
  mobile_subtitle_scale: number; // 50-200 (%)
};

const heroSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().min(1).max(200),
  overlay_opacity: z.number().int().min(0).max(100),
  images: z.array(z.string().min(1)).max(HERO_MAX_IMAGES),
  title_scale: z.number().int().min(50).max(200),
  subtitle_scale: z.number().int().min(50).max(200),
  slide_interval_ms: z
    .number()
    .int()
    .refine((v): v is HeroIntervalMs => (HERO_INTERVAL_OPTIONS as readonly number[]).includes(v)),
  mobile_images: z.array(z.string().min(1)).max(HERO_MAX_IMAGES),
  mobile_overlay_opacity: z.number().int().min(0).max(100),
  mobile_title_scale: z.number().int().min(50).max(200),
  mobile_subtitle_scale: z.number().int().min(50).max(200),
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
    title_scale: 100,
    subtitle_scale: 100,
    slide_interval_ms: 6000,
    mobile_images: [],
    mobile_overlay_opacity: 35,
    mobile_title_scale: 100,
    mobile_subtitle_scale: 100,
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
    const mobileImages = Array.isArray(obj.mobile_images)
      ? (obj.mobile_images as unknown[]).filter(
          (x): x is string => typeof x === "string" && x.length > 0,
        )
      : [];
    const desktopOverlay =
      typeof obj.overlay_opacity === "number" ? obj.overlay_opacity : 35;
    const desktopTitleScale =
      typeof obj.title_scale === "number"
        ? Math.max(50, Math.min(200, Math.round(obj.title_scale)))
        : 100;
    const desktopSubScale =
      typeof obj.subtitle_scale === "number"
        ? Math.max(50, Math.min(200, Math.round(obj.subtitle_scale)))
        : 100;
    const merged = {
      title:
        typeof obj.title === "string" && obj.title.trim()
          ? obj.title
          : DEFAULT_HERO_TITLE,
      subtitle:
        typeof obj.subtitle === "string" && obj.subtitle.trim()
          ? obj.subtitle
          : DEFAULT_HERO_SUBTITLE,
      overlay_opacity: desktopOverlay,
      images: images.slice(0, HERO_MAX_IMAGES),
      title_scale: desktopTitleScale,
      subtitle_scale: desktopSubScale,
      slide_interval_ms:
        typeof obj.slide_interval_ms === "number" &&
        (HERO_INTERVAL_OPTIONS as readonly number[]).includes(obj.slide_interval_ms)
          ? (obj.slide_interval_ms as HeroIntervalMs)
          : 6000,
      mobile_images: mobileImages.slice(0, HERO_MAX_IMAGES),
      mobile_overlay_opacity:
        typeof obj.mobile_overlay_opacity === "number"
          ? Math.max(0, Math.min(100, Math.round(obj.mobile_overlay_opacity)))
          : desktopOverlay,
      mobile_title_scale:
        typeof obj.mobile_title_scale === "number"
          ? Math.max(50, Math.min(200, Math.round(obj.mobile_title_scale)))
          : desktopTitleScale,
      mobile_subtitle_scale:
        typeof obj.mobile_subtitle_scale === "number"
          ? Math.max(50, Math.min(200, Math.round(obj.mobile_subtitle_scale)))
          : desktopSubScale,
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

function defaultAboutPage(): AboutPage {
  return {
    hero_title: "Sobre a RotainStay",
    hero_intro:
      "A RotainStay nasceu do amor pelas montanhas do Espírito Santo e do desejo de oferecer aos visitantes muito mais que uma simples hospedagem. Cada propriedade do nosso portfólio é cuidadosamente selecionada para garantir que sua estadia na Serra seja inesquecível.",
    image_path: "",
    sections: [
      {
        title: "Nossa região",
        body: "Atuamos em Domingos Martins, Pedra Azul, Marechal Floriano, Venda Nova do Imigrante, Paraju e demais cidades da região serrana capixaba. Um destino de clima ameno, paisagens deslumbrantes, gastronomia rica e tradição de hospitalidade. Seja para uma escapada romântica, uma viagem em família ou um retiro com amigos, temos a propriedade certa para você.",
      },
      {
        title: "Como funciona",
        body: "Você navega pelo nosso site, encontra a casa ideal para suas datas e número de hóspedes, e envia uma solicitação de reserva. Em seguida, nosso atendimento entra em contato via WhatsApp para confirmar os detalhes, esclarecer dúvidas e finalizar sua reserva com segurança. Nada de processos burocráticos: simples, direto e humano.",
      },
      {
        title: "Nosso compromisso",
        body: "Cada propriedade é avaliada pessoalmente antes de entrar no portfólio. Verificamos estrutura, limpeza, conforto, segurança e a qualidade do que é entregue. Trabalhamos apenas com proprietários comprometidos com a excelência, para que você se preocupe apenas em aproveitar.",
      },
    ],
    cta_title: "Pronto para sua próxima escapada?",
    cta_subtitle:
      "Explore nosso portfólio completo e encontre a casa perfeita para você.",
    cta_button_label: "Ver todas as propriedades",
    cta_button_link: "/propriedades",
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

function parseAboutPage(raw: unknown): AboutPage {
  const fallback = defaultAboutPage();
  try {
    const obj =
      typeof raw === "string"
        ? (JSON.parse(raw) as Record<string, unknown>)
        : ((raw ?? {}) as Record<string, unknown>);
    const incomingSections = Array.isArray(obj.sections) ? obj.sections : [];
    const sections = fallback.sections.map((fallbackSection, index) => {
      const section = incomingSections[index] as Record<string, unknown> | undefined;
      return {
        title:
          typeof section?.title === "string" && section.title.trim()
            ? section.title
            : fallbackSection.title,
        body:
          typeof section?.body === "string" && section.body.trim()
            ? section.body
            : fallbackSection.body,
      };
    });
    return aboutPageSchema.parse({
      hero_title:
        typeof obj.hero_title === "string" && obj.hero_title.trim()
          ? obj.hero_title
          : fallback.hero_title,
      hero_intro:
        typeof obj.hero_intro === "string" && obj.hero_intro.trim()
          ? obj.hero_intro
          : fallback.hero_intro,
      image_path: typeof obj.image_path === "string" ? obj.image_path : "",
      sections,
      cta_title:
        typeof obj.cta_title === "string" && obj.cta_title.trim()
          ? obj.cta_title
          : fallback.cta_title,
      cta_subtitle:
        typeof obj.cta_subtitle === "string" && obj.cta_subtitle.trim()
          ? obj.cta_subtitle
          : fallback.cta_subtitle,
      cta_button_label:
        typeof obj.cta_button_label === "string" && obj.cta_button_label.trim()
          ? obj.cta_button_label
          : fallback.cta_button_label,
      cta_button_link:
        typeof obj.cta_button_link === "string" && obj.cta_button_link.trim()
          ? obj.cta_button_link
          : fallback.cta_button_link,
    });
  } catch {
    return fallback;
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

export const getAboutPage = createServerFn({ method: "GET" }).handler(
  async (): Promise<AboutPage & { image_url: string | null }> => {
    setResponseHeader(
      "cache-control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    );
    const raw = await readSetting("about_page");
    const about = parseAboutPage(raw);
    const image_url = about.image_path
      ? await signOne("home-assets", about.image_path)
      : null;
    return { ...about, image_url };
  },
);

export const getHomeHero = createServerFn({ method: "GET" }).handler(
  async (): Promise<
    HomeHero & { image_urls: string[]; mobile_image_urls: string[] }
  > => {
    setResponseHeader(
      "cache-control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    );
    const raw = await readSetting("home_hero");
    const hero = parseHero(raw);
    const allPaths = Array.from(
      new Set([...hero.images, ...hero.mobile_images]),
    );
    const signed =
      allPaths.length > 0
        ? await signMany("home-assets", allPaths)
        : new Map<string, string>();
    const image_urls = hero.images
      .map((p) => signed.get(p))
      .filter((u): u is string => !!u);
    const mobile_image_urls = hero.mobile_images
      .map((p) => signed.get(p))
      .filter((u): u is string => !!u);
    return { ...hero, image_urls, mobile_image_urls };
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

export const setAboutPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: AboutPage) => aboutPageSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await writeSetting("about_page", data);
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