import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { notFound } from "@tanstack/react-router";
import { setResponseHeader } from "@tanstack/react-start/server";

// ------------------------------------------------------------------
// In-memory signed-URL cache (per worker instance).
// Avoids re-signing the same storage_path on every request while the
// URL is still valid. TTL is shorter than the signed-URL expiry so we
// never serve a URL that's about to expire.
// ------------------------------------------------------------------
const SIGNED_TTL_SECONDS = 60 * 60 * 24; // 24h signed URL
const CACHE_TTL_MS = 60 * 60 * 12 * 1000; // 12h in-memory
type SignedEntry = { url: string; expiresAt: number };
const signedUrlCache = new Map<string, SignedEntry>();

async function signMany(
  paths: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const now = Date.now();
  const toFetch: string[] = [];

  for (const p of paths) {
    if (!p) continue;
    const hit = signedUrlCache.get(p);
    if (hit && hit.expiresAt > now) {
      out.set(p, hit.url);
    } else {
      toFetch.push(p);
    }
  }

  if (toFetch.length === 0) return out;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from("property-photos")
    .createSignedUrls(toFetch, SIGNED_TTL_SECONDS);
  if (error || !data) return out;
  for (const entry of data) {
    if (entry.signedUrl && entry.path) {
      out.set(entry.path, entry.signedUrl);
      signedUrlCache.set(entry.path, {
        url: entry.signedUrl,
        expiresAt: now + CACHE_TTL_MS,
      });
    }
  }
  return out;
}

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

    // Allow browser + intermediate caches to reuse the response briefly while
    // still revalidating in the background. Filters are part of the URL so
    // different filter combos get their own cache entry naturally.
    setResponseHeader(
      "cache-control",
      "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
    );

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
      .order("tier", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { properties: [] };

    const ids = rows.map((r) => r.id);

    // Cover photos
    const { data: photos } = await supabaseAdmin
      .from("property_photos")
      .select("property_id, storage_path, public_url, is_cover, sort_order")
      .in("property_id", ids)
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true });

    // For listings we prefer the lightweight thumb (stored in `public_url`
    // as a storage path — legacy column reused; if absent we fall back to
    // the original storage_path).
    const coverByProp = new Map<string, { path: string }>();
    for (const p of photos ?? []) {
      if (!coverByProp.has(p.property_id)) {
        const thumbPath =
          p.public_url && !p.public_url.startsWith("http")
            ? p.public_url
            : null;
        coverByProp.set(p.property_id, {
          path: thumbPath || p.storage_path,
        });
      }
    }

    // Generate signed URLs in a single batched call (bucket is private)
    const allPaths = Array.from(coverByProp.values())
      .map((c) => c.path)
      .filter(Boolean);
    const signed = await signMany(allPaths);
    const signedByProp = new Map<string, string>();
    for (const [propId, cover] of coverByProp.entries()) {
      const url = signed.get(cover.path);
      if (url) signedByProp.set(propId, url);
    }

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
  full_url: string;
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
  amenities: { slug: string; label: string; category: string }[];
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

    setResponseHeader(
      "cache-control",
      "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
    );

    // Fetch property and site setting in parallel (setting doesn't need prop.id)
    const today = new Date().toISOString().slice(0, 10);
    const [propRes, settingRes] = await Promise.all([
      supabaseAdmin
        .from("properties")
        .select("*")
        .eq("slug", data.slug)
        .eq("status", "active")
        .maybeSingle(),
      supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("key", "block_on_request")
        .maybeSingle(),
    ]);

    if (propRes.error) throw new Error(propRes.error.message);
    const prop = propRes.data;
    if (!prop) throw notFound();

    const blockOnRequest = settingRes.data?.value === "true";
    const blockingStatuses = blockOnRequest
      ? ["pending", "confirmed"]
      : ["confirmed"];

    // Photos + blocks + reservations all in parallel (all need prop.id)
    const [photosRes, blocksRes, reservsRes] = await Promise.all([
      supabaseAdmin
        .from("property_photos")
        .select("id, storage_path, public_url, is_cover, sort_order")
        .eq("property_id", prop.id)
        .order("is_cover", { ascending: false })
        .order("sort_order", { ascending: true }),
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

    // Resolve amenity slugs -> label + category
    const slugList = Array.isArray(prop.amenities)
      ? (prop.amenities as unknown[]).filter(
          (s): s is string => typeof s === "string",
        )
      : [];
    let amenityRows: {
      slug: string;
      label: string;
      category: string;
      sort_cat: number;
      sort_item: number;
    }[] = [];
    if (slugList.length) {
      const { data: amData } = await supabaseAdmin
        .from("amenities")
        .select(
          "slug, name, sort_order, amenity_categories!inner(name, sort_order)",
        )
        .in("slug", slugList);
      type Row = {
        slug: string;
        name: string;
        sort_order: number;
        amenity_categories:
          | { name: string; sort_order: number }
          | { name: string; sort_order: number }[]
          | null;
      };
      const rows = (amData ?? []) as Row[];
      amenityRows = rows.map((r) => {
        const cat = Array.isArray(r.amenity_categories)
          ? r.amenity_categories[0]
          : r.amenity_categories;
        return {
          slug: r.slug,
          label: r.name,
          category: cat?.name ?? "",
          sort_cat: cat?.sort_order ?? 9999,
          sort_item: r.sort_order ?? 9999,
        };
      });
      amenityRows.sort(
        (a, b) =>
          a.sort_cat - b.sort_cat ||
          a.category.localeCompare(b.category) ||
          a.sort_item - b.sort_item ||
          a.label.localeCompare(b.label),
      );
    }
    const photoRows = photosRes.data;
    const blocks = blocksRes.data;
    const reservs = reservsRes.data;

    // Batch-sign every storage path (original + thumb) in one round trip.
    const rows = photoRows ?? [];
    const pathSet = new Set<string>();
    for (const p of rows) {
      if (p.storage_path) pathSet.add(p.storage_path);
      if (p.public_url && !p.public_url.startsWith("http")) {
        pathSet.add(p.public_url);
      }
    }
    const signed = await signMany(Array.from(pathSet));
    const photos: PropertyPhoto[] = [];
    for (const p of rows) {
      const thumbPath =
        p.public_url && !p.public_url.startsWith("http") ? p.public_url : null;
      const fullUrl = p.storage_path ? (signed.get(p.storage_path) ?? "") : "";
      const url =
        (thumbPath ? signed.get(thumbPath) : null) || fullUrl || "";
      if (url) {
        photos.push({
          id: p.id,
          url,
          full_url: fullUrl || url,
          is_cover: p.is_cover,
          sort_order: p.sort_order,
        });
      }
    }

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
      amenities: amenityRows.map((a) => ({
        slug: a.slug,
        label: a.label,
        category: a.category,
      })),
      house_rules: prop.house_rules,
      photos,
      blocked_ranges,
      high_season_dates: Array.isArray(prop.high_season_dates)
        ? (prop.high_season_dates as { start: string; end: string }[])
        : [],
      block_on_request: blockOnRequest,
    };
  });

