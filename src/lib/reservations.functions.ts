import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { calculatePrice, expandBlockedDates, rangeIsBlocked } from "./pricing";

const HOW_FOUND = ["Instagram", "Indicação de amigo", "Google", "Outro"] as const;

const inputSchema = z.object({
  property_id: z.string().uuid(),
  checkin_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkout_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guest_name: z.string().trim().min(2).max(120),
  guest_whatsapp: z.string().regex(/^\d{11}$/, "WhatsApp inválido"),
  how_found: z.enum(HOW_FOUND).optional(),
  num_adults: z.number().int().min(1).max(30),
  num_children: z.number().int().min(0).max(10),
  num_pets: z.number().int().min(0).max(5),
  num_vehicles: z.number().int().min(0).max(20),
  guest_message: z.string().trim().max(500).optional(),
  terms_accepted: z.literal(true),
});

export type CreateReservationInput = z.input<typeof inputSchema>;

export type CreateReservationResult = {
  reservation_code: string;
  admin_whatsapp: string | null;
};

export const createReservation = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => inputSchema.parse(raw))
  .handler(async ({ data }): Promise<CreateReservationResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.checkout_date <= data.checkin_date) {
      throw new Error("checkout deve ser depois do check-in");
    }

    // 1. Buscar propriedade
    const { data: prop, error: propErr } = await supabaseAdmin
      .from("properties")
      .select(
        "id, name, status, max_guests, parking_spots, price_weekday, price_weekend, price_high_season, high_season_dates, cleaning_fee, min_nights_weekday, min_nights_weekend, accepts_pets",
      )
      .eq("id", data.property_id)
      .maybeSingle();
    if (propErr) throw new Error(propErr.message);
    if (!prop || prop.status !== "active") {
      throw new Error("Propriedade não encontrada ou indisponível.");
    }

    // 2. Validações de regras
    const totalGuests = data.num_adults + data.num_children;
    if (totalGuests > prop.max_guests) {
      throw new Error(
        `Excede o máximo de ${prop.max_guests} hóspedes desta propriedade.`,
      );
    }
    if (data.num_pets > 0 && !prop.accepts_pets) {
      throw new Error("Esta propriedade não aceita pets.");
    }
    if (prop.parking_spots === 0 && data.num_vehicles > 0) {
      throw new Error("Esta propriedade não possui estacionamento.");
    }
    if (data.num_vehicles > prop.parking_spots) {
      throw new Error(`Máximo de ${prop.parking_spots} veículos.`);
    }

    // 3. block_on_request
    const { data: setting } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "block_on_request")
      .maybeSingle();
    const blockOnRequest = setting?.value === "true";
    const blockingStatuses = blockOnRequest ? ["pending", "confirmed"] : ["confirmed"];

    // 4. Revalidar disponibilidade
    const [{ data: blocks }, { data: reservs }] = await Promise.all([
      supabaseAdmin
        .from("blocked_dates")
        .select("start_date, end_date")
        .eq("property_id", prop.id)
        .lt("start_date", data.checkout_date)
        .gt("end_date", data.checkin_date),
      supabaseAdmin
        .from("reservations")
        .select("checkin_date, checkout_date, status")
        .eq("property_id", prop.id)
        .in("status", blockingStatuses)
        .lt("checkin_date", data.checkout_date)
        .gt("checkout_date", data.checkin_date),
    ]);
    const blockedSet = expandBlockedDates([
      ...(blocks ?? []).map((b) => ({ start: b.start_date, end: b.end_date })),
      ...(reservs ?? []).map((r) => ({
        start: r.checkin_date,
        end: r.checkout_date,
      })),
    ]);
    const ci = new Date(data.checkin_date + "T00:00:00");
    const co = new Date(data.checkout_date + "T00:00:00");
    if (rangeIsBlocked(ci, co, blockedSet)) {
      throw new Error("Período indisponível. Selecione outras datas.");
    }

    // 5. Recalcular preço (NÃO confiar no cliente)
    const hsDates = Array.isArray(prop.high_season_dates)
      ? (prop.high_season_dates as { start: string; end: string }[])
      : [];
    const breakdown = calculatePrice(
      ci,
      co,
      Number(prop.price_weekday),
      Number(prop.price_weekend),
      Number(prop.cleaning_fee),
      prop.price_high_season != null ? Number(prop.price_high_season) : null,
      hsDates,
    );
    if (breakdown.nights === 0) throw new Error("Período inválido.");
    const minRequired =
      breakdown.weekendNights > 0
        ? prop.min_nights_weekend
        : prop.min_nights_weekday;
    if (breakdown.nights < minRequired) {
      throw new Error(
        `Esta propriedade exige mínimo de ${minRequired} noites para o período selecionado.`,
      );
    }

    // 6. Insert (trigger preenche reservation_code)
    const { data: created, error: insErr } = await supabaseAdmin
      .from("reservations")
      .insert({
        reservation_code: "",
        property_id: prop.id,
        guest_name: data.guest_name,
        guest_whatsapp: data.guest_whatsapp,
        guest_email: null,
        how_found: data.how_found ?? null,
        checkin_date: data.checkin_date,
        checkout_date: data.checkout_date,
        num_adults: data.num_adults,
        num_children: data.num_children,
        num_pets: data.num_pets,
        num_vehicles: data.num_vehicles,
        total_nights: breakdown.nights,
        price_breakdown: {
          weekday_nights: breakdown.weekdayNights,
          weekend_nights: breakdown.weekendNights,
          high_season_nights: breakdown.highSeasonNights,
          weekday_price: breakdown.weekdayPrice,
          weekend_price: breakdown.weekendPrice,
          high_season_price: breakdown.highSeasonPrice,
          weekday_subtotal: breakdown.weekdaySubtotal,
          weekend_subtotal: breakdown.weekendSubtotal,
          high_season_total: breakdown.highSeasonTotal,
          cleaning_fee: breakdown.cleaningFee,
          total: breakdown.total,
        },
        total_price: breakdown.total,
        status: "pending",
        guest_message: data.guest_message ?? null,
        terms_accepted: true,
      })
      .select("reservation_code")
      .single();
    if (insErr) throw new Error(insErr.message);

    // 7. Bloquear datas se configurado
    if (blockOnRequest) {
      await supabaseAdmin.from("blocked_dates").insert({
        property_id: prop.id,
        start_date: data.checkin_date,
        end_date: data.checkout_date,
        reason: `Solicitação pendente #${created.reservation_code}`,
      });
    }

    // 8. WhatsApp admin para tela de sucesso
    const { data: waSetting } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "admin_whatsapp")
      .maybeSingle();

    // TODO Fase 5+: enviar e-mail de confirmação ao guest_email

    return {
      reservation_code: created.reservation_code,
      admin_whatsapp: waSetting?.value ?? null,
    };
  });