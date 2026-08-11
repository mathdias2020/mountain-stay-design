// Carrega a configuração de precificação de uma ou várias propriedades em
// lote (sem N+1). Server-only: usa o cliente admin.
import type {
  PricingConfig,
  FeeCalcMode,
  PetFeeMode,
} from "./engine";

export type PropertyPricingRow = {
  id: string;
  currency: string | null;
  base_price: number | string | null;
  price_weekday: number | string;
  price_weekend: number | string;
  included_guests: number | null;
  extra_guest_price: number | string | null;
  pet_fee_enabled: boolean | null;
  pet_fee_mode: string | null;
  pet_fee_amount: number | string | null;
  cleaning_fee: number | string;
  cleaning_fee_short: number | string | null;
  cleaning_fee_short_max_nights: number | null;
  min_nights_weekday: number;
  min_nights_weekend: number;
};

export const PRICING_PROPERTY_COLUMNS =
  "id, currency, base_price, price_weekday, price_weekend, included_guests, extra_guest_price, pet_fee_enabled, pet_fee_mode, pet_fee_amount, cleaning_fee, cleaning_fee_short, cleaning_fee_short_max_nights, min_nights_weekday, min_nights_weekend";

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Monta os PricingConfig de várias propriedades com 8 consultas no total. */
export async function loadPricingConfigs(
  propertyIds: string[],
  propertyRows?: PropertyPricingRow[],
): Promise<Map<string, PricingConfig>> {
  const out = new Map<string, PricingConfig>();
  if (propertyIds.length === 0) return out;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const rowsPromise = propertyRows
    ? Promise.resolve({ data: propertyRows })
    : supabaseAdmin
        .from("properties")
        .select(PRICING_PROPERTY_COLUMNS)
        .in("id", propertyIds);

  const [
    propsRes,
    weekdayRes,
    overridesRes,
    seasonalRes,
    promoRes,
    lengthRes,
    lastMinRes,
    feesRes,
    taxesRes,
  ] = await Promise.all([
    rowsPromise,
    supabaseAdmin
      .from("property_weekday_prices")
      .select("property_id, weekday, price")
      .in("property_id", propertyIds),
    supabaseAdmin
      .from("property_date_prices")
      .select("property_id, date, price, min_nights")
      .in("property_id", propertyIds),
    supabaseAdmin
      .from("property_seasonal_rules")
      .select(
        "id, property_id, name, start_date, end_date, price_fixed, adjust_percent, min_nights, max_nights, priority, active",
      )
      .in("property_id", propertyIds),
    supabaseAdmin
      .from("property_promotions")
      .select("id, property_id, name, start_date, end_date, discount_percent, active")
      .in("property_id", propertyIds),
    supabaseAdmin
      .from("property_length_discounts")
      .select("property_id, min_nights, discount_percent")
      .in("property_id", propertyIds),
    supabaseAdmin
      .from("property_lastminute_discounts")
      .select("property_id, days_before, discount_percent, active")
      .in("property_id", propertyIds),
    supabaseAdmin
      .from("property_fees")
      .select(
        "id, property_id, name, description, calc_mode, amount, active, sort_order",
      )
      .in("property_id", propertyIds),
    supabaseAdmin
      .from("property_taxes")
      .select(
        "id, property_id, name, rate_percent, fixed_amount, base_lodging, base_cleaning, base_pet, base_extra_guests, base_fees, active, sort_order",
      )
      .in("property_id", propertyIds),
  ]);

  const rows = (propsRes.data ?? []) as PropertyPricingRow[];

  for (const p of rows) {
    const basePrice = num(p.base_price) || num(p.price_weekday);
    out.set(p.id, {
      property_id: p.id,
      currency: p.currency ?? "BRL",
      base_price: basePrice,
      weekday_prices: {},
      date_overrides: [],
      seasonal_rules: [],
      promotions: [],
      length_discounts: [],
      lastminute_discounts: [],
      included_guests: Math.max(1, p.included_guests ?? 1),
      extra_guest_price: num(p.extra_guest_price),
      pet_fee_enabled: Boolean(p.pet_fee_enabled),
      pet_fee_mode: (p.pet_fee_mode ?? "per_reservation") as PetFeeMode,
      pet_fee_amount: num(p.pet_fee_amount),
      cleaning_fee: num(p.cleaning_fee),
      cleaning_fee_short:
        p.cleaning_fee_short != null ? num(p.cleaning_fee_short) : null,
      cleaning_fee_short_max_nights: p.cleaning_fee_short_max_nights ?? null,
      fees: [],
      taxes: [],
      min_nights_weekday: p.min_nights_weekday ?? 1,
      min_nights_weekend: p.min_nights_weekend ?? 1,
    });
  }

  for (const r of weekdayRes.data ?? []) {
    const c = out.get(r.property_id);
    if (c) c.weekday_prices[r.weekday] = num(r.price);
  }
  for (const r of overridesRes.data ?? []) {
    out.get(r.property_id)?.date_overrides.push({
      date: r.date,
      price: r.price != null ? num(r.price) : null,
      min_nights: r.min_nights ?? null,
    });
  }
  for (const r of seasonalRes.data ?? []) {
    out.get(r.property_id)?.seasonal_rules.push({
      id: r.id,
      name: r.name,
      start_date: r.start_date,
      end_date: r.end_date,
      price_fixed: r.price_fixed != null ? num(r.price_fixed) : null,
      adjust_percent: r.adjust_percent != null ? num(r.adjust_percent) : null,
      min_nights: r.min_nights ?? null,
      max_nights: r.max_nights ?? null,
      priority: r.priority ?? 0,
      active: r.active,
    });
  }
  for (const r of promoRes.data ?? []) {
    out.get(r.property_id)?.promotions.push({
      id: r.id,
      name: r.name,
      start_date: r.start_date,
      end_date: r.end_date,
      discount_percent: num(r.discount_percent),
      active: r.active,
    });
  }
  for (const r of lengthRes.data ?? []) {
    out.get(r.property_id)?.length_discounts.push({
      min_nights: r.min_nights,
      discount_percent: num(r.discount_percent),
    });
  }
  for (const r of lastMinRes.data ?? []) {
    out.get(r.property_id)?.lastminute_discounts.push({
      days_before: r.days_before,
      discount_percent: num(r.discount_percent),
      active: r.active,
    });
  }
  for (const r of feesRes.data ?? []) {
    out.get(r.property_id)?.fees.push({
      id: r.id,
      name: r.name,
      description: r.description,
      calc_mode: r.calc_mode as FeeCalcMode,
      amount: num(r.amount),
      active: r.active,
      sort_order: r.sort_order ?? 0,
    });
  }
  for (const r of taxesRes.data ?? []) {
    out.get(r.property_id)?.taxes.push({
      id: r.id,
      name: r.name,
      rate_percent: r.rate_percent != null ? num(r.rate_percent) : null,
      fixed_amount: r.fixed_amount != null ? num(r.fixed_amount) : null,
      base_lodging: r.base_lodging,
      base_cleaning: r.base_cleaning,
      base_pet: r.base_pet,
      base_extra_guests: r.base_extra_guests,
      base_fees: r.base_fees,
      active: r.active,
      sort_order: r.sort_order ?? 0,
    });
  }

  return out;
}

export async function loadPricingConfig(
  propertyId: string,
): Promise<PricingConfig | null> {
  const map = await loadPricingConfigs([propertyId]);
  return map.get(propertyId) ?? null;
}
