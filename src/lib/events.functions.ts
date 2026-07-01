import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

export type EventPublic = {
  id: string;
  image_url: string;
  title: string;
  description: string | null;
  city: string;
  start_date: string;
  end_date: string;
  button_label: string;
  button_url: string | null;
};

export type ScheduleItem = {
  datetime: string;
  title: string;
  description?: string | null;
};

export type EventDetail = EventPublic & {
  long_description: string | null;
  schedule: ScheduleItem[];
  gallery_urls: string[];
  location_name: string | null;
  location_address: string | null;
  map_url: string | null;
};

const SIGNED_TTL_SECONDS = 60 * 60;

async function loadEvents(limit?: number): Promise<EventPublic[]> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );

  const today = new Date().toISOString().slice(0, 10);

  let query = (supabaseAdmin.from as unknown as (t: string) => ReturnType<typeof supabaseAdmin.from>)("events")
    .select(
      "id, image_path, title, description, city, start_date, end_date, button_label, button_url",
    )
    .eq("is_active", true)
    .gte("end_date", today)
    .order("sort_order", { ascending: true })
    .order("start_date", { ascending: true });

  if (limit && limit > 0) query = query.limit(limit);

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);
  const list = (rows ?? []) as Array<{
    id: string;
    image_path: string;
    title: string;
    description: string | null;
    city: string;
    start_date: string;
    end_date: string;
    button_label: string;
    button_url: string | null;
  }>;
  if (list.length === 0) return [];

  const paths = list.map((r) => r.image_path).filter(Boolean);
  const { data: signed } = await supabaseAdmin.storage
    .from("event-photos")
    .createSignedUrls(paths, SIGNED_TTL_SECONDS);

  const urlByPath = new Map<string, string>();
  for (const e of signed ?? []) {
    if (e.path && e.signedUrl) urlByPath.set(e.path, e.signedUrl);
  }

  return list
    .map((r) => ({
      id: r.id,
      image_url: urlByPath.get(r.image_path) ?? "",
      title: r.title,
      description: r.description,
      city: r.city,
      start_date: r.start_date,
      end_date: r.end_date,
      button_label: r.button_label,
      button_url: r.button_url,
    }))
    .filter((e) => e.image_url);
}

export const getEventById = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<{ event: EventDetail | null }> => {
    setResponseHeader(
      "cache-control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    );
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row, error } = await (
      supabaseAdmin.from as unknown as (t: string) => ReturnType<typeof supabaseAdmin.from>
    )("events")
      .select(
        "id, image_path, title, description, city, start_date, end_date, button_label, button_url, is_active, long_description, schedule, gallery_paths, location_name, location_address, map_url",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { event: null };
    const r = row as unknown as {
      id: string;
      image_path: string;
      title: string;
      description: string | null;
      city: string;
      start_date: string;
      end_date: string;
      button_label: string;
      button_url: string | null;
      is_active: boolean;
      long_description: string | null;
      schedule: ScheduleItem[] | null;
      gallery_paths: string[] | null;
      location_name: string | null;
      location_address: string | null;
      map_url: string | null;
    };
    if (!r.is_active) return { event: null };
    const paths = [r.image_path, ...(r.gallery_paths ?? [])].filter(Boolean);
    const { data: signed } = await supabaseAdmin.storage
      .from("event-photos")
      .createSignedUrls(paths, SIGNED_TTL_SECONDS);
    const urlByPath = new Map<string, string>();
    for (const e of signed ?? []) {
      if (e.path && e.signedUrl) urlByPath.set(e.path, e.signedUrl);
    }
    return {
      event: {
        id: r.id,
        image_url: urlByPath.get(r.image_path) ?? "",
        title: r.title,
        description: r.description,
        city: r.city,
        start_date: r.start_date,
        end_date: r.end_date,
        button_label: r.button_label,
        button_url: r.button_url,
        long_description: r.long_description,
        schedule: Array.isArray(r.schedule) ? r.schedule : [],
        gallery_urls: (r.gallery_paths ?? [])
          .map((p) => urlByPath.get(p) ?? "")
          .filter(Boolean),
        location_name: r.location_name,
        location_address: r.location_address,
        map_url: r.map_url,
      },
    };
  });

export const getHomeEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ events: EventPublic[] }> => {
    setResponseHeader(
      "cache-control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    );
    const events = await loadEvents(3);
    return { events };
  },
);

export const getAllEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ events: EventPublic[] }> => {
    setResponseHeader(
      "cache-control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    );
    const events = await loadEvents();
    return { events };
  },
);

export const getPropertyCities = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ cities: string[] }> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("properties")
      .select("city")
      .not("city", "is", null);
    if (error) throw new Error(error.message);
    const set = new Set<string>();
    for (const r of data ?? []) {
      const c = (r as { city: string | null }).city;
      if (c && c.trim()) set.add(c.trim());
    }
    return { cities: Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR")) };
  },
);