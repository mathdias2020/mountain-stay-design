import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reservationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Apenas admins podem excluir
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Apenas administradores podem excluir reservas.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Carregar reserva
    const { data: res, error: resErr } = await supabaseAdmin
      .from("reservations")
      .select("id, reservation_code, property_id")
      .eq("id", data.reservationId)
      .maybeSingle();
    if (resErr) throw new Error(resErr.message);
    if (!res) throw new Error("Reserva não encontrada.");

    // Remover arquivos do storage
    const { data: docs } = await supabaseAdmin
      .from("reservation_documents")
      .select("storage_path")
      .eq("reservation_id", res.id);
    const paths = (docs ?? []).map((d) => d.storage_path).filter(Boolean);
    if (paths.length > 0) {
      await supabaseAdmin.storage.from("reservation-docs").remove(paths);
    }

    // Remover blocked_dates associadas (pelo código da reserva)
    await supabaseAdmin
      .from("blocked_dates")
      .delete()
      .eq("property_id", res.property_id)
      .ilike("reason", `%${res.reservation_code}%`);

    // Excluir reserva (status_history e reservation_documents caem por CASCADE)
    const { error: delErr } = await supabaseAdmin
      .from("reservations")
      .delete()
      .eq("id", res.id);
    if (delErr) throw new Error(delErr.message);

    return { ok: true };
  });