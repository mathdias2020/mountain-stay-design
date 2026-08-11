// ============================================================
// Motor único de precificação — Rota In Stay
// Puro (sem I/O), determinístico, usado no servidor e nos testes.
// Datas sempre como string "YYYY-MM-DD" (date puro, sem timezone).
// Valores em reais com arredondamento para 2 casas em cada etapa.
// ============================================================

export type PetFeeMode =
  | "per_reservation"
  | "per_night"
  | "per_pet"
  | "per_pet_night";

export type FeeCalcMode =
  | "fixed_per_reservation"
  | "per_night"
  | "per_guest"
  | "per_guest_night"
  | "per_pet"
  | "per_pet_night"
  | "percent_of_lodging";

export type SeasonalRule = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  price_fixed: number | null;
  adjust_percent: number | null;
  min_nights: number | null;
  max_nights: number | null;
  priority: number;
  active: boolean;
};

export type Promotion = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  discount_percent: number;
  active: boolean;
};

export type DateOverride = {
  date: string;
  price: number | null;
  min_nights: number | null;
};

export type LengthDiscount = { min_nights: number; discount_percent: number };
export type LastMinuteDiscount = {
  days_before: number;
  discount_percent: number;
  active: boolean;
};

export type ExtraFee = {
  id: string;
  name: string;
  description: string | null;
  calc_mode: FeeCalcMode;
  amount: number;
  active: boolean;
  sort_order: number;
};

export type TaxRule = {
  id: string;
  name: string;
  rate_percent: number | null;
  fixed_amount: number | null;
  base_lodging: boolean;
  base_cleaning: boolean;
  base_pet: boolean;
  base_extra_guests: boolean;
  base_fees: boolean;
  active: boolean;
  sort_order: number;
};

export type PricingConfig = {
  property_id: string;
  currency: string;
  base_price: number;
  weekday_prices: Partial<Record<number, number>>; // 0=dom ... 6=sáb
  date_overrides: DateOverride[];
  seasonal_rules: SeasonalRule[];
  promotions: Promotion[];
  length_discounts: LengthDiscount[];
  lastminute_discounts: LastMinuteDiscount[];
  included_guests: number;
  extra_guest_price: number;
  pet_fee_enabled: boolean;
  pet_fee_mode: PetFeeMode;
  pet_fee_amount: number;
  cleaning_fee: number;
  cleaning_fee_short: number | null;
  cleaning_fee_short_max_nights: number | null;
  fees: ExtraFee[];
  taxes: TaxRule[];
  min_nights_weekday: number;
  min_nights_weekend: number;
};

export type NightDetail = {
  date: string;
  basePrice: number;
  weekdayPrice: number | null;
  seasonalPrice: number | null;
  seasonalRule: string | null;
  manualOverride: number | null;
  finalNightPrice: number;
};

export type QuoteDiscount = {
  type: "length_of_stay" | "last_minute" | "promotion";
  label: string;
  percentage: number;
  amount: number;
};

export type QuoteLine = { label: string; amount: number; detail?: string };

export type PriceQuote = {
  currency: string;
  nights: number;
  nightsDetail: NightDetail[];
  lodgingSubtotal: number;
  discounts: QuoteDiscount[];
  discountTotal: number;
  lodgingAfterDiscounts: number;
  extraGuests: { count: number; pricePerNight: number; amount: number };
  petFee: { amount: number; label: string | null };
  cleaningFee: number;
  fees: QuoteLine[];
  feesTotal: number;
  subtotal: number;
  taxes: QuoteLine[];
  taxTotal: number;
  total: number;
  minNightsRequired: number;
  trace: string[];
};

// ----------------------- datas -----------------------

const DAY_MS = 86_400_000;

/** "YYYY-MM-DD" -> timestamp UTC (meia-noite), sem influência de timezone local. */
export function dateKeyToUtc(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y!, (m ?? 1) - 1, d ?? 1);
}

export function utcToDateKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export function addDaysKey(key: string, days: number): string {
  return utcToDateKey(dateKeyToUtc(key) + days * DAY_MS);
}

export function diffNights(checkin: string, checkout: string): number {
  return Math.round((dateKeyToUtc(checkout) - dateKeyToUtc(checkin)) / DAY_MS);
}

/** 0=domingo ... 6=sábado */
export function weekdayOf(key: string): number {
  return new Date(dateKeyToUtc(key)).getUTCDay();
}

