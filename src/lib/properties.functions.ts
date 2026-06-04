import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { notFound } from "@tanstack/react-router";

const CITY_VALUES = [
  "Domingos Martins",
  "Pedra Azul",
  "Marechal Floriano",
  "Venda Nova do Imigrante",
  "Paraju",
  "Outro",
] as const;

const searchInputSchema = z.object({
  checkin: z.string().optional(),
  checkout: z.string().optional(),
  guests: z.number().int().min(1).max(20).optional(),
  city: z.enum(CITY_VALUES).optional(),
});

export type PropertyListItem = {
  id: string;
  slug: string;
  name: string;
  city: string;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  price_weekday: number;
  price_weekend: number;
  cover_url: string | null;
  is_available: boolean | null; // null when no dates selected
  estimated_total: number | null;
};

export const searchProperties = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => searchInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ properties: PropertyListItem[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Base query: active properties, optional city + capacity filter
    let query = supabaseAdmin
      .from("properties")
      .select(
        "id, slug, name, city, max_guests, bedrooms, bathrooms, price_weekday, price_weekend, featured, sort_order",
      )
      .eq("status", "active");

    if (data.city) query = query.eq("city", data.city);
    if (data.guests) query = query.gte("max_guests", data.guests);

    const { data: rows, error } = await query
      .order("featured", { ascending: false })
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { properties: [] };

    const ids = rows.map((r) => r.id);

    // Cover photos
    const { data: photos } = await supabaseAdmin
      .from("property_photos")
      .select("property_id, storage_path, is_cover, sort_order")
      .in("property_id", ids)
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true });

    const coverByProp = new Map<string, { storage_path: string }>();
    for (const p of photos ?? []) {
      if (!coverByProp.has(p.property_id)) {
        coverByProp.set(p.property_id, {
          storage_path: p.storage_path,
        });
      }
    }

    // Generate signed URLs (bucket is private; always sign from storage_path)
    const signedByProp = new Map<string, string>();
    await Promise.all(
      Array.from(coverByProp.entries()).map(async ([propId, cover]) => {
        if (!cover.storage_path) return;
        const { data: signed } = await supabaseAdmin.storage
          .from("property-photos")
          .createSignedUrl(cover.storage_path, 60 * 60);
        if (signed?.signedUrl) signedByProp.set(propId, signed.signedUrl);
      }),
    );

    // Availability: only compute when both dates are present
    const hasDateRange = Boolean(data.checkin && data.checkout);
    let availability: Map<string, boolean> = new Map();
    let nightsCount = 0;

    if (hasDateRange) {
      const checkin = data.checkin!;
      const checkout = data.checkout!;
      nightsCount = Math.max(
        1,
        Math.round(
          (new Date(checkout).getTime() - new Date(checkin).getTime()) / 86_400_000,
        ),
      );

      // Read setting: block_on_request -> if true, pending also blocks
      const { data: setting } = await supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("key", "block_on_request")
        .maybeSingle();
      const blockOnRequest = setting?.value === "true";
      const blockingStatuses = blockOnRequest
        ? ["pending", "confirmed"]
        : ["confirmed"];

      const [{ data: blocks }, { data: reservs }] = await Promise.all([
        supabaseAdmin
          .from("blocked_dates")
          .select("property_id, start_date, end_date")
          .in("property_id", ids)
          .lt("start_date", checkout)
          .gt("end_date", checkin),
        supabaseAdmin
          .from("reservations")
          .select("property_id, checkin_date, checkout_date, status")
          .in("property_id", ids)
          .in("status", blockingStatuses)
          .lt("checkin_date", checkout)
          .gt("checkout_date", checkin),
      ]);

      const unavailable = new Set<string>();
      for (const b of blocks ?? []) unavailable.add(b.property_id);
      for (const r of reservs ?? []) unavailable.add(r.property_id);
      for (const id of ids) availability.set(id, !unavailable.has(id));
    }

    const items: PropertyListItem[] = rows.map((r) => {
      const basePrice = Math.min(Number(r.price_weekday), Number(r.price_weekend));
      const estimated = hasDateRange ? basePrice * nightsCount : null;
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        city: r.city,
        max_guests: r.max_guests,
        bedrooms: r.bedrooms,
        bathrooms: r.bathrooms,
        price_weekday: Number(r.price_weekday),
        price_weekend: Number(r.price_weekend),
        cover_url: signedByProp.get(r.id) ?? null,
        is_available: hasDateRange ? (availability.get(r.id) ?? true) : null,
        estimated_total: estimated,
      };
    });

    return { properties: items };
  });

