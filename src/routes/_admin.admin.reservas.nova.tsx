import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createManualReservation,
  type CreateManualReservationInput,
} from "@/lib/reservation-admin.functions";
import {
  ConflictWarningDialog,
  type ConflictPayload,
} from "@/components/admin/ConflictWarningDialog";
import { quoteProperty } from "@/lib/pricing.functions";
import { formatBRL } from "@/lib/admin-format";

export const Route = createFileRoute("/_admin/admin/reservas/nova")({
  head: () => ({ meta: [{ title: "Nova reserva — RotainStay" }] }),
  component: NewReservationPage,
});

type PropertyOpt = {
  id: string;
  name: string;
  max_guests: number;
  parking_spots: number;
  accepts_pets: boolean;
  price_weekday: number;
  price_weekend: number;
  price_high_season: number | null;
  cleaning_fee: number;
  high_season_dates: { start: string; end: string }[] | null;
};

function NewReservationPage() {
  const navigate = useNavigate();
  const createFn = useServerFn(createManualReservation);

  const properties = useQuery({
    queryKey: ["admin", "manual-res", "properties"],
    queryFn: async (): Promise<PropertyOpt[]> => {
      const { data, error } = await supabase
        .from("properties")
        .select(
          "id, name, max_guests, parking_spots, accepts_pets, price_weekday, price_weekend, price_high_season, cleaning_fee, high_season_dates",
        )
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const [propertyId, setPropertyId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestWhats, setGuestWhats] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [pets, setPets] = useState(0);
  const [vehicles, setVehicles] = useState(0);
  const [totalPrice, setTotalPrice] = useState<string>("");
  const [priceTouched, setPriceTouched] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "pix" | "card" | "cash" | "transfer" | "other"
  >("pix");
  const [coupon, setCoupon] = useState("");
  const [mode, setMode] = useState<"confirmed_offline" | "standard_flow">(
    "confirmed_offline",
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictPayload | null>(null);

  const selectedProp = useMemo(
    () => (properties.data ?? []).find((p) => p.id === propertyId),
    [properties.data, propertyId],
  );

  // sugestão de preço vinda do motor oficial de precificação
  const validRange = Boolean(propertyId && checkin && checkout && checkout > checkin);
  const quoteQuery = useQuery({
    queryKey: ["admin", "quote", propertyId, checkin, checkout, adults + children, pets],
    enabled: validRange,
    retry: false,
    queryFn: () =>
      quoteProperty({
        data: {
          property_id: propertyId,
          checkin,
          checkout,
          guests: Math.max(1, adults + children),
          pets,
        },
      }),
  });
  const suggestedPrice = validRange ? (quoteQuery.data?.quote.total ?? null) : null;

  const effectivePrice =
    priceTouched && totalPrice ? Number(totalPrice) : suggestedPrice ?? 0;

  async function submit(force = false) {
    if (!propertyId) return toast.error("Selecione uma propriedade.");
    if (!guestName.trim() || guestName.trim().length < 2)
      return toast.error("Nome do hóspede obrigatório.");
    const waDigits = guestWhats.replace(/\D/g, "");
    if (waDigits.length < 10) return toast.error("WhatsApp inválido.");
    if (!checkin || !checkout || checkout <= checkin)
      return toast.error("Datas inválidas.");
    if (!effectivePrice || effectivePrice <= 0)
      return toast.error("Informe o valor total.");

    const payload: CreateManualReservationInput = {
      property_id: propertyId,
      guest_name: guestName.trim(),
      guest_whatsapp: waDigits,
      guest_email: guestEmail.trim() || undefined,
      checkin_date: checkin,
      checkout_date: checkout,
      num_adults: adults,
      num_children: children,
      num_pets: pets,
      num_vehicles: vehicles,
      total_price: Number(effectivePrice),
      payment_method: paymentMethod,
      coupon_code: coupon.trim() || undefined,
      mode,
      admin_notes: notes.trim() || undefined,
      force,
    };

    setSaving(true);
    try {
      const res = await createFn({ data: payload });
      toast.success(`Reserva ${res.reservation_code} criada.`);
      navigate({ to: "/admin/reservas/$id", params: { id: res.reservation_id } });
    } catch (e: any) {
      const c = e?.conflicts ?? e?.cause?.conflicts;
      if (c) {
        setConflicts(c);
      } else {
        toast.error(e?.message || "Erro ao criar reserva.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "#1C1C1A" }}>
          Nova reserva (manual)
        </h1>
        <Link
          to="/admin/reservas"
          className="text-sm hover:underline"
          style={{ color: "#6B7052" }}
        >
          ← Voltar
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        Use este formulário para registrar reservas feitas fora do site (direto
        com o cliente, via WhatsApp, etc.).
      </p>

      <div className="rounded-[14px] bg-white p-6 space-y-5" style={{ boxShadow: "0 4px 14px -8px rgba(0,0,0,0.10)" }}>
        <div>
          <Label>Propriedade *</Label>
          <Select value={propertyId} onValueChange={setPropertyId}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Selecione a propriedade" />
            </SelectTrigger>
            <SelectContent>
              {(properties.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nome do hóspede *</Label>
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={120} />
          </div>
          <div>
            <Label>WhatsApp *</Label>
            <Input
              value={guestWhats}
              onChange={(e) => setGuestWhats(e.target.value)}
              placeholder="(11) 99999-9999"
              inputMode="tel"
            />
          </div>
          <div className="md:col-span-2">
            <Label>E-mail (opcional)</Label>
            <Input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Check-in *</Label>
            <Input type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} />
          </div>
          <div>
            <Label>Check-out *</Label>
            <Input type="date" value={checkout} onChange={(e) => setCheckout(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Adultos</Label>
            <Input type="number" min={1} max={30} value={adults} onChange={(e) => setAdults(Number(e.target.value) || 1)} />
          </div>
          <div>
            <Label>Crianças</Label>
            <Input type="number" min={0} max={10} value={children} onChange={(e) => setChildren(Number(e.target.value) || 0)} />
          </div>
          <div>
            <Label>Pets</Label>
            <Input type="number" min={0} max={5} value={pets} onChange={(e) => setPets(Number(e.target.value) || 0)} />
          </div>
          <div>
            <Label>Veículos</Label>
            <Input type="number" min={0} max={20} value={vehicles} onChange={(e) => setVehicles(Number(e.target.value) || 0)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>
              Valor total *{" "}
              {suggestedPrice != null && (
                <button
                  type="button"
                  className="ml-2 text-xs underline text-muted-foreground"
                  onClick={() => {
                    setTotalPrice(String(suggestedPrice));
                    setPriceTouched(true);
                  }}
                >
                  usar sugestão ({formatBRL(suggestedPrice)})
                </button>
              )}
            </Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={priceTouched ? totalPrice : suggestedPrice != null ? String(suggestedPrice) : ""}
              onChange={(e) => {
                setPriceTouched(true);
                setTotalPrice(e.target.value);
              }}
              placeholder="0,00"
            />
          </div>
          <div>
            <Label>Método de pagamento</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="card">Cartão</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Cupom (opcional)</Label>
            <Input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="ex: BEMVINDO10"
              maxLength={30}
            />
          </div>
          <div>
            <Label>Modo de criação *</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed_offline">
                  Já confirmada (pagamento acertado fora)
                </SelectItem>
                <SelectItem value="standard_flow">
                  Iniciar fluxo padrão (sinal 50% / contrato / saldo)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "confirmed_offline"
                ? "Entra direto como Confirmada e bloqueia as datas no calendário."
                : "Entra como Pendente. Você avança status manualmente na tela da reserva."}
            </p>
          </div>
        </div>

        <div>
          <Label>Observações internas</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            placeholder="Anotações que só o admin vê (ex.: combinação feita por telefone, condição especial...)"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => navigate({ to: "/admin/reservas" })} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => submit(false)} disabled={saving}>
            {saving ? "Salvando..." : "Criar reserva"}
          </Button>
        </div>
      </div>

      <ConflictWarningDialog
        open={!!conflicts}
        onOpenChange={(o) => !o && setConflicts(null)}
        conflicts={conflicts}
        confirmLabel="Criar mesmo assim"
        onConfirm={() => {
          setConflicts(null);
          submit(true);
        }}
      />
    </div>
  );
}