import { addDays, differenceInCalendarDays } from "date-fns";

export type PriceBreakdown = {
  nights: number;
  weekdayNights: number;
  weekendNights: number;
  highSeasonNights: number;
  weekdayPrice: number;
  weekendPrice: number;
  highSeasonPrice: number | null;
  weekdaySubtotal: number;
  weekendSubtotal: number;
  highSeasonTotal: number;
  cleaningFee: number;
  total: number;
};

// Convenção BR: noite de sexta e sábado = "fim de semana".
function isWeekendNight(d: Date) {
  const day = d.getDay(); // 0=dom, 5=sex, 6=sab
  return day === 5 || day === 6;
}

/** Checa se a data da noite cai em alguma janela de alta temporada (intervalo inclusivo). */
function isHighSeasonNight(
  night: Date,
  ranges: { start: string; end: string }[],
): boolean {
  const key = night.toISOString().slice(0, 10);
  for (const r of ranges) {
    if (key >= r.start && key <= r.end) return true;
  }
  return false;
}

export function calculatePrice(
  checkin: Date,
  checkout: Date,
  priceWeekday: number,
  priceWeekend: number,
  cleaningFee: number,
  priceHighSeason?: number | null,
  highSeasonDates?: { start: string; end: string }[] | null,
): PriceBreakdown {
  const nights = Math.max(0, differenceInCalendarDays(checkout, checkin));
  let weekdayNights = 0;
  let weekendNights = 0;
  let highSeasonNights = 0;
  const hsRanges =
    priceHighSeason != null && Array.isArray(highSeasonDates)
      ? highSeasonDates
      : [];
  for (let i = 0; i < nights; i++) {
    const night = addDays(checkin, i);
    if (hsRanges.length > 0 && isHighSeasonNight(night, hsRanges)) {
      highSeasonNights++;
    } else if (isWeekendNight(night)) weekendNights++;
    else weekdayNights++;
  }
  const weekdaySubtotal = weekdayNights * priceWeekday;
  const weekendSubtotal = weekendNights * priceWeekend;
  const highSeasonTotal =
    highSeasonNights * (priceHighSeason ?? 0);
  const total =
    weekdaySubtotal + weekendSubtotal + highSeasonTotal + cleaningFee;
  return {
    nights,
    weekdayNights,
    weekendNights,
    highSeasonNights,
    weekdayPrice: priceWeekday,
    weekendPrice: priceWeekend,
    highSeasonPrice: priceHighSeason ?? null,
    weekdaySubtotal,
    weekendSubtotal,
    highSeasonTotal,
    cleaningFee,
    total,
  };
}

export function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Expande blocked ranges (end exclusivo = checkout) em Set<YYYY-MM-DD>. */
export function expandBlockedDates(
  ranges: { start: string; end: string }[],
): Set<string> {
  const set = new Set<string>();
  for (const r of ranges) {
    const start = new Date(r.start + "T00:00:00");
    const end = new Date(r.end + "T00:00:00");
    const days = Math.max(0, differenceInCalendarDays(end, start));
    for (let i = 0; i < days; i++) {
      set.add(addDays(start, i).toISOString().slice(0, 10));
    }
  }
  return set;
}

/** Verifica se a faixa [checkin, checkout) sobrepõe alguma data bloqueada. */
export function rangeIsBlocked(
  checkin: Date,
  checkout: Date,
  blockedSet: Set<string>,
): boolean {
  const nights = differenceInCalendarDays(checkout, checkin);
  for (let i = 0; i < nights; i++) {
    const key = addDays(checkin, i).toISOString().slice(0, 10);
    if (blockedSet.has(key)) return true;
  }
  return false;
}