import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { signOne } from "@/lib/storage-signing";

export type PixSettings = {
  pix_key: string;
  pix_beneficiary: string;
  pix_qr_code_path: string;
};

export type PixSettingsPublic = PixSettings & { qr_code_url: string | null };

const pixSchema = z.object({
  pix_key: z.string().trim().max(120),
  pix_beneficiary: z.string().trim().max(120),
  pix_qr_code_path: z.string().trim().max(512),
});

async function readSetting(key: string): Promise<string | null> {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}

async function writeSetting(key: string, value: string) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { error } = await supabaseAdmin
    .from("site_settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const getPixSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<PixSettingsPublic> => {
    setResponseHeader(
      "cache-control",
      "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
    );
    const [pix_key, pix_beneficiary, pix_qr_code_path] = await Promise.all([
      readSetting("pix_key"),
      readSetting("pix_beneficiary"),
      readSetting("pix_qr_code_path"),
    ]);
    const path = pix_qr_code_path ?? "";
    const qr_code_url = path ? await signOne("home-assets", path) : null;
    return {
      pix_key: pix_key ?? "",
      pix_beneficiary: pix_beneficiary ?? "",
      pix_qr_code_path: path,
      qr_code_url,
    };
  },
);

export const setPixSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: PixSettings) => pixSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await Promise.all([
      writeSetting("pix_key", data.pix_key),
      writeSetting("pix_beneficiary", data.pix_beneficiary),
      writeSetting("pix_qr_code_path", data.pix_qr_code_path),
    ]);
    return { ok: true };
  });

// Allow guest (just-created reservation) to set their payment method.
// Authorization: caller must provide both the reservation id and its code.
const methodSchema = z.object({
  reservation_id: z.string().uuid(),
  reservation_code: z.string().min(1).max(40),
  payment_method: z.enum(["pix", "card"]),
});

export const setReservationPaymentMethod = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => methodSchema.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row, error: selErr } = await supabaseAdmin
      .from("reservations")
      .select("id, reservation_code")
      .eq("id", data.reservation_id)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (!row || row.reservation_code !== data.reservation_code) {
      throw new Error("Reserva não encontrada.");
    }
    const { error } = await supabaseAdmin
      .from("reservations")
      .update({ payment_method: data.payment_method })
      .eq("id", data.reservation_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });