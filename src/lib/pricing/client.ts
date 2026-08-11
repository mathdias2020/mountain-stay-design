// Leitura da configuração de precificação no navegador (painel admin).
// Usa o cliente do usuário: as políticas liberam apenas administradores.
import { supabase } from "@/integrations/supabase/client";
import type { PricingConfig, FeeCalcMode, PetFeeMode } from "./engine";

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export async function loadPricingConfigClient(
  propertyId: string,
): Promise<PricingConfig> {
  const [
    prop,
    weekday,
    overrides,
    seasonal,
    promos,
    lengthD,
    lastMin,
    fees,
    taxes,
  ] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id, currency, base_price, price_weekday, price_weekend, included_guests, extra_guest_price, pet_fee_enabled, pet_fee_mode, pet_fee_amount, cleaning_fee, cleaning_fee_short, cleaning_fee_short_max_nights, min_nights_weekday, min_nights_weekend",
      )
      .eq("id", propertyId)
      .single(),
    supabase
      .from("property_weekday_prices")
      .select("weekday, price")
      .eq("property_id", propertyId),
    supabase
      .from("property_date_prices")
      .select("date, price, min_nights")
      .eq("property_id", propertyId),
    supabase
      .from("property_seasonal_rules")
      .select("*")
      .eq("property_id", propertyId)
      .order("start_date"),
    supabase
      .from("property_promotions")
      .select("*")
      .eq("property_id", propertyId)
      .order("start_date"),
    supabase
      .from("property_length_discounts")
      .select("min_nights, discount_percent")
      .eq("property_id", propertyId)
      .order("min_nights"),
    supabase
      .from("property_lastminute_discounts")
      .select("days_before, discount_percent, active")
      .eq("property_id", propertyId)
      .order("days_before", { ascending: false }),
    supabase
      .from("property_fees")
      .select("*")
      .eq("property_id", propertyId)
      .order("sort_order"),
    supabase
      .from("property_taxes")
      .select("*")
      .eq("property_id", propertyId)
      .order("sort_order"),
  ]);

  if (prop.error) throw prop.error;
  const p = prop.data;

  const weekday_prices: Partial<Record<number, number>> = {};
  for (const r of weekday.data ?? []) weekday_prices[r.weekday] = num(r.price);

  return {
    property_id: p.id,
    currency: p.currency ?? "BRL",
    base_price: num(p.base_price) || num(p.price_weekday),
    weekday_prices,
    date_overrides: (overrides.data ?? []).map((r) => ({
      date: r.date,
      price: r.price != null ? num(r.price) : null,
      min_nights: r.min_nights ?? null,
    })),
    seasonal_rules: (seasonal.data ?? []).map((r) => ({
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
    })),
    promotions: (promos.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      start_date: r.start_date,
      end_date: r.end_date,
      discount_percent: num(r.discount_percent),
      active: r.active,
    })),
    length_discounts: (lengthD.data ?? []).map((r) => ({
      min_nights: r.min_nights,
      discount_percent: num(r.discount_percent),
    })),
    lastminute_discounts: (lastMin.data ?? []).map((r) => ({
      days_before: r.days_before,
      discount_percent: num(r.discount_percent),
      active: r.active,
    })),
    included_guests: Math.max(1, p.included_guests ?? 1),
    extra_guest_price: num(p.extra_guest_price),
    pet_fee_enabled: Boolean(p.pet_fee_enabled),
    pet_fee_mode: (p.pet_fee_mode ?? "per_reservation") as PetFeeMode,
    pet_fee_amount: num(p.pet_fee_amount),
    cleaning_fee: num(p.cleaning_fee),
    cleaning_fee_short:
      p.cleaning_fee_short != null ? num(p.cleaning_fee_short) : null,
    cleaning_fee_short_max_nights: p.cleaning_fee_short_max_nights ?? null,
    fees: (fees.data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      calc_mode: r.calc_mode as FeeCalcMode,
      amount: num(r.amount),
      active: r.active,
      sort_order: r.sort_order ?? 0,
    })),
    taxes: (taxes.data ?? []).map((r) => ({
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
    })),
    min_nights_weekday: p.min_nights_weekday ?? 1,
    min_nights_weekend: p.min_nights_weekend ?? 1,
  };
}