// ============================================================
// getPropertyDetail — single property page payload
// ============================================================

export type PropertyPhoto = {
  id: string;
  url: string;
  is_cover: boolean;
  sort_order: number;
};

export type BlockedRange = { start: string; end: string };

export type PropertyDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string;
  address_detail: string | null;
  google_maps_url: string | null;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  parking_spots: number;
  price_weekday: number;
  price_weekend: number;
  price_high_season: number | null;
  cleaning_fee: number;
  min_nights_weekday: number;
  min_nights_weekend: number;
  checkin_time: string;
  checkout_time: string;
  accepts_pets: boolean;
  amenities: string[];
  house_rules: string | null;
  photos: PropertyPhoto[];
  blocked_ranges: BlockedRange[];
  high_season_dates: { start: string; end: string }[];
  block_on_request: boolean;
};

export const getPropertyDetail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ slug: z.string().min(1).max(255) }).parse(input),
  )
  .handler(async ({ data }): Promise<PropertyDetail> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: prop, error } = await supabaseAdmin
      .from("properties")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "active")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!prop) throw notFound();

    // Photos
    const { data: photoRows } = await supabaseAdmin
      .from("property_photos")
      .select("id, storage_path, is_cover, sort_order")
      .eq("property_id", prop.id)
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true });

    const photos: PropertyPhoto[] = [];
    for (const p of photoRows ?? []) {
      let url = "";
      if (p.storage_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from("property-photos")
          .createSignedUrl(p.storage_path, 60 * 60);
        if (signed?.signedUrl) url = signed.signedUrl;
      }
      if (url) {
        photos.push({
          id: p.id,
          url,
          is_cover: p.is_cover,
          sort_order: p.sort_order,
        });
      }
    }

    // block_on_request setting
    const { data: setting } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "block_on_request")
      .maybeSingle();
    const blockOnRequest = setting?.value === "true";
    const blockingStatuses = blockOnRequest
      ? ["pending", "confirmed"]
      : ["confirmed"];

    // Blocked ranges: future-relevant only (end_date >= today)
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: blocks }, { data: reservs }] = await Promise.all([
      supabaseAdmin
        .from("blocked_dates")
        .select("start_date, end_date")
        .eq("property_id", prop.id)
        .gte("end_date", today),
      supabaseAdmin
        .from("reservations")
        .select("checkin_date, checkout_date, status")
        .eq("property_id", prop.id)
        .in("status", blockingStatuses)
        .gte("checkout_date", today),
    ]);

    const blocked_ranges: BlockedRange[] = [
      ...(blocks ?? []).map((b) => ({ start: b.start_date, end: b.end_date })),
      ...(reservs ?? []).map((r) => ({
        start: r.checkin_date,
        end: r.checkout_date,
      })),
    ];

    return {
      id: prop.id,
      slug: prop.slug,
      name: prop.name,
      description: prop.description,
      city: prop.city,
      address_detail: prop.address_detail,
      google_maps_url: prop.google_maps_url,
      max_guests: prop.max_guests,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      parking_spots: prop.parking_spots,
      price_weekday: Number(prop.price_weekday),
      price_weekend: Number(prop.price_weekend),
      price_high_season:
        prop.price_high_season != null ? Number(prop.price_high_season) : null,
      cleaning_fee: Number(prop.cleaning_fee),
      min_nights_weekday: prop.min_nights_weekday,
      min_nights_weekend: prop.min_nights_weekend,
      checkin_time: prop.checkin_time,
      checkout_time: prop.checkout_time,
      accepts_pets: prop.accepts_pets,
      amenities: Array.isArray(prop.amenities)
        ? (prop.amenities as string[])
        : [],
      house_rules: prop.house_rules,
      photos,
      blocked_ranges,
      high_season_dates: Array.isArray(prop.high_season_dates)
        ? (prop.high_season_dates as { start: string; end: string }[])
        : [],
      block_on_request: blockOnRequest,
    };
  });