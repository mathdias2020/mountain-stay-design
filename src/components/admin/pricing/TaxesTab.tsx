import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import type { PricingConfig } from "@/lib/pricing/engine";
import { PRICING_QUERY_KEY, cardStyle, toNum } from "./shared";
import { formatBRL } from "@/lib/admin-format";

const BASES = [
  ["base_lodging", "Hospedagem"],
  ["base_cleaning", "Limpeza"],
  ["base_pet", "Pet"],
  ["base_extra_guests", "Hóspedes adicionais"],
  ["base_fees", "Taxas adicionais"],
] as const;

export function TaxesTab({ config }: { config: PricingConfig }) {
  const qc = useQueryClient();
  const pid = config.property_id;
  const refresh = () => qc.invalidateQueries({ queryKey: PRICING_QUERY_KEY(pid) });

  const [name, setName] = useState("");
  const [rate, setRate] = useState("5");
  const [fixed, setFixed] = useState("");
  const [bases, setBases] = useState<Record<string, boolean>>({
    base_lodging: true,
    base_cleaning: false,
    base_pet: false,
    base_extra_guests: false,
    base_fees: false,
  });

  async function add() {
    if (name.trim().length < 2) return toast.error("Informe o nome do imposto.");
    const r = rate.trim() === "" ? null : toNum(rate, -1);
    const f = fixed.trim() === "" ? null : toNum(fixed, -1);
    if (r == null && f == null)
      return toast.error("Informe uma alíquota ou um valor fixo.");
    if (r != null && (r < 0 || r > 100))
      return toast.error("Alíquota deve ficar entre 0 e 100%.");
    if (f != null && f < 0) return toast.error("Valor fixo inválido.");

    const { error } = await supabase.from("property_taxes").insert({
      property_id: pid,
      name: name.trim(),
      rate_percent: r,
      fixed_amount: f,
      ...bases,
      active: true,
      sort_order: config.taxes.length,
    });
    if (error) return toast.error(error.message);
    setName("");
    await refresh();
    toast.success("Imposto adicionado.");
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("property_taxes").update({ active }).eq("id", id);
    if (error) return toast.error(error.message);
    await refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("property_taxes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await refresh();
  }

  return (
    <section className="rounded-[14px] bg-white p-6 space-y-4" style={cardStyle}>
      <h3 className="text-base font-semibold">Impostos</h3>
      <p className="text-xs text-muted-foreground">
        Estrutura de cálculo configurável — escolha a alíquota e sobre quais valores ela incide.
      </p>

      {config.taxes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum imposto configurado.</p>
      ) : (
        <div className="divide-y">
          {config.taxes.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.rate_percent != null ? `${t.rate_percent}%` : ""}
                  {t.fixed_amount != null
                    ? `${t.rate_percent != null ? " + " : ""}${formatBRL(t.fixed_amount)}`
                    : ""}{" "}
                  · base:{" "}
                  {BASES.filter(([k]) => (t as any)[k])
                    .map(([, label]) => label)
                    .join(", ") || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={t.active} onCheckedChange={(v) => toggle(t.id, v)} />
                <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        <div>
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="ex: ISS" />
        </div>
        <div>
          <Label>Alíquota (%)</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            max={100}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
        <div>
          <Label>Valor fixo (R$, opcional)</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            value={fixed}
            onChange={(e) => setFixed(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>Base de incidência</Label>
        <div className="mt-2 flex flex-wrap gap-4">
          {BASES.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={bases[k]}
                onCheckedChange={(c) => setBases((b) => ({ ...b, [k]: Boolean(c) }))}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={add}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar imposto
        </Button>
      </div>
    </section>
  );
}
