import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VALID = ["pending", "confirmed", "cancelled", "completed"] as const;

export const updateReservationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        reservationId: z.string().uuid(),
        newStatus: z.enum(VALID),
        note: z.string().max(2000).optional(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Carregar reserva atual
    const { data: res, error: resErr } = await supabase
      .from("reservations")
      .select("id, status, reservation_code, checkin_date, checkout_date, property_id")
      .eq("id", data.reservationId)
      .maybeSingle();
    if (resErr) throw new Error(resErr.message);
    if (!res) throw new Error("Reserva não encontrada");

    const oldStatus = res.status;
    const newStatus = data.newStatus;

    // Atualizar status (trigger insere automaticamente em reservation_status_history)
    const { error: updErr } = await supabase
      .from("reservations")
      .update({ status: newStatus })
      .eq("id", res.id);
    if (updErr) throw new Error(updErr.message);

    // Se houve mudança e veio nota, atribuir à última linha do histórico
    if (data.note && oldStatus !== newStatus) {
      const { data: lastHist } = await supabase
        .from("reservation_status_history")
        .select("id")
        .eq("reservation_id", res.id)
        .eq("new_status", newStatus)
        .order("changed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastHist) {
        await supabase
          .from("reservation_status_history")
          .update({ note: data.note })
          .eq("id", lastHist.id);
      }
    }

    // Efeitos colaterais em blocked_dates
    if (newStatus === "confirmed") {
      const reason = `Reserva confirmada #${res.reservation_code}`;
      const { data: existing } = await supabase
        .from("blocked_dates")
        .select("id")
        .eq("property_id", res.property_id)
        .ilike("reason", `%${res.reservation_code}%`)
        .limit(1);
      if (!existing || existing.length === 0) {
        await supabase.from("blocked_dates").insert({
          property_id: res.property_id,
          start_date: res.checkin_date,
          end_date: res.checkout_date,
          reason,
        });
      }
    } else if (newStatus === "cancelled") {
      await supabase
        .from("blocked_dates")
        .delete()
        .eq("property_id", res.property_id)
        .ilike("reason", `%${res.reservation_code}%`);
    }

    return { ok: true, oldStatus, newStatus };
  });