/** Lista as noites de uma reserva: check-in incluído, check-out excluído. */
export function listNights(checkin: string, checkout: string): string[] {
  const out: string[] = [];
  const n = diffNights(checkin, checkout);
  for (let i = 0; i < n; i++) out.push(addDaysKey(checkin, i));
  return out;
}

/** Data de hoje no fuso de Brasília (America/Sao_Paulo, UTC-3). */
export function todayInBrasilia(now: Date = new Date()): string {
  return utcToDateKey(now.getTime() - 3 * 60 * 60 * 1000);
}

// ----------------------- dinheiro -----------------------

export function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

function pct(value: number, percent: number): number {
  return round2((value * percent) / 100);
}

// ----------------------- regras por noite -----------------------

function seasonalRuleFor(
  night: string,
  rules: SeasonalRule[],
): SeasonalRule | null {
  const matches = rules.filter(
    (r) => r.active && night >= r.start_date && night <= r.end_date,
  );
  if (matches.length === 0) return null;
  // precedência explícita: maior prioridade, depois período mais curto, depois id
  matches.sort(
    (a, b) =>
      b.priority - a.priority ||
      diffNights(a.start_date, a.end_date) -
        diffNights(b.start_date, b.end_date) ||
      a.id.localeCompare(b.id),
  );
  return matches[0]!;
}

function promotionFor(night: string, promos: Promotion[]): Promotion | null {
  const matches = promos.filter(
    (p) => p.active && night >= p.start_date && night <= p.end_date,
  );
  if (matches.length === 0) return null;
  matches.sort(
    (a, b) => b.discount_percent - a.discount_percent || a.id.localeCompare(b.id),
  );
  return matches[0]!;
}

// ----------------------- motor -----------------------

export type QuoteInput = {
  checkin: string;
  checkout: string;
  guests: number;
  pets?: number;
  /** Data da reserva (hoje) — usada no desconto de última hora. */
  bookingDate?: string;
};

