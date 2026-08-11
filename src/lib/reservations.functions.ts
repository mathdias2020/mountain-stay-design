import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { expandBlockedDates, rangeIsBlocked } from "./pricing/engine";

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
  coupon_code: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9_-]{3,30}$/))
    .optional(),
});

export type CreateReservationInput = z.input<typeof inputSchema>;

export type CreateReservationResult = {
  reservation_id: string;
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
        "id, name, status, max_guests, parking_spots, accepts_pets",
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
    // awaiting_contract / awaiting_balance sempre bloqueiam (sinal pago)
    const blockingStatuses = blockOnRequest
      ? ["pending", "awaiting_contract", "awaiting_balance", "confirmed"]
      : ["awaiting_contract", "awaiting_balance", "confirmed"];

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
    if (rangeIsBlocked(data.checkin_date, data.checkout_date, blockedSet)) {
      throw new Error("Período indisponível. Selecione outras datas.");
    }

    // 5. Recalcular preço com o motor oficial (NÃO confiar no cliente)
    const { loadPricingConfig } = await import("@/lib/pricing/loader.server");
    const { calculateQuote } = await import("@/lib/pricing/engine");
    const config = await loadPricingConfig(prop.id);
    if (!config) throw new Error("Precificação não encontrada.");
    const quote = calculateQuote(config, {
      checkin: data.checkin_date,
      checkout: data.checkout_date,
      guests: totalGuests,
      pets: data.num_pets,
    });
    if (quote.nights === 0) throw new Error("Período inválido.");
    if (quote.nights < quote.minNightsRequired) {
      throw new Error(
        `Esta propriedade exige mínimo de ${quote.minNightsRequired} noites para o período selecionado.`,
      );
    }

    // 5b. Validar cupom (servidor é a fonte da verdade)
    let couponRow: {
      id: string;
      code: string;
      discount_percent: number;
      uses_count: number;
    } | null = null;
    let discountAmount = 0;
    let finalTotal = quote.total;
    if (data.coupon_code) {
      const { data: c, error: cErr } = await supabaseAdmin
        .from("coupons")
        .select("id, code, discount_percent, active, expires_at, max_uses, uses_count")
        .eq("code", data.coupon_code)
        .maybeSingle();
      if (cErr) throw new Error(cErr.message);
      if (!c) throw new Error("Cupom não encontrado.");
      if (!c.active) throw new Error("Cupom inativo.");
      if (c.expires_at && new Date(c.expires_at) < new Date()) {
        throw new Error("Cupom expirado.");
      }
      if (c.max_uses != null && c.uses_count >= c.max_uses) {
        throw new Error("Cupom esgotado.");
      }
      const pct = Number(c.discount_percent);
      discountAmount = Math.round(quote.total * pct) / 100;
      finalTotal = Math.max(0, quote.total - discountAmount);
      couponRow = {
        id: c.id,
        code: c.code,
        discount_percent: pct,
        uses_count: c.uses_count,
      };
    }

    // 5c. Sinal (50%) e saldo (50%); vencimento do saldo = checkin - 5 dias
    const depositAmount = Math.round(finalTotal * 50) / 100;
    const balanceAmount = Math.round((finalTotal - depositAmount) * 100) / 100;
    const { addDaysKey } = await import("@/lib/pricing/engine");
    const dueDateIso = addDaysKey(data.checkin_date, -5);

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
        total_nights: quote.nights,
        price_breakdown: {
          engine_version: 2,
          quote: JSON.parse(JSON.stringify(quote)),
          subtotal: quote.total,
          coupon_code: couponRow?.code ?? null,
          coupon_discount_percent: couponRow?.discount_percent ?? null,
          coupon_discount_amount: discountAmount || null,
          total: finalTotal,
        },
        total_price: finalTotal,
        deposit_amount: depositAmount,
        balance_amount: balanceAmount,
        balance_due_date: dueDateIso,
        coupon_code: couponRow?.code ?? null,
        coupon_discount_percent: couponRow?.discount_percent ?? null,
        coupon_discount_amount: discountAmount || null,
        status: "pending",
        guest_message: data.guest_message ?? null,
        terms_accepted: true,
      })
      .select("id, reservation_code")
      .single();
    if (insErr) throw new Error(insErr.message);

    // 6b. Incrementar uso do cupom (best-effort)
    if (couponRow) {
      await supabaseAdmin
        .from("coupons")
        .update({ uses_count: couponRow.uses_count + 1 })
        .eq("id", couponRow.id);
    }

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
      reservation_id: created.id,
      reservation_code: created.reservation_code,
      admin_whatsapp: waSetting?.value ?? null,
    };
  });