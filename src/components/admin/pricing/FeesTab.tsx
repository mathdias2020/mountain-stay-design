import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FeeCalcMode, PricingConfig } from "@/lib/pricing/engine";
import { FEE_MODE_LABELS, PET_MODE_LABELS, PRICING_QUERY_KEY, cardStyle, toNum } from "./shared";
import { formatBRL } from "@/lib/admin-format";

export function FeesTab({ config }: { config: PricingConfig }) {
  const qc = useQueryClient();
  const pid = config.property_id;
  const refresh = () => qc.invalidateQueries({ queryKey: PRICING_QUERY_KEY(pid) });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<FeeCalcMode>("fixed_per_reservation");
  const [amount, setAmount] = useState("0");

  async function add() {
    if (name.trim().length < 2) return toast.error("Informe o nome da taxa.");
    const v = toNum(amount, -1);
    if (v < 0) return toast.error("Valor inválido.");
    if (mode === "percent_of_lodging" && v > 100)
      return toast.error("Percentual deve ficar entre 0 e 100%.");
    const { error } = await supabase.from("property_fees").insert({
      property_id: pid,
      name: name.trim(),
      description: description.trim() || null,
      calc_mode: mode,
      amount: v,
      active: true,
      sort_order: config.fees.length,
    });
    if (error) return toast.error(error.message);
    setName("");
    setDescription("");
    setAmount("0");
    await refresh();
    toast.success("Taxa adicionada.");
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase.from("property_fees").update({ active }).eq("id", id);
    if (error) return toast.error(error.message);
    await refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("property_fees").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[14px] bg-white p-6 space-y-2" style={cardStyle}>
        <h3 className="text-base font-semibold">Taxas fixas desta propriedade</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>
            Limpeza: {formatBRL(config.cleaning_fee)}
            {config.cleaning_fee_short != null
              ? ` (até ${config.cleaning_fee_short_max_nights} noites: ${formatBRL(config.cleaning_fee_short)})`
              : ""}
          </li>
          <li>
            Hóspede adicional: {formatBRL(config.extra_guest_price)} / noite acima de{" "}
            {config.included_guests} hóspede(s)
          </li>
          <li>
            Pet:{" "}
            {config.pet_fee_enabled
              ? `${formatBRL(config.pet_fee_amount)} — ${PET_MODE_LABELS[config.pet_fee_mode]}`
              : "não cobrada"}
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Esses valores são editados na aba <strong>Preço</strong>.
        </p>
      </section>

      <section className="rounded-[14px] bg-white p-6 space-y-4" style={cardStyle}>
        <h3 className="text-base font-semibold">Taxas adicionais</h3>

        {config.fees.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma taxa adicional.</p>
        ) : (
          <div className="divide-y">
            {config.fees.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {FEE_MODE_LABELS[f.calc_mode]} ·{" "}
                    {f.calc_mode === "percent_of_lodging"
                      ? `${f.amount}%`
                      : formatBRL(f.amount)}
                    {f.description ? ` · ${f.description}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={f.active} onCheckedChange={(v) => toggle(f.id, v)} />
                  <Button variant="ghost" size="icon" onClick={() => remove(f.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <div>
            <Label>Forma de cálculo</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as FeeCalcMode)}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FEE_MODE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>
              {mode === "percent_of_lodging" ? "Percentual (%)" : "Valor (R$)"}
            </Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={add}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar taxa
          </Button>
        </div>
      </section>
    </div>
  );
}