export function calculateQuote(
  config: PricingConfig,
  input: QuoteInput,
): PriceQuote {
  const trace: string[] = [];
  const guests = Math.max(1, Math.floor(input.guests || 1));
  const pets = Math.max(0, Math.floor(input.pets ?? 0));
  const bookingDate = input.bookingDate ?? todayInBrasilia();

  const nightKeys = listNights(input.checkin, input.checkout);
  const nights = nightKeys.length;
  if (nights <= 0) throw new Error("Período inválido: check-out deve ser depois do check-in.");

  const overrideByDate = new Map<string, DateOverride>();
  for (const o of config.date_overrides) overrideByDate.set(o.date, o);

  // 1..4 — preço de cada noite
  const nightsDetail: NightDetail[] = [];
  let lodgingSubtotal = 0;
  let minNightsRequired = 0;

  for (const key of nightKeys) {
    const basePrice = round2(config.base_price);
    const wd = config.weekday_prices[weekdayOf(key)];
    const weekdayPrice = wd != null ? round2(wd) : null;
    let price = weekdayPrice ?? basePrice;

    const rule = seasonalRuleFor(key, config.seasonal_rules);
    let seasonalPrice: number | null = null;
    if (rule) {
      if (rule.price_fixed != null) seasonalPrice = round2(rule.price_fixed);
      else if (rule.adjust_percent != null) {
        seasonalPrice = round2(price + pct(price, rule.adjust_percent));
      }
      if (seasonalPrice != null) price = seasonalPrice;
      if (rule.min_nights) minNightsRequired = Math.max(minNightsRequired, rule.min_nights);
    }

    const ov = overrideByDate.get(key);
    const manualOverride = ov?.price != null ? round2(ov.price) : null;
    if (manualOverride != null) price = manualOverride;
    if (ov?.min_nights) minNightsRequired = Math.max(minNightsRequired, ov.min_nights);

    nightsDetail.push({
      date: key,
      basePrice,
      weekdayPrice,
      seasonalPrice,
      seasonalRule: rule?.name ?? null,
      manualOverride,
      finalNightPrice: price,
    });
    lodgingSubtotal = round2(lodgingSubtotal + price);
  }

  // estadia mínima: sazonal/override vencem; senão os campos da propriedade
  if (minNightsRequired === 0) {
    const hasWeekendNight = nightKeys.some((k) => {
      const w = weekdayOf(k);
      return w === 5 || w === 6;
    });
    minNightsRequired = hasWeekendNight
      ? config.min_nights_weekend
      : config.min_nights_weekday;
  }

  trace.push(`Hospedagem: ${nights} noite(s) = ${lodgingSubtotal}`);

  // 5 — desconto por duração (apenas a maior faixa aplicável)
  const discounts: QuoteDiscount[] = [];
  const lengthTier = config.length_discounts
    .filter((d) => nights >= d.min_nights)
    .sort((a, b) => b.min_nights - a.min_nights)[0];
  if (lengthTier) {
    const amount = pct(lodgingSubtotal, lengthTier.discount_percent);
    discounts.push({
      type: "length_of_stay",
      label: `Desconto por duração (${lengthTier.min_nights}+ noites)`,
      percentage: lengthTier.discount_percent,
      amount,
    });
    trace.push(`Desconto duração ${lengthTier.discount_percent}% = -${amount}`);
  }

  // 6 — última hora (apenas a maior faixa aplicável)
  const daysToCheckin = diffNights(bookingDate, input.checkin);
  const lmTier = config.lastminute_discounts
    .filter((d) => d.active && daysToCheckin >= 0 && daysToCheckin <= d.days_before)
    .sort((a, b) => b.discount_percent - a.discount_percent)[0];
  if (lmTier) {
    const amount = pct(lodgingSubtotal, lmTier.discount_percent);
    discounts.push({
      type: "last_minute",
      label: `Desconto de última hora (até ${lmTier.days_before} dia(s) antes)`,
      percentage: lmTier.discount_percent,
      amount,
    });
    trace.push(`Última hora ${lmTier.discount_percent}% = -${amount}`);
  }

  // 7 — promoção (por noite dentro do período promocional)
  const promoByName = new Map<string, { percent: number; amount: number }>();
  for (const nd of nightsDetail) {
    const promo = promotionFor(nd.date, config.promotions);
    if (!promo) continue;
    const amount = pct(nd.finalNightPrice, promo.discount_percent);
    const cur = promoByName.get(promo.name);
    promoByName.set(promo.name, {
      percent: promo.discount_percent,
      amount: round2((cur?.amount ?? 0) + amount),
    });
  }
  for (const [name, v] of promoByName) {
    discounts.push({
      type: "promotion",
      label: `Promoção ${name}`,
      percentage: v.percent,
      amount: v.amount,
    });
    trace.push(`Promoção ${name} ${v.percent}% = -${v.amount}`);
  }

  const discountTotal = round2(discounts.reduce((s, d) => s + d.amount, 0));
  const lodgingAfterDiscounts = round2(Math.max(0, lodgingSubtotal - discountTotal));

  // 8 — hóspedes adicionais
  const extraGuestCount = Math.max(0, guests - config.included_guests);
  const extraGuestsAmount = round2(
    extraGuestCount * round2(config.extra_guest_price) * nights,
  );
  if (extraGuestsAmount > 0) {
    trace.push(
      `${extraGuestCount} hóspede(s) adicional × ${config.extra_guest_price} × ${nights} = ${extraGuestsAmount}`,
    );
  }

  // 9 — pet
  let petAmount = 0;
  let petLabel: string | null = null;
  if (config.pet_fee_enabled && pets > 0 && config.pet_fee_amount > 0) {
    const v = round2(config.pet_fee_amount);
    switch (config.pet_fee_mode) {
      case "per_reservation":
        petAmount = v;
        petLabel = "Taxa de pet (por reserva)";
        break;
      case "per_night":
        petAmount = round2(v * nights);
        petLabel = "Taxa de pet (por noite)";
        break;
      case "per_pet":
        petAmount = round2(v * pets);
        petLabel = `Taxa de pet (${pets} pet)`;
        break;
      case "per_pet_night":
        petAmount = round2(v * pets * nights);
        petLabel = `Taxa de pet (${pets} pet × ${nights} noite(s))`;
        break;
    }
    trace.push(`Pet: ${petLabel} = ${petAmount}`);
  }

  // 10 — limpeza (valor reduzido para estadias curtas)
  let cleaningFee = round2(config.cleaning_fee);
  if (
    config.cleaning_fee_short != null &&
    config.cleaning_fee_short_max_nights != null &&
    nights <= config.cleaning_fee_short_max_nights
  ) {
    cleaningFee = round2(config.cleaning_fee_short);
    trace.push(`Limpeza reduzida (até ${config.cleaning_fee_short_max_nights} noites) = ${cleaningFee}`);
  }

  // 11 — taxas adicionais
  const fees: QuoteLine[] = [];
  for (const f of [...config.fees].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  )) {
    if (!f.active || f.amount <= 0) continue;
    const v = round2(f.amount);
    let amount = 0;
    switch (f.calc_mode) {
      case "fixed_per_reservation":
        amount = v;
        break;
      case "per_night":
        amount = round2(v * nights);
        break;
      case "per_guest":
        amount = round2(v * guests);
        break;
      case "per_guest_night":
        amount = round2(v * guests * nights);
        break;
      case "per_pet":
        amount = round2(v * pets);
        break;
      case "per_pet_night":
        amount = round2(v * pets * nights);
        break;
      case "percent_of_lodging":
        amount = pct(lodgingAfterDiscounts, v);
        break;
    }
    if (amount > 0) {
      fees.push({ label: f.name, amount, detail: f.description ?? undefined });
    }
  }
  const feesTotal = round2(fees.reduce((s, f) => s + f.amount, 0));

  const subtotal = round2(
    lodgingAfterDiscounts + extraGuestsAmount + petAmount + cleaningFee + feesTotal,
  );

  // 12 — impostos
  const taxes: QuoteLine[] = [];
  for (const t of [...config.taxes].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  )) {
    if (!t.active) continue;
    let amount = 0;
    if (t.rate_percent != null && t.rate_percent > 0) {
      let base = 0;
      if (t.base_lodging) base += lodgingAfterDiscounts;
      if (t.base_cleaning) base += cleaningFee;
      if (t.base_pet) base += petAmount;
      if (t.base_extra_guests) base += extraGuestsAmount;
      if (t.base_fees) base += feesTotal;
      amount = pct(round2(base), t.rate_percent);
    }
    if (t.fixed_amount != null && t.fixed_amount > 0) {
      amount = round2(amount + t.fixed_amount);
    }
    if (amount > 0) taxes.push({ label: t.name, amount });
  }
  const taxTotal = round2(taxes.reduce((s, t) => s + t.amount, 0));

  const total = round2(subtotal + taxTotal);
  trace.push(`Subtotal ${subtotal} + impostos ${taxTotal} = total ${total}`);

  return {
    currency: config.currency || "BRL",
    nights,
    nightsDetail,
    lodgingSubtotal,
    discounts,
    discountTotal,
    lodgingAfterDiscounts,
    extraGuests: {
      count: extraGuestCount,
      pricePerNight: round2(config.extra_guest_price),
      amount: extraGuestsAmount,
    },
    petFee: { amount: petAmount, label: petLabel },
    cleaningFee,
    fees,
    feesTotal,
    subtotal,
    taxes,
    taxTotal,
    total,
    minNightsRequired,
    trace,
  };
}