// ============================================================
// getSuggestedProperties — sugestões na página de detalhe
// ============================================================

const suggestInputSchema = z.object({
  excludeId: z.string().uuid(),
  checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  guests: z.number().int().min(1).max(30).optional(),
});

export const getSuggestedProperties = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => suggestInputSchema.parse(input))
  .handler(async ({ data }): Promise<{ properties: PropertyListItem[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    setResponseHeader(
      "cache-control",
      "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
    );

    let query = supabaseAdmin
      .from("properties")
      .select(
        "id, slug, name, city, max_guests, bedrooms, bathrooms, price_weekday, price_weekend, featured, tier, sort_order",
      )
      .eq("status", "active")
      .neq("id", data.excludeId);

    if (data.guests) query = query.gte("max_guests", data.guests);

    const { data: rows, error } = await query
      .order("tier", { ascending: true })
      .order("featured", { ascending: false })
      .limit(30);

    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { properties: [] };

    let candidateIds = rows.map((r) => r.id);
    const hasDateRange = Boolean(data.checkin && data.checkout);

    if (hasDateRange) {
      const checkin = data.checkin!;
      const checkout = data.checkout!;
      const [{ data: blocks }, { data: reservs }] = await Promise.all([
        supabaseAdmin
          .from("blocked_dates")
          .select("property_id")
          .in("property_id", candidateIds)
          .lt("start_date", checkout)
          .gt("end_date", checkin),
        supabaseAdmin
          .from("reservations")
          .select("property_id")
          .in("property_id", candidateIds)
          .eq("status", "confirmed")
          .lt("checkin_date", checkout)
          .gt("checkout_date", checkin),
      ]);
      const unavailable = new Set<string>();
      for (const b of blocks ?? []) unavailable.add(b.property_id);
      for (const r of reservs ?? []) unavailable.add(r.property_id);
      candidateIds = candidateIds.filter((id) => !unavailable.has(id));
    }

    // Keep ordering (tier ASC, featured DESC) but shuffle within tier+featured group
    type Row = (typeof rows)[number];
    const byId = new Map<string, Row>();
    for (const r of rows) byId.set(r.id, r);
    const filtered = candidateIds
      .map((id) => byId.get(id)!)
      .filter(Boolean);

    // Group by (tier, featured) preserving order, shuffle each group, then take 3.
    const groups = new Map<string, Row[]>();
    const groupKeys: string[] = [];
    for (const r of filtered) {
      const key = `${r.tier ?? 3}|${r.featured ? 1 : 0}`;
      if (!groups.has(key)) {
        groups.set(key, []);
        groupKeys.push(key);
      }
      groups.get(key)!.push(r);
    }
    const pick: Row[] = [];
    for (const key of groupKeys) {
      const arr = groups.get(key)!.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      for (const r of arr) {
        pick.push(r);
        if (pick.length >= 3) break;
      }
      if (pick.length >= 3) break;
    }

    if (pick.length === 0) return { properties: [] };

    const pickedIds = pick.map((r) => r.id);
    const { data: photos } = await supabaseAdmin
      .from("property_photos")
      .select("property_id, storage_path, public_url, is_cover, sort_order")
      .in("property_id", pickedIds)
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true });

    const coverByProp = new Map<string, { path: string }>();
    for (const p of photos ?? []) {
      if (!coverByProp.has(p.property_id)) {
        const thumbPath =
          p.public_url && !p.public_url.startsWith("http") ? p.public_url : null;
        coverByProp.set(p.property_id, { path: thumbPath || p.storage_path });
      }
    }
    const allPaths = Array.from(coverByProp.values())
      .map((c) => c.path)
      .filter(Boolean);
    const signed = await signMany(allPaths);
    const signedByProp = new Map<string, string>();
    for (const [propId, cover] of coverByProp.entries()) {
      const url = signed.get(cover.path);
      if (url) signedByProp.set(propId, url);
    }

    const items: PropertyListItem[] = pick.map((r) => {
      const basePrice = Math.min(Number(r.price_weekday), Number(r.price_weekend));
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
        is_available: hasDateRange ? true : null,
        estimated_total: null,
      };
    });

    return { properties: items };
  });