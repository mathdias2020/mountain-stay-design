import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { PricingConfig } from "@/lib/pricing/engine";
import { PRICING_QUERY_KEY, cardStyle, toNum } from "./shared";

export function DiscountsTab({ config }: { config: PricingConfig }) {
  const qc = useQueryClient();
  const pid = config.property_id;
  const refresh = () => qc.invalidateQueries({ queryKey: PRICING_QUERY_KEY(pid) });

  const [lenNights, setLenNights] = useState("7");
  const [lenPct, setLenPct] = useState("10");
  const [lmDays, setLmDays] = useState("7");
  const [lmPct, setLmPct] = useState("10");

  async function addLength() {
    const n = Math.round(toNum(lenNights, 0));
    const p = toNum(lenPct, 0);
    if (n < 2) return toast.error("A faixa deve começar em 2 noites ou mais.");
    if (p <= 0 || p > 100) return toast.error("Desconto deve ficar entre 0 e 100%.");
    if (config.length_discounts.some((d) => d.min_nights === n))
      return toast.error("Já existe uma faixa com essa duração.");
    const { error } = await supabase
      .from("property_length_discounts")
      .insert({ property_id: pid, min_nights: n, discount_percent: p });
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("Faixa adicionada.");
  }

  async function removeLength(minNights: number) {
    const { error } = await supabase
      .from("property_length_discounts")
      .delete()
      .eq("property_id", pid)
      .eq("min_nights", minNights);
    if (error) return toast.error(error.message);
    await refresh();
  }

  async function addPreset(nights: number, percent: number) {
    setLenNights(String(nights));
    setLenPct(String(percent));
  }

  async function addLastMinute() {
    const d = Math.round(toNum(lmDays, -1));
    const p = toNum(lmPct, 0);
    if (d < 0) return toast.error("Informe os dias antes do check-in.");
    if (p <= 0 || p > 100) return toast.error("Desconto deve ficar entre 0 e 100%.");
    if (config.lastminute_discounts.some((x) => x.days_before === d))
      return toast.error("Já existe uma regra com esse prazo.");
    const { error } = await supabase
      .from("property_lastminute_discounts")
      .insert({ property_id: pid, days_before: d, discount_percent: p });
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("Regra adicionada.");
  }

  async function toggleLastMinute(days: number, active: boolean) {
    const { error } = await supabase
      .from("property_lastminute_discounts")
      .update({ active })
      .eq("property_id", pid)
      .eq("days_before", days);
    if (error) return toast.error(error.message);
    await refresh();
  }

  async function removeLastMinute(days: number) {
    const { error } = await supabase
      .from("property_lastminute_discounts")
      .delete()
      .eq("property_id", pid)
      .eq("days_before", days);
    if (error) return toast.error(error.message);
    await refresh();
  }

  const lengths = [...config.length_discounts].sort(
    (a, b) => a.min_nights - b.min_nights,
  );
  const lastMinute = [...config.lastminute_discounts].sort(
    (a, b) => b.days_before - a.days_before,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[14px] bg-white p-6 space-y-4" style={cardStyle}>
        <h3 className="text-base font-semibold">Descontos por duração</h3>
        <p className="text-xs text-muted-foreground">
          Não acumulam entre si: para cada reserva vale apenas a maior faixa aplicável.
          Atalhos: desconto semanal = 7 noites, mensal = 28 noites.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => addPreset(7, 10)}>
            Preencher semanal (7 noites, 10%)
          </Button>
          <Button variant="outline" size="sm" onClick={() => addPreset(28, 25)}>
            Preencher mensal (28 noites, 25%)
          </Button>
        </div>

        {lengths.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma faixa configurada.</p>
        ) : (
          <div className="divide-y">
            {lengths.map((d) => (
              <div key={d.min_nights} className="flex items-center justify-between py-2">
                <span className="text-sm">
                  A partir de <strong>{d.min_nights} noites</strong> →{" "}
                  <strong>{d.discount_percent}%</strong>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLength(d.min_nights)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3 pt-2">
          <div>
            <Label>A partir de (noites)</Label>
            <Input
              type="number"
              min={2}
              className="w-[140px]"
              value={lenNights}
              onChange={(e) => setLenNights(e.target.value)}
            />
          </div>
          <div>
            <Label>Desconto (%)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              className="w-[120px]"
              value={lenPct}
              onChange={(e) => setLenPct(e.target.value)}
            />
          </div>
          <Button onClick={addLength}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar faixa
          </Button>
        </div>
      </section>

      <section className="rounded-[14px] bg-white p-6 space-y-4" style={cardStyle}>
        <h3 className="text-base font-semibold">Desconto de última hora</h3>
        <p className="text-xs text-muted-foreground">
          Aplicado quando o check-in está próximo. Também não acumulam entre si.
        </p>

        {lastMinute.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma regra configurada.</p>
        ) : (
          <div className="divide-y">
            {lastMinute.map((d) => (
              <div key={d.days_before} className="flex items-center justify-between py-2">
                <span className="text-sm">
                  Até <strong>{d.days_before} dia(s)</strong> antes →{" "}
                  <strong>{d.discount_percent}%</strong>
                </span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={d.active}
                    onCheckedChange={(v) => toggleLastMinute(d.days_before, v)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLastMinute(d.days_before)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3 pt-2">
          <div>
            <Label>Até (dias antes)</Label>
            <Input
              type="number"
              min={0}
              className="w-[140px]"
              value={lmDays}
              onChange={(e) => setLmDays(e.target.value)}
            />
          </div>
          <div>
            <Label>Desconto (%)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              className="w-[120px]"
              value={lmPct}
              onChange={(e) => setLmPct(e.target.value)}
            />
          </div>
          <Button onClick={addLastMinute}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar regra
          </Button>
        </div>
      </section>
    </div>
  );
}
