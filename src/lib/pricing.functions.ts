import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PriceQuote } from "@/lib/pricing/engine";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const quoteSchema = z.object({
  property_id: z.string().uuid(),
  checkin: dateStr,
  checkout: dateStr,
  guests: z.number().int().min(1).max(40),
  pets: z.number().int().min(0).max(10).optional(),
});

export type QuotePropertyInput = z.input<typeof quoteSchema>;

export type QuotePropertyResult = {
  quote: PriceQuote;
  meets_min_nights: boolean;
};

/**
 * Cotação oficial de uma propriedade. O frontend nunca calcula o total:
 * este é o único caminho para exibir preço com datas selecionadas.
 */
export const quoteProperty = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => quoteSchema.parse(raw))
  .handler(async ({ data }): Promise<QuotePropertyResult> => {
    const { loadPricingConfig } = await import("@/lib/pricing/loader.server");
    const { calculateQuote } = await import("@/lib/pricing/engine");

    const config = await loadPricingConfig(data.property_id);
    if (!config) throw new Error("Propriedade não encontrada.");

    const quote = calculateQuote(config, {
      checkin: data.checkin,
      checkout: data.checkout,
      guests: data.guests,
      pets: data.pets ?? 0,
    });

    return {
      quote,
      meets_min_nights: quote.nights >= quote.minNightsRequired,
    };
  });
