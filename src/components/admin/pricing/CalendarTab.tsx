import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { PricingConfig } from "@/lib/pricing/engine";
import {
  addDaysKey,
  expandBlockedDates,
  listNights,
  nightPriceInfo,
  todayInBrasilia,
} from "@/lib/pricing/engine";
import { PRICING_QUERY_KEY, cardStyle, toNum } from "./shared";
import { formatBRL } from "@/lib/admin-format";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WD_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];

function monthKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function CalendarTab({ config }: { config: PricingConfig }) {
  const qc = useQueryClient();
  const pid = config.property_id;
  const refresh = () => qc.invalidateQueries({ queryKey: PRICING_QUERY_KEY(pid) });

  const today = todayInBrasilia();
  const [cursor, setCursor] = useState(() => {
    const [y, m] = today.split("-").map(Number);
    return { year: y!, month: (m ?? 1) - 1 };
  });

  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [priceMode, setPriceMode] = useState<"keep" | "fixed">("fixed");
  const [priceValue, setPriceValue] = useState("");
  const [minNights, setMinNights] = useState("");
  const [saving, setSaving] = useState(false);

  const occupancy = useQuery({
    queryKey: ["admin", "pricing-occupancy", pid],
    queryFn: async () => {
      const [blocks, reservs] = await Promise.all([
        supabase
          .from("blocked_dates")
          .select("start_date, end_date")
          .eq("property_id", pid),
        supabase
          .from("reservations")
          .select("checkin_date, checkout_date, status")
          .eq("property_id", pid)
          .in("status", ["pending", "awaiting_contract", "awaiting_balance", "confirmed"]),
      ]);
      return {
        blocked: expandBlockedDates(
          (blocks.data ?? []).map((b) => ({ start: b.start_date, end: b.end_date })),
        ),
        reserved: expandBlockedDates(
          (reservs.data ?? []).map((r) => ({ start: r.checkin_date, end: r.checkout_date })),
        ),
      };
    },
  });

  const days = useMemo(() => {
    const first = new Date(Date.UTC(cursor.year, cursor.month, 1));
    const offset = first.getUTCDay();
    const total = new Date(Date.UTC(cursor.year, cursor.month + 1, 0)).getUTCDate();
    const cells: (string | null)[] = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= total; d++) cells.push(monthKey(cursor.year, cursor.month, d));
    return cells;
  }, [cursor]);

  const selectedRange = useMemo(() => {
    if (!selStart) return [] as string[];
    const end = selEnd ?? selStart;
    const [a, b] = selStart <= end ? [selStart, end] : [end, selStart];
    return listNights(a, addDaysKey(b, 1));
  }, [selStart, selEnd]);

  function pick(date: string) {
    if (!selStart || (selStart && selEnd)) {
      setSelStart(date);
      setSelEnd(null);
      const info = nightPriceInfo(config, date);
      setPriceValue(String(info.price));
      setMinNights(info.minNights ? String(info.minNights) : "");
      setPriceMode(info.source === "override" ? "fixed" : "fixed");
    } else {
      setSelEnd(date);
    }
  }

  async function applySelection() {
    if (selectedRange.length === 0) return;
    setSaving(true);
    try {
      const price = priceMode === "fixed" ? toNum(priceValue, -1) : null;
      if (priceMode === "fixed" && price! < 0) {
        toast.error("Preço inválido.");
        return;
      }
      const mn = minNights.trim() === "" ? null : Math.max(1, Math.round(toNum(minNights, 1)));

      if (price == null && mn == null) {
        // nada a gravar: equivale a restaurar
        await clearSelection();
        return;
      }

      const rows = selectedRange.map((date) => ({
        property_id: pid,
        date,
        price,
        min_nights: mn,
      }));
      const { error } = await supabase
        .from("property_date_prices")
        .upsert(rows, { onConflict: "property_id,date" });
      if (error) throw error;
      await refresh();
      toast.success(`${rows.length} noite(s) atualizada(s).`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function clearSelection() {
    if (selectedRange.length === 0) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("property_date_prices")
        .delete()
        .eq("property_id", pid)
        .in("date", selectedRange);
      if (error) throw error;
      await refresh();
      toast.success("Preço calculado restaurado.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao restaurar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[14px] bg-white p-6" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">
            {MONTHS[cursor.month]} {cursor.year}
          </h3>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCursor((c) =>
                  c.month === 0
                    ? { year: c.year - 1, month: 11 }
                    : { ...c, month: c.month - 1 },
                )
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCursor((c) =>
                  c.month === 11
                    ? { year: c.year + 1, month: 0 }
                    : { ...c, month: c.month + 1 },
                )
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
          {WD_SHORT.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((date, i) => {
            if (!date) return <div key={`e${i}`} />;
            const info = nightPriceInfo(config, date);
            const reserved = occupancy.data?.reserved.has(date) ?? false;
            const blocked = occupancy.data?.blocked.has(date) ?? false;
            const selected = selectedRange.includes(date);
            const past = date < today;

            const border =
              info.source === "override"
                ? "#6B7052"
                : info.source === "seasonal"
                  ? "#B98A3A"
                  : info.source === "weekday"
                    ? "#9AA37A"
                    : "transparent";

            return (
              <button
                key={date}
                type="button"
                onClick={() => pick(date)}
                className="rounded-[8px] p-1.5 text-left transition-colors"
                style={{
                  border: `2px solid ${selected ? "#1C1C1A" : border}`,
                  background: selected
                    ? "#EFEFE7"
                    : reserved
                      ? "#F3E4E4"
                      : blocked
                        ? "#EDEDED"
                        : "#FFFFFF",
                  opacity: past ? 0.5 : 1,
                }}
              >
                <div className="text-[11px] font-medium">{Number(date.slice(8))}</div>
                <div className="text-[10px] leading-tight">
                  {formatBRL(info.price).replace("R$", "").trim()}
                </div>
                {info.promotionPercent != null && (
                  <div className="text-[9px]" style={{ color: "#B43A3A" }}>
                    -{info.promotionPercent}%
                  </div>
                )}
                {(reserved || blocked) && (
                  <div className="text-[9px] text-muted-foreground">
                    {reserved ? "reservado" : "bloqueado"}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <Legend color="transparent" label="preço padrão" />
          <Legend color="#9AA37A" label="dia da semana" />
          <Legend color="#B98A3A" label="regra sazonal" />
          <Legend color="#6B7052" label="override manual" />
          <Legend color="transparent" bg="#F3E4E4" label="reservado" />
          <Legend color="transparent" bg="#EDEDED" label="bloqueado" />
        </div>
      </section>

      {selectedRange.length > 0 && (
        <section className="rounded-[14px] bg-white p-6 space-y-4" style={cardStyle}>
          <h3 className="text-base font-semibold uppercase tracking-wide text-sm">
            {selectedRange.length === 1
              ? selectedRange[0]!.split("-").reverse().join("/")
              : `${selectedRange[0]!.split("-").reverse().join("/")} – ${selectedRange[selectedRange.length - 1]!.split("-").reverse().join("/")}`}{" "}
            ({selectedRange.length} noite(s))
          </h3>

          <RadioGroup value={priceMode} onValueChange={(v) => setPriceMode(v as any)}>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="keep" /> Manter preço calculado
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="fixed" /> Definir preço fixo
            </label>
          </RadioGroup>

          {priceMode === "fixed" && (
            <div className="max-w-[200px]">
              <Label>Preço por noite (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
              />
            </div>
          )}

          <div className="max-w-[200px]">
            <Label>Estadia mínima (noites)</Label>
            <Input
              type="number"
              min={1}
              value={minNights}
              onChange={(e) => setMinNights(e.target.value)}
              placeholder="usar padrão"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={applySelection} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={clearSelection} disabled={saving}>
              Restaurar preço calculado
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSelStart(null);
                setSelEnd(null);
              }}
            >
              Limpar seleção
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Clique em uma data para começar e em outra para formar um intervalo.
          </p>
        </section>
      )}

      <SeasonalRules config={config} />
    </div>
  );
}

function Legend({ color, bg, label }: { color: string; bg?: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-3 w-3 rounded-[3px]"
        style={{ border: `2px solid ${color}`, background: bg ?? "#fff" }}
      />
      {label}
    </span>
  );
}

function SeasonalRules({ config }: { config: PricingConfig }) {
  const qc = useQueryClient();
  const pid = config.property_id;
  const refresh = () => qc.invalidateQueries({ queryKey: PRICING_QUERY_KEY(pid) });

  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [kind, setKind] = useState<"fixed" | "percent">("fixed");
  const [value, setValue] = useState("");
  const [minN, setMinN] = useState("");
  const [maxN, setMaxN] = useState("");
  const [priority, setPriority] = useState("0");

  async function add() {
    if (name.trim().length < 2) return toast.error("Informe o nome da regra.");
    if (!start || !end || end < start)
      return toast.error("Período inválido: a data final deve ser igual ou depois da inicial.");
    const v = toNum(value, NaN);
    if (!Number.isFinite(v)) return toast.error("Informe o preço ou o percentual.");
    if (kind === "fixed" && v < 0) return toast.error("Preço inválido.");
    if (kind === "percent" && (v < -100 || v > 500))
      return toast.error("Ajuste percentual fora do limite.");

    const overlap = config.seasonal_rules.find(
      (r) => r.active && start <= r.end_date && end >= r.start_date,
    );
    if (overlap && Number(priority) === overlap.priority) {
      return toast.error(
        `Conflito com "${overlap.name}" no mesmo período e mesma prioridade. Ajuste a prioridade ou o período.`,
      );
    }

    const { error } = await supabase.from("property_seasonal_rules").insert({
      property_id: pid,
      name: name.trim(),
      start_date: start,
      end_date: end,
      price_fixed: kind === "fixed" ? v : null,
      adjust_percent: kind === "percent" ? v : null,
      min_nights: minN.trim() === "" ? null : Math.max(1, Math.round(toNum(minN, 1))),
      max_nights: maxN.trim() === "" ? null : Math.max(1, Math.round(toNum(maxN, 1))),
      priority: Math.round(toNum(priority, 0)),
      active: true,
    });
    if (error) return toast.error(error.message);
    setName("");
    setStart("");
    setEnd("");
    setValue("");
    setMinN("");
    setMaxN("");
    await refresh();
    toast.success("Regra sazonal criada.");
  }

  async function toggle(id: string, active: boolean) {
    const { error } = await supabase
      .from("property_seasonal_rules")
      .update({ active })
      .eq("id", id);
    if (error) return toast.error(error.message);
    await refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("property_seasonal_rules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await refresh();
  }

  return (
    <section className="rounded-[14px] bg-white p-6 space-y-4" style={cardStyle}>
      <h3 className="text-base font-semibold">Regras sazonais</h3>
      <p className="text-xs text-muted-foreground">
        Valem para um período: preço fixo ou ajuste percentual sobre o preço da noite.
        Em caso de sobreposição vence a maior prioridade.
      </p>

      {config.seasonal_rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma regra sazonal.</p>
      ) : (
        <div className="divide-y">
          {config.seasonal_rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.start_date.split("-").reverse().join("/")} →{" "}
                  {r.end_date.split("-").reverse().join("/")} ·{" "}
                  {r.price_fixed != null
                    ? formatBRL(r.price_fixed)
                    : `${r.adjust_percent! > 0 ? "+" : ""}${r.adjust_percent}%`}
                  {r.min_nights ? ` · mín ${r.min_nights} noites` : ""}
                  {` · prioridade ${r.priority}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={r.active} onCheckedChange={(v) => toggle(r.id, v)} />
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
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
          <Label>Tipo</Label>
          <RadioGroup value={kind} onValueChange={(v) => setKind(v as any)} className="mt-2">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="fixed" /> Preço fixo (R$)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="percent" /> Ajuste percentual (%)
            </label>
          </RadioGroup>
        </div>
        <div>
          <Label>{kind === "fixed" ? "Preço por noite (R$)" : "Ajuste (%)"}</Label>
          <Input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={kind === "fixed" ? "1200" : "-20 ou 80"}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Mín.</Label>
            <Input type="number" min={1} value={minN} onChange={(e) => setMinN(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Máx.</Label>
            <Input type="number" min={1} value={maxN} onChange={(e) => setMaxN(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Prior.</Label>
            <Input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={add}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar regra
        </Button>
      </div>
    </section>
  );
}
