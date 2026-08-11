import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PricingConfig } from "@/lib/pricing/engine";
import {
  PET_MODE_LABELS,
  PRICING_QUERY_KEY,
  WEEKDAY_LABELS,
  cardStyle,
  toNum,
} from "./shared";

export function PriceTab({ config }: { config: PricingConfig }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [basePrice, setBasePrice] = useState(String(config.base_price));
  const [includedGuests, setIncludedGuests] = useState(
    String(config.included_guests),
  );
  const [extraGuest, setExtraGuest] = useState(String(config.extra_guest_price));
  const [petEnabled, setPetEnabled] = useState(config.pet_fee_enabled);
  const [petMode, setPetMode] = useState(config.pet_fee_mode);
  const [petAmount, setPetAmount] = useState(String(config.pet_fee_amount));
  const [cleaning, setCleaning] = useState(String(config.cleaning_fee));
  const [shortEnabled, setShortEnabled] = useState(
    config.cleaning_fee_short != null,
  );
  const [shortValue, setShortValue] = useState(
    String(config.cleaning_fee_short ?? 0),
  );
  const [shortMax, setShortMax] = useState(
    String(config.cleaning_fee_short_max_nights ?? 2),
  );

  const [weekday, setWeekday] = useState<Record<number, string | null>>(() => {
    const init: Record<number, string | null> = {};
    for (let d = 0; d < 7; d++) {
      const v = config.weekday_prices[d];
      init[d] = v != null ? String(v) : null;
    }
    return init;
  });

  useEffect(() => {
    setBasePrice(String(config.base_price));
  }, [config.base_price]);

  async function save() {
    const base = toNum(basePrice);
    if (base < 0) return toast.error("Preço padrão inválido.");
    if (toNum(includedGuests, 1) < 1)
      return toast.error("Hóspedes incluídos deve ser no mínimo 1.");
    for (const [d, v] of Object.entries(weekday)) {
      if (v != null && toNum(v) < 0)
        return toast.error(`Preço inválido em ${WEEKDAY_LABELS[Number(d)]}.`);
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("properties")
        .update({
          base_price: base,
          price_weekday: base, // compatibilidade com listagens legadas
          included_guests: Math.max(1, Math.round(toNum(includedGuests, 1))),
          extra_guest_price: toNum(extraGuest),
          pet_fee_enabled: petEnabled,
          pet_fee_mode: petMode,
          pet_fee_amount: toNum(petAmount),
          cleaning_fee: toNum(cleaning),
          cleaning_fee_short: shortEnabled ? toNum(shortValue) : null,
          cleaning_fee_short_max_nights: shortEnabled
            ? Math.max(1, Math.round(toNum(shortMax, 2)))
            : null,
        })
        .eq("id", config.property_id);
      if (error) throw error;

      // preço por dia da semana: upsert dos marcados, remoção dos desmarcados
      const toUpsert = Object.entries(weekday)
        .filter(([, v]) => v != null)
        .map(([d, v]) => ({
          property_id: config.property_id,
          weekday: Number(d),
          price: toNum(v as string),
        }));
      const toDelete = Object.entries(weekday)
        .filter(([, v]) => v == null)
        .map(([d]) => Number(d));

      if (toUpsert.length) {
        const { error: e2 } = await supabase
          .from("property_weekday_prices")
          .upsert(toUpsert, { onConflict: "property_id,weekday" });
        if (e2) throw e2;
      }
      if (toDelete.length) {
        const { error: e3 } = await supabase
          .from("property_weekday_prices")
          .delete()
          .eq("property_id", config.property_id)
          .in("weekday", toDelete);
        if (e3) throw e3;
      }

      await qc.invalidateQueries({
        queryKey: PRICING_QUERY_KEY(config.property_id),
      });
      toast.success("Precificação salva.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[14px] bg-white p-6 space-y-4" style={cardStyle}>
        <h3 className="text-base font-semibold">Preço padrão</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Preço padrão por noite (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Usado quando nenhuma regra mais específica se aplica.
            </p>
          </div>
          <div>
            <Label>Moeda</Label>
            <Input value="BRL (R$)" disabled />
          </div>
        </div>
      </section>

      <section className="rounded-[14px] bg-white p-6 space-y-4" style={cardStyle}>
        <h3 className="text-base font-semibold">Preço por dia da semana</h3>
        <p className="text-xs text-muted-foreground">
          Marque apenas os dias que têm preço diferente. Os demais usam o preço padrão.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {WEEKDAY_LABELS.map((label, d) => {
            const active = weekday[d] != null;
            return (
              <div key={d} className="flex items-center gap-3">
                <Checkbox
                  checked={active}
                  onCheckedChange={(c) =>
                    setWeekday((w) => ({
                      ...w,
                      [d]: c ? String(config.base_price) : null,
                    }))
                  }
                />
                <span className="w-24 text-sm">{label}</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  className="max-w-[140px]"
                  disabled={!active}
                  value={weekday[d] ?? ""}
                  onChange={(e) =>
                    setWeekday((w) => ({ ...w, [d]: e.target.value }))
                  }
                  placeholder="preço padrão"
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[14px] bg-white p-6 space-y-4" style={cardStyle}>
        <h3 className="text-base font-semibold">Hóspedes e pets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Hóspedes incluídos na diária</Label>
            <Input
              type="number"
              min={1}
              value={includedGuests}
              onChange={(e) => setIncludedGuests(e.target.value)}
            />
          </div>
          <div>
            <Label>Valor por hóspede adicional / noite (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={extraGuest}
              onChange={(e) => setExtraGuest(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Switch checked={petEnabled} onCheckedChange={setPetEnabled} />
          <span className="text-sm">Cobrar taxa para animais</span>
        </div>
        {petEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Forma de cobrança</Label>
              <Select value={petMode} onValueChange={(v) => setPetMode(v as any)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PET_MODE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={petAmount}
                onChange={(e) => setPetAmount(e.target.value)}
              />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[14px] bg-white p-6 space-y-4" style={cardStyle}>
        <h3 className="text-base font-semibold">Taxa de limpeza</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Taxa padrão (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={cleaning}
              onChange={(e) => setCleaning(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={shortEnabled} onCheckedChange={setShortEnabled} />
          <span className="text-sm">Valor diferente para estadias curtas</span>
        </div>
        {shortEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Até quantas noites</Label>
              <Input
                type="number"
                min={1}
                value={shortMax}
                onChange={(e) => setShortMax(e.target.value)}
              />
            </div>
            <div>
              <Label>Valor da limpeza (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={shortValue}
                onChange={(e) => setShortValue(e.target.value)}
              />
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando..." : "Salvar precificação"}
        </Button>
      </div>
    </div>
  );
}
