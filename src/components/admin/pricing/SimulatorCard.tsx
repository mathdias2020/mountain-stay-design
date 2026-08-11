import { useMemo, useState } from "react";
import { calculateQuote, type PricingConfig } from "@/lib/pricing/engine";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/admin-format";
import { cardStyle } from "./shared";

export function SimulatorCard({ config }: { config: PricingConfig }) {
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [guests, setGuests] = useState(2);
  const [pets, setPets] = useState(0);

  const result = useMemo(() => {
    if (!checkin || !checkout || checkout <= checkin) return null;
    try {
      return calculateQuote(config, { checkin, checkout, guests, pets });
    } catch {
      return null;
    }
  }, [config, checkin, checkout, guests, pets]);

  return (
    <section className="rounded-[14px] bg-white p-6 space-y-4" style={cardStyle}>
      <h3 className="text-base font-semibold">Simular reserva</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label>Check-in</Label>
          <Input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} />
        </div>
        <div>
          <Label>Check-out</Label>
          <Input type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} />
        </div>
        <div>
          <Label>Hóspedes</Label>
          <Input
            type="number"
            min={1}
            value={guests}
            onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <div>
          <Label>Pets</Label>
          <Input
            type="number"
            min={0}
            value={pets}
            onChange={(e) => setPets(Math.max(0, Number(e.target.value) || 0))}
          />
        </div>
      </div>

      {!result ? (
        <p className="text-sm text-muted-foreground">
          Informe as datas para ver o cálculo detalhado.
        </p>
      ) : (
        <div className="space-y-1 text-sm">
          <Row label={`Hospedagem (${result.nights} noite(s))`} value={result.lodgingSubtotal} />
          {result.discounts.map((d) => (
            <Row key={d.label} label={`${d.label} (${d.percentage}%)`} value={-d.amount} />
          ))}
          {result.extraGuests.amount > 0 && (
            <Row
              label={`${result.extraGuests.count} hóspede(s) adicional`}
              value={result.extraGuests.amount}
            />
          )}
          {result.petFee.amount > 0 && (
            <Row label={result.petFee.label ?? "Pet"} value={result.petFee.amount} />
          )}
          {result.cleaningFee > 0 && <Row label="Limpeza" value={result.cleaningFee} />}
          {result.fees.map((f) => (
            <Row key={f.label} label={f.label} value={f.amount} />
          ))}
          <div className="border-t pt-1">
            <Row label="Subtotal" value={result.subtotal} />
          </div>
          {result.taxes.map((t) => (
            <Row key={t.label} label={t.label} value={t.amount} />
          ))}
          <div className="border-t pt-1 font-semibold">
            <Row label="Total" value={result.total} />
          </div>
          {result.nights < result.minNightsRequired && (
            <p className="text-xs" style={{ color: "#B43A3A" }}>
              Atenção: estadia mínima para este período é de {result.minNightsRequired} noites.
            </p>
          )}
          <details className="pt-2">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Ver como o valor foi formado
            </summary>
            <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {result.nightsDetail.map((n) => (
                <li key={n.date}>
                  {n.date.split("-").reverse().join("/")}: {formatBRL(n.finalNightPrice)}
                  {n.manualOverride != null
                    ? " (override manual)"
                    : n.seasonalRule
                      ? ` (${n.seasonalRule})`
                      : n.weekdayPrice != null
                        ? " (dia da semana)"
                        : " (preço padrão)"}
                </li>
              ))}
              {result.trace.map((t, i) => (
                <li key={`t${i}`}>{t}</li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{formatBRL(value)}</span>
    </div>
  );
}
