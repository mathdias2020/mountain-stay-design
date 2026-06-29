import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calculatePrice } from "./pricing";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas administradores.");
}

/* ---------- Conflitos ---------- */

const ACTIVE_STATUSES = [
  "awaiting_contract",
  "awaiting_balance",
  "confirmed",
] as const;

export type ConflictResult = {
  reservations: Array<{
    id: string;
    reservation_code: string;
    guest_name: string;
    checkin_date: string;
    checkout_date: string;
    status: string;
  }>;
  blocks: Array<{
    id: string;
    start_date: string;
    end_date: string;
    reason: string | null;
  }>;
};

const conflictsSchema = z.object({
  propertyId: z.string().uuid(),
  checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  excludeReservationId: z.string().uuid().optional(),
  excludeBlockId: z.string().uuid().optional(),
});

export const checkReservationConflicts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => conflictsSchema.parse(raw))
  .handler(async ({ data, context }): Promise<ConflictResult> => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (data.checkout <= data.checkin) {
      throw new Error("Data fim deve ser após a data início.");
    }

    let resQuery = supabase
      .from("reservations")
      .select("id, reservation_code, guest_name, checkin_date, checkout_date, status")
      .eq("property_id", data.propertyId)
      .in("status", ACTIVE_STATUSES as unknown as string[])
      .lt("checkin_date", data.checkout)
      .gt("checkout_date", data.checkin);
    if (data.excludeReservationId) {
      resQuery = resQuery.neq("id", data.excludeReservationId);
    }

    let blkQuery = supabase
      .from("blocked_dates")
      .select("id, start_date, end_date, reason")
      .eq("property_id", data.propertyId)
      .lt("start_date", data.checkout)
      .gt("end_date", data.checkin);
    if (data.excludeBlockId) {
      blkQuery = blkQuery.neq("id", data.excludeBlockId);
    }

    const [resvs, blocks] = await Promise.all([resQuery, blkQuery]);
    if (resvs.error) throw new Error(resvs.error.message);
    if (blocks.error) throw new Error(blocks.error.message);

    return {
      reservations: resvs.data ?? [],
      blocks: blocks.data ?? [],
    };
  });

/* ---------- Reserva manual ---------- */

const manualSchema = z.object({
  property_id: z.string().uuid(),
  guest_name: z.string().trim().min(2).max(120),
  guest_whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^\d{10,15}$/, "WhatsApp inválido")),
  guest_email: z
    .string()
    .trim()
    .email()
    .max(255)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  checkin_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkout_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  num_adults: z.number().int().min(1).max(30),
  num_children: z.number().int().min(0).max(10),
  num_pets: z.number().int().min(0).max(5),
  num_vehicles: z.number().int().min(0).max(20),
  total_price: z.number().positive().max(10_000_000),
  payment_method: z.enum(["pix", "card", "cash", "transfer", "other"]),
  coupon_code: z
    .string()
    .trim()
    .transform((v) => (v ? v.toUpperCase() : ""))
    .optional(),
  mode: z.enum(["confirmed_offline", "standard_flow"]),
  admin_notes: z.string().trim().max(2000).optional(),
  force: z.boolean().optional(),
});

export type CreateManualReservationInput = z.input<typeof manualSchema>;

