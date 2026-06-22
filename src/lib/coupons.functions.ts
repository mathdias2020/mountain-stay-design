import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const codeSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9_-]{3,30}$/, "Código inválido"));

const couponInputSchema = z.object({
  code: codeSchema,
  discount_percent: z.number().min(0.01).max(100),
  active: z.boolean(),
  expires_at: z.string().datetime().nullable().optional(),
  max_uses: z.number().int().min(1).nullable().optional(),
});

export type CouponInput = z.input<typeof couponInputSchema>;

export type Coupon = {
  id: string;
  code: string;
  discount_percent: number;
  active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  created_at: string;
  updated_at: string;
};

export type ValidateCouponResult =
  | { valid: true; code: string; discount_percent: number }
  | { valid: false; reason: string };

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

// Public: validate a coupon code (used by the reservation modal before submit).
export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ code: codeSchema }).parse(raw),
  )
  .handler(async ({ data }): Promise<ValidateCouponResult> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row, error } = await supabaseAdmin
      .from("coupons")
      .select("code, discount_percent, active, expires_at, max_uses, uses_count")
      .eq("code", data.code)
      .maybeSingle();
    if (error) return { valid: false, reason: "Erro ao validar cupom." };
    if (!row) return { valid: false, reason: "Cupom não encontrado." };
    if (!row.active) return { valid: false, reason: "Cupom inativo." };
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return { valid: false, reason: "Cupom expirado." };
    }
    if (row.max_uses != null && row.uses_count >= row.max_uses) {
      return { valid: false, reason: "Cupom esgotado." };
    }
    return {
      valid: true,
      code: row.code,
      discount_percent: Number(row.discount_percent),
    };
  });

export const listCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Coupon[]> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Coupon[];
  });

export const createCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => couponInputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.from("coupons").insert({
      code: data.code,
      discount_percent: data.discount_percent,
      active: data.active,
      expires_at: data.expires_at ?? null,
      max_uses: data.max_uses ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({ id: z.string().uuid() })
      .merge(couponInputSchema)
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("coupons")
      .update({
        code: data.code,
        discount_percent: data.discount_percent,
        active: data.active,
        expires_at: data.expires_at ?? null,
        max_uses: data.max_uses ?? null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("coupons")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