/** Menor preço por noite dos próximos `days` dias — usado no "a partir de". */
export function lowestNightlyPrice(
  config: PricingConfig,
  fromDate: string,
  days = 180,
): number {
  let min = Infinity;
  for (let i = 0; i < days; i++) {
    const key = addDaysKey(fromDate, i);
    const wd = config.weekday_prices[weekdayOf(key)];
    let price = wd ?? config.base_price;
    const rule = seasonalRuleFor(key, config.seasonal_rules);
    if (rule?.price_fixed != null) price = rule.price_fixed;
    else if (rule?.adjust_percent != null) price = price + pct(price, rule.adjust_percent);
    const ov = config.date_overrides.find((o) => o.date === key);
    if (ov?.price != null) price = ov.price;
    if (price < min) min = price;
  }
  return round2(min === Infinity ? config.base_price : min);
}

export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Expande ranges bloqueados (end exclusivo = checkout) em Set<YYYY-MM-DD>. */
export function expandBlockedDates(
  ranges: { start: string; end: string }[],
): Set<string> {
  const set = new Set<string>();
  for (const r of ranges) for (const k of listNights(r.start, r.end)) set.add(k);
  return set;
}

export function rangeIsBlocked(
  checkin: string,
  checkout: string,
  blockedSet: Set<string>,
): boolean {
  return listNights(checkin, checkout).some((k) => blockedSet.has(k));
}
