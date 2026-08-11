import { describe, it, expect } from "vitest";
import { calculateQuote, type PricingConfig } from "./engine";

const base = (over: Partial<PricingConfig> = {}): PricingConfig => ({
  property_id: "p1",
  currency: "BRL",
  base_price: 500,
  weekday_prices: {},
  date_overrides: [],
  seasonal_rules: [],
  promotions: [],
  length_discounts: [],
  lastminute_discounts: [],
  included_guests: 4,
  extra_guest_price: 0,
  pet_fee_enabled: false,
  pet_fee_mode: "per_reservation",
  pet_fee_amount: 0,
  cleaning_fee: 0,
  cleaning_fee_short: null,
  cleaning_fee_short_max_nights: null,
  fees: [],
  taxes: [],
  min_nights_weekday: 1,
  min_nights_weekend: 1,
  ...over,
});

const seasonal = (o: Partial<PricingConfig["seasonal_rules"][number]>) => ({
  id: "s1",
  name: "Regra",
  start_date: "2026-01-01",
  end_date: "2026-01-31",
  price_fixed: null,
  adjust_percent: null,
  min_nights: null,
  max_nights: null,
  priority: 0,
  active: true,
  ...o,
});

describe("motor de precificação", () => {
  it("preço-base: 3 noites × 500 = 1500", () => {
    const q = calculateQuote(base(), {
      checkin: "2026-03-09",
      checkout: "2026-03-12",
      guests: 2,
      bookingDate: "2026-01-01",
    });
    expect(q.nights).toBe(3);
    expect(q.total).toBe(1500);
  });

  it("preço por dia da semana (sex/sáb 650, dom 500)", () => {
    // 2026-03-13 = sexta, 14 = sábado, 15 = domingo
    const q = calculateQuote(
      base({ weekday_prices: { 5: 650, 6: 650 } }),
      { checkin: "2026-03-13", checkout: "2026-03-16", guests: 2, bookingDate: "2026-01-01" },
    );
    expect(q.nightsDetail.map((n) => n.finalNightPrice)).toEqual([650, 650, 500]);
    expect(q.total).toBe(1800);
  });

  it("override manual vence o preço-base", () => {
    const q = calculateQuote(
      base({ date_overrides: [{ date: "2026-12-31", price: 1500, min_nights: null }] }),
      { checkin: "2026-12-31", checkout: "2027-01-01", guests: 2, bookingDate: "2026-01-01" },
    );
    expect(q.total).toBe(1500);
  });

  it("override vence a regra sazonal", () => {
    const q = calculateQuote(
      base({
        seasonal_rules: [
          seasonal({ start_date: "2026-01-10", end_date: "2026-01-20", price_fixed: 1000 }),
        ],
        date_overrides: [{ date: "2026-01-15", price: 1300, min_nights: null }],
      }),
      { checkin: "2026-01-15", checkout: "2026-01-16", guests: 2, bookingDate: "2026-01-01" },
    );
    expect(q.total).toBe(1300);
  });

  it("regra sazonal percentual (+80%)", () => {
    const q = calculateQuote(
      base({
        seasonal_rules: [
          seasonal({ start_date: "2026-02-13", end_date: "2026-02-18", adjust_percent: 80 }),
        ],
      }),
      { checkin: "2026-02-13", checkout: "2026-02-14", guests: 2, bookingDate: "2026-01-01" },
    );
    expect(q.total).toBe(900);
  });

  it("desconto por duração aplica só a maior faixa", () => {
    const q = calculateQuote(
      base({
        length_discounts: [
          { min_nights: 3, discount_percent: 5 },
          { min_nights: 5, discount_percent: 10 },
          { min_nights: 7, discount_percent: 15 },
          { min_nights: 14, discount_percent: 20 },
        ],
      }),
      { checkin: "2026-03-02", checkout: "2026-03-09", guests: 2, bookingDate: "2026-01-01" },
    );
    expect(q.lodgingSubtotal).toBe(3500);
    expect(q.discounts).toHaveLength(1);
    expect(q.discounts[0]!.percentage).toBe(15);
    expect(q.total).toBe(2975);
  });

  it("última hora: 1 dia antes = 25%", () => {
    const q = calculateQuote(
      base({
        lastminute_discounts: [
          { days_before: 7, discount_percent: 10, active: true },
          { days_before: 3, discount_percent: 15, active: true },
          { days_before: 1, discount_percent: 25, active: true },
        ],
      }),
      { checkin: "2026-03-10", checkout: "2026-03-11", guests: 2, bookingDate: "2026-03-09" },
    );
    expect(q.discounts).toHaveLength(1);
    expect(q.discounts[0]!.percentage).toBe(25);
    expect(q.total).toBe(375);
  });

  it("limpeza reduzida para estadias curtas", () => {
    const cfg = base({
      cleaning_fee: 200,
      cleaning_fee_short: 120,
      cleaning_fee_short_max_nights: 2,
    });
    const curta = calculateQuote(cfg, {
      checkin: "2026-03-02", checkout: "2026-03-04", guests: 2, bookingDate: "2026-01-01",
    });
    const longa = calculateQuote(cfg, {
      checkin: "2026-03-02", checkout: "2026-03-05", guests: 2, bookingDate: "2026-01-01",
    });
    expect(curta.cleaningFee).toBe(120);
    expect(longa.cleaningFee).toBe(200);
  });

  it("hóspede adicional: inclui 4, reserva 6, R$80, 5 noites = 800", () => {
    const q = calculateQuote(
      base({ included_guests: 4, extra_guest_price: 80 }),
      { checkin: "2026-03-02", checkout: "2026-03-07", guests: 6, bookingDate: "2026-01-01" },
    );
    expect(q.extraGuests.amount).toBe(800);
  });

  it("pet: 2 pets × R$40 × 3 noites = 240", () => {
    const q = calculateQuote(
      base({ pet_fee_enabled: true, pet_fee_mode: "per_pet_night", pet_fee_amount: 40 }),
      { checkin: "2026-03-02", checkout: "2026-03-05", guests: 2, pets: 2, bookingDate: "2026-01-01" },
    );
    expect(q.petFee.amount).toBe(240);
  });

  it("taxa percentual sobre hospedagem: 8% de 2000 = 160", () => {
    const q = calculateQuote(
      base({
        base_price: 500,
        fees: [
          {
            id: "f1",
            name: "Taxa administrativa",
            description: null,
            calc_mode: "percent_of_lodging",
            amount: 8,
            active: true,
            sort_order: 0,
          },
        ],
      }),
      { checkin: "2026-03-02", checkout: "2026-03-06", guests: 2, bookingDate: "2026-01-01" },
    );
    expect(q.lodgingAfterDiscounts).toBe(2000);
    expect(q.feesTotal).toBe(160);
    expect(q.total).toBe(2160);
  });

  it("imposto percentual sobre hospedagem + limpeza", () => {
    const q = calculateQuote(
      base({
        cleaning_fee: 180,
        taxes: [
          {
            id: "t1",
            name: "ISS",
            rate_percent: 5,
            fixed_amount: null,
            base_lodging: true,
            base_cleaning: true,
            base_pet: false,
            base_extra_guests: false,
            base_fees: false,
            active: true,
            sort_order: 0,
          },
        ],
      }),
      { checkin: "2026-03-02", checkout: "2026-03-04", guests: 2, bookingDate: "2026-01-01" },
    );
    expect(q.subtotal).toBe(1180);
    expect(q.taxTotal).toBe(59);
    expect(q.total).toBe(1239);
  });

  it("promoção por período coexiste com desconto por duração", () => {
    const q = calculateQuote(
      base({
        length_discounts: [{ min_nights: 3, discount_percent: 10 }],
        promotions: [
          {
            id: "pr1",
            name: "Setembro",
            start_date: "2026-09-15",
            end_date: "2026-09-30",
            discount_percent: 20,
            active: true,
          },
        ],
      }),
      { checkin: "2026-09-15", checkout: "2026-09-18", guests: 2, bookingDate: "2026-01-01" },
    );
    // 3 × 500 = 1500; duração 10% = 150; promoção 20% = 300
    expect(q.discountTotal).toBe(450);
    expect(q.total).toBe(1050);
  });

  it("estadia mínima vem da regra sazonal quando existe", () => {
    const q = calculateQuote(
      base({
        seasonal_rules: [
          seasonal({
            name: "Réveillon",
            start_date: "2026-12-27",
            end_date: "2027-01-03",
            price_fixed: 1200,
            min_nights: 5,
          }),
        ],
      }),
      { checkin: "2026-12-28", checkout: "2026-12-30", guests: 2, bookingDate: "2026-01-01" },
    );
    expect(q.minNightsRequired).toBe(5);
    expect(q.nightsDetail[0]!.finalNightPrice).toBe(1200);
  });

  it("mesmo input retorna sempre o mesmo resultado", () => {
    const cfg = base({ weekday_prices: { 5: 650 }, cleaning_fee: 180 });
    const inp = { checkin: "2026-04-10", checkout: "2026-04-14", guests: 3, pets: 0, bookingDate: "2026-01-01" };
    expect(calculateQuote(cfg, inp)).toEqual(calculateQuote(cfg, inp));
  });
});
