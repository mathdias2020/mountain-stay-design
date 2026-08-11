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

export function PromotionsTab({ config }: { config: PricingConfig }) {
  const qc = useQueryClient();
  const pid = config.property_id;
  const refresh = () => qc.invalidateQueries({ queryKey: PRICING_QUERY_KEY(pid) });

  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [percent, setPercent] = useState("20");

  async function add() {
    if (name.trim().length < 2) return toast.error("Informe o nome da promoção.");
    if (!start || !end || end < start)
      return toast.error("Período inválido: a data final deve ser igual ou depois da inicial.");
    const p = toNum(percent, 0);
    if (p <= 0 || p > 100) return toast.error("Desconto deve ficar entre 0 e 100%.");
    const { error } = await supabase.from("property_promotions").insert({
      property_id: pid,
      name: name.trim(),
      start_date: start,
      end_date: end,
      discount_percent: p,
      active: true,
    });
    if (error) return toast.error(error.message);
    setName("");
    setStart("");
    setEnd("");
    await refresh();
    toast.success("Promoção criada.");
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase
      .from("property_promotions")
      .update({ active })
      .eq("id", id);
    if (error) return toast.error(error.message);
    await refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("property_promotions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await refresh();
  }

  return (
    <section className="rounded-[14px] bg-white p-6 space-y-4" style={cardStyle}>
      <h3 className="text-base font-semibold">Promoções por período</h3>
      <p className="text-xs text-muted-foreground">
        O desconto vale para as noites dentro do período. Pode coexistir com desconto
        por duração e de última hora.
      </p>

      {config.promotions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma promoção cadastrada.</p>
      ) : (
        <div className="divide-y">
          {config.promotions.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.start_date.split("-").reverse().join("/")} →{" "}
                  {p.end_date.split("-").reverse().join("/")} · -{p.discount_percent}%
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={p.active} onCheckedChange={(v) => toggle(p.id, v)} />
                <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
        <div className="md:col-span-2">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </div>
        <div>
          <Label>Início</Label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <Label>Fim</Label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div>
          <Label>Desconto (%)</Label>
          <Input
            type="number"
            min={1}
            max={100}
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button onClick={add}>
            <Plus className="mr-1 h-4 w-4" /> Criar promoção
          </Button>
        </div>
      </div>
    </section>
  );
}
