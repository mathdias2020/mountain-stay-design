import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

const idSchema = z.object({ reservationId: z.string().uuid() });

async function ensureBlockedDates(
  supabase: any,
  reservationId: string,
) {
  const { data: r } = await supabase
    .from("reservations")
    .select("property_id, reservation_code, checkin_date, checkout_date")
    .eq("id", reservationId)
    .maybeSingle();
  if (!r) return;
  const { data: existing } = await supabase
    .from("blocked_dates")
    .select("id")
    .eq("property_id", r.property_id)
    .ilike("reason", `%${r.reservation_code}%`)
    .limit(1);
  if (existing && existing.length > 0) return;
  await supabase.from("blocked_dates").insert({
    property_id: r.property_id,
    start_date: r.checkin_date,
    end_date: r.checkout_date,
    reason: `Reserva confirmada #${r.reservation_code}`,
  });
}

/** Admin marca que o sinal (50%) foi recebido → awaiting_contract + bloqueia datas. */
export const markDepositPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => idSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("reservations")
      .update({
        status: "awaiting_contract",
        deposit_paid_at: now,
      })
      .eq("id", data.reservationId);
    if (error) throw new Error(error.message);
    await ensureBlockedDates(supabase, data.reservationId);
    return { ok: true };
  });

/** Admin marca que o contrato foi enviado por e-mail (não altera status). */
export const markContractSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => idSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("reservations")
      .update({ contract_sent_at: new Date().toISOString() })
      .eq("id", data.reservationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin marca que o contrato foi assinado → awaiting_balance. */
export const markContractSigned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => idSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("reservations")
      .update({
        status: "awaiting_balance",
        contract_signed_at: now,
      })
      .eq("id", data.reservationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin marca que o saldo (50%) foi recebido → confirmed. */
export const markBalancePaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => idSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("reservations")
      .update({
        status: "confirmed",
        balance_paid_at: now,
      })
      .eq("id", data.reservationId);
    if (error) throw new Error(error.message);
    await ensureBlockedDates(supabase, data.reservationId);
    return { ok: true };
  });

const notesSchema = z.object({
  reservationId: z.string().uuid(),
  notes: z.string().max(2000),
});

export const updateBalanceNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => notesSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("reservations")
      .update({ admin_balance_notes: data.notes })
      .eq("id", data.reservationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });