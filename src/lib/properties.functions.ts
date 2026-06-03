import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
      .select("property_id, storage_path, public_url, is_cover, sort_order")
      .in("property_id", ids)
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true });

    const coverByProp = new Map<string, { storage_path: string; public_url: string }>();
    for (const p of photos ?? []) {
      if (!coverByProp.has(p.property_id)) {
        coverByProp.set(p.property_id, {
          storage_path: p.storage_path,
          public_url: p.public_url,
        });
      }
    }

    // Generate signed URLs (bucket is private)
    const signedByProp = new Map<string, string>();
    await Promise.all(
      Array.from(coverByProp.entries()).map(async ([propId, cover]) => {
        // Prefer stored public_url if it's already an absolute URL
        if (cover.public_url?.startsWith("http")) {
          signedByProp.set(propId, cover.public_url);
          return;
        }
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