export const createManualReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => manualSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    if (data.checkout_date <= data.checkin_date) {
      throw new Error("Check-out deve ser depois do check-in.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Propriedade
    const { data: prop, error: propErr } = await supabaseAdmin
      .from("properties")
      .select("id, status, max_guests, parking_spots, accepts_pets")
      .eq("id", data.property_id)
      .maybeSingle();
    if (propErr) throw new Error(propErr.message);
    if (!prop) throw new Error("Propriedade não encontrada.");

    const totalGuests = data.num_adults + data.num_children;
    if (totalGuests > prop.max_guests) {
      throw new Error(
        `Excede o máximo de ${prop.max_guests} hóspedes desta propriedade.`,
      );
    }
    if (data.num_pets > 0 && !prop.accepts_pets) {
      throw new Error("Esta propriedade não aceita pets.");
    }
    if (data.num_vehicles > prop.parking_spots) {
      throw new Error(`Máximo de ${prop.parking_spots} veículos.`);
    }

    // 2. Conflitos (avisa, mas permite forçar)
    if (!data.force) {
      const [resvs, blocks] = await Promise.all([
        supabaseAdmin
          .from("reservations")
          .select("id, reservation_code, guest_name, checkin_date, checkout_date, status")
          .eq("property_id", data.property_id)
          .in("status", ACTIVE_STATUSES as unknown as string[])
          .lt("checkin_date", data.checkout_date)
          .gt("checkout_date", data.checkin_date),
        supabaseAdmin
          .from("blocked_dates")
          .select("id, start_date, end_date, reason")
          .eq("property_id", data.property_id)
          .lt("start_date", data.checkout_date)
          .gt("end_date", data.checkin_date),
      ]);
      if (resvs.error) throw new Error(resvs.error.message);
      if (blocks.error) throw new Error(blocks.error.message);
      if ((resvs.data ?? []).length > 0 || (blocks.data ?? []).length > 0) {
        const err: any = new Error("CONFLICT");
        err.code = "CONFLICT";
        err.conflicts = {
          reservations: resvs.data ?? [],
          blocks: blocks.data ?? [],
        };
        throw err;
      }
    }

    // 3. Cupom (apenas registra; não recalcula valor — admin já passou total)
    let couponCode: string | null = null;
    let couponPercent: number | null = null;
    if (data.coupon_code && data.coupon_code.length >= 3) {
      const { data: c } = await supabaseAdmin
        .from("coupons")
        .select("id, code, discount_percent, active, expires_at, max_uses, uses_count")
        .eq("code", data.coupon_code)
        .maybeSingle();
      if (c && c.active) {
        couponCode = c.code;
        couponPercent = Number(c.discount_percent);
        // best-effort: incrementa uso
        await supabaseAdmin
          .from("coupons")
          .update({ uses_count: (c.uses_count ?? 0) + 1 })
          .eq("id", c.id);
      }
    }

    // 4. Datas e valores derivados
    const ci = new Date(data.checkin_date + "T00:00:00");
    const co = new Date(data.checkout_date + "T00:00:00");
    const nights = Math.max(
      1,
      Math.round((co.getTime() - ci.getTime()) / 86400000),
    );
    const depositAmount = Math.round(data.total_price * 50) / 100;
    const balanceAmount = Math.round((data.total_price - depositAmount) * 100) / 100;
    const dueMs = ci.getTime() - 5 * 86400000;
    const dueDateIso = new Date(dueMs).toISOString().slice(0, 10);

    // 5. Inserir
    const now = new Date().toISOString();
    const isConfirmedOffline = data.mode === "confirmed_offline";
    const status = isConfirmedOffline ? "confirmed" : "pending";

    const { data: created, error: insErr } = await supabaseAdmin
      .from("reservations")
      .insert({
        reservation_code: "",
        property_id: data.property_id,
        guest_name: data.guest_name,
        guest_whatsapp: data.guest_whatsapp,
        guest_email: data.guest_email ?? null,
        how_found: null,
        checkin_date: data.checkin_date,
        checkout_date: data.checkout_date,
        num_adults: data.num_adults,
        num_children: data.num_children,
        num_pets: data.num_pets,
        num_vehicles: data.num_vehicles,
        total_nights: nights,
        total_price: data.total_price,
        deposit_amount: depositAmount,
        balance_amount: balanceAmount,
        balance_due_date: dueDateIso,
        coupon_code: couponCode,
        coupon_discount_percent: couponPercent,
        status,
        payment_method: data.payment_method,
        terms_accepted: true,
        guest_message: null,
        created_by_admin: true,
        admin_notes: data.admin_notes ?? null,
        deposit_paid_at: isConfirmedOffline ? now : null,
        balance_paid_at: isConfirmedOffline ? now : null,
        contract_signed_at: isConfirmedOffline ? now : null,
        price_breakdown: {
          manual: true,
          nights,
          total: data.total_price,
        },
      })
      .select("id, reservation_code")
      .single();
    if (insErr) throw new Error(insErr.message);

    // 6. Bloqueia datas se reserva ativa (qualquer modo bloqueia, igual ao fluxo do site
    //    — standard_flow bloqueia ao receber sinal; aqui já cria como pending sem sinal,
    //    então só bloqueamos no modo confirmado offline. No standard_flow o bloqueio
    //    acontece quando admin marcar o sinal como pago, igual reservas vindas do site.)
    if (isConfirmedOffline) {
      await supabaseAdmin.from("blocked_dates").insert({
        property_id: data.property_id,
        start_date: data.checkin_date,
        end_date: data.checkout_date,
        reason: `Reserva confirmada #${created.reservation_code}`,
      });
    }

    return {
      reservation_id: created.id,
      reservation_code: created.reservation_code,
    };
  });

/* ---------- Edição de bloqueio manual ---------- */

const updateBlockSchema = z.object({
  id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(1).max(200),
  force: z.boolean().optional(),
});

export const updateBlockedDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => updateBlockSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (data.end_date <= data.start_date) {
      throw new Error("Data fim deve ser após a data início.");
    }

    const { data: existing, error: exErr } = await supabase
      .from("blocked_dates")
      .select("id, property_id, reason")
      .eq("id", data.id)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (!existing) throw new Error("Bloqueio não encontrado.");
    if ((existing.reason ?? "").toLowerCase().includes("reserva confirmada")) {
      throw new Error(
        "Este bloqueio veio de uma reserva — gerencie pela tela da reserva.",
      );
    }

    if (!data.force) {
      const [resvs] = await Promise.all([
        supabase
          .from("reservations")
          .select("id, reservation_code, guest_name, checkin_date, checkout_date, status")
          .eq("property_id", existing.property_id)
          .in("status", ACTIVE_STATUSES as unknown as string[])
          .lt("checkin_date", data.end_date)
          .gt("checkout_date", data.start_date),
      ]);
      if (resvs.error) throw new Error(resvs.error.message);
      if ((resvs.data ?? []).length > 0) {
        const err: any = new Error("CONFLICT");
        err.code = "CONFLICT";
        err.conflicts = { reservations: resvs.data ?? [], blocks: [] };
        throw err;
      }
    }

    const { error: updErr } = await supabase
      .from("blocked_dates")
      .update({
        start_date: data.start_date,
        end_date: data.end_date,
        reason: data.reason,
      })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
    return { ok: true };
  });

/* ---------- Bloqueio manual via intervalo ---------- */

const createBlockSchema = z.object({
  property_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(1).max(200),
  force: z.boolean().optional(),
});

export const createBlockedDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => createBlockSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (data.end_date <= data.start_date) {
      throw new Error("Data fim deve ser após a data início.");
    }
    if (!data.force) {
      const { data: resvs, error } = await supabase
        .from("reservations")
        .select("id, reservation_code, guest_name, checkin_date, checkout_date, status")
        .eq("property_id", data.property_id)
        .in("status", ACTIVE_STATUSES as unknown as string[])
        .lt("checkin_date", data.end_date)
        .gt("checkout_date", data.start_date);
      if (error) throw new Error(error.message);
      if ((resvs ?? []).length > 0) {
        const err: any = new Error("CONFLICT");
        err.code = "CONFLICT";
        err.conflicts = { reservations: resvs ?? [], blocks: [] };
        throw err;
      }
    }
    const { error: insErr } = await supabase.from("blocked_dates").insert({
      property_id: data.property_id,
      start_date: data.start_date,
      end_date: data.end_date,
      reason: data.reason,
    });
    if (insErr) throw new Error(insErr.message);
    return { ok: true };
  });