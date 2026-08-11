import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/Button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatBRL, rangeIsBlocked } from "@/lib/pricing/engine";
import { quoteProperty } from "@/lib/pricing.functions";
import { ReservationModal } from "./ReservationModal";
import type { PropertyDetail } from "@/lib/properties.functions";

interface Props {
  property: PropertyDetail;
  blockedSet: Set<string>;
  initialCheckin?: Date;
  initialCheckout?: Date;
  initialGuests?: number;
}

export function BookingCard({
  property,
  blockedSet,
  initialCheckin,
  initialCheckout,
  initialGuests,
}: Props) {
  const [checkin, setCheckin] = useState<Date | undefined>(initialCheckin);
  const [checkout, setCheckout] = useState<Date | undefined>(initialCheckout);
  const [guests, setGuests] = useState(initialGuests ?? 1);
  const [modalOpen, setModalOpen] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const checkinKey = checkin ? format(checkin, "yyyy-MM-dd") : null;
  const checkoutKey = checkout ? format(checkout, "yyyy-MM-dd") : null;
  const hasRange = !!checkinKey && !!checkoutKey && checkoutKey > checkinKey;

  const quoteQuery = useQuery({
    queryKey: ["quote", property.id, checkinKey, checkoutKey, guests],
    enabled: hasRange,
    staleTime: 60_000,
    retry: false,
    queryFn: () =>
      quoteProperty({
        data: {
          property_id: property.id,
          checkin: checkinKey!,
          checkout: checkoutKey!,
          guests,
        },
      }),
  });

  const quote = hasRange ? (quoteQuery.data?.quote ?? null) : null;

  const isBlocked = useMemo(() => {
    if (!checkinKey || !checkoutKey) return false;
    return rangeIsBlocked(checkinKey, checkoutKey, blockedSet);
  }, [checkinKey, checkoutKey, blockedSet]);

  const minNightsRequired = quote?.minNightsRequired ?? 0;
  const tooShort = !!quote && quote.nights < minNightsRequired;

  const canSubmit =
    !!checkin &&
    !!checkout &&
    !isBlocked &&
    !tooShort &&
    !!quote &&
    quote.nights > 0;

  return (
    <div
      className="rounded-[14px] bg-surface p-6"
      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.10)" }}
    >
      <p className="text-[22px] font-bold text-primary">
        {formatBRL(property.from_price)}{" "}
        <span className="text-sm font-normal text-text-secondary">/ noite</span>
      </p>
      <p className="mt-1 text-xs text-text-muted">
        Valor a partir de. O total depende das datas e do número de hóspedes.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <DateField
          label="Check-in"
          value={checkin}
          onChange={(d) => {
            setCheckin(d);
            if (d && checkout && checkout <= d) setCheckout(undefined);
          }}
          disabled={(d) => d < today}
        />
        <DateField
          label="Check-out"
          value={checkout}
          onChange={setCheckout}
          disabled={(d) => d < today || (checkin ? d <= checkin : false)}
        />
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          Hóspedes
        </label>
        <div className="flex items-center justify-between rounded-md border border-input bg-surface px-3 py-2">
          <button
            type="button"
            aria-label="Diminuir"
            onClick={() => setGuests((g) => Math.max(1, g - 1))}
            className="rounded-md p-1 text-text-secondary hover:bg-secondary disabled:opacity-40"
            disabled={guests <= 1}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="text-sm text-text-primary">
            {guests} {guests === 1 ? "hóspede" : "hóspedes"}
          </span>
          <button
            type="button"
            aria-label="Aumentar"
            onClick={() =>
              setGuests((g) => Math.min(property.max_guests, g + 1))
            }
            className="rounded-md p-1 text-text-secondary hover:bg-secondary disabled:opacity-40"
            disabled={guests >= property.max_guests}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-[11px] text-text-muted">
          Máximo: {property.max_guests} hóspedes
        </p>
      </div>

      {hasRange && quoteQuery.isLoading && (
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculando preço…
        </div>
      )}

      {hasRange && quoteQuery.isError && (
        <div className="mt-4 rounded-md border border-[#E0B575] bg-[#FFF3CD] px-3 py-2 text-xs text-[#7A5300]">
          Não foi possível calcular o preço agora. Tente novamente.
        </div>
      )}

      {quote && (
        <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm text-text-secondary">
          <div className="flex justify-between">
            <span>
              {quote.nights} {quote.nights === 1 ? "noite" : "noites"} de hospedagem
            </span>
            <span>{formatBRL(quote.lodgingSubtotal)}</span>
          </div>
          {quote.discounts.map((d) => (
            <div key={`${d.type}-${d.label}`} className="flex justify-between">
              <span>{d.label}</span>
              <span className="text-[#1F6F35]">− {formatBRL(d.amount)}</span>
            </div>
          ))}
          {quote.extraGuests.amount > 0 && (
            <div className="flex justify-between">
              <span>
                Hóspedes adicionais ({quote.extraGuests.count} × {formatBRL(quote.extraGuests.pricePerNight)}/noite)
              </span>
              <span>{formatBRL(quote.extraGuests.amount)}</span>
            </div>
          )}
          {quote.petFee.amount > 0 && (
            <div className="flex justify-between">
              <span>{quote.petFee.label ?? "Taxa de pet"}</span>
              <span>{formatBRL(quote.petFee.amount)}</span>
            </div>
          )}
          {quote.cleaningFee > 0 && (
            <div className="flex justify-between">
              <span>Taxa de limpeza</span>
              <span>{formatBRL(quote.cleaningFee)}</span>
            </div>
          )}
          {quote.fees.map((f) => (
            <div key={f.label} className="flex justify-between">
              <span>{f.label}</span>
              <span>{formatBRL(f.amount)}</span>
            </div>
          ))}
          {quote.taxes.map((t) => (
            <div key={t.label} className="flex justify-between">
              <span>{t.label}</span>
              <span>{formatBRL(t.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-2 text-text-primary">
            <span className="font-semibold">Total</span>
            <span className="font-bold">{formatBRL(quote.total)}</span>
          </div>
        </div>
      )}

      {isBlocked && (
        <div className="mt-4 rounded-md border border-[#E0B575] bg-[#FFF3CD] px-3 py-2 text-xs text-[#7A5300]">
          Período indisponível. Selecione outras datas.
        </div>
      )}
      {tooShort && !isBlocked && (
        <div className="mt-4 rounded-md border border-[#E0B575] bg-[#FFF3CD] px-3 py-2 text-xs text-[#7A5300]">
          Esta propriedade exige mínimo de {minNightsRequired} noites para o
          período selecionado.
        </div>
      )}

      <Button
        variant="primary"
        className="mt-5 w-full !text-base"
        disabled={!canSubmit}
        onClick={() => setModalOpen(true)}
      >
        Solicitar reserva
      </Button>
      <p className="mt-3 text-center text-xs text-text-muted">
        Você não paga nada agora. A reserva é confirmada por WhatsApp.
      </p>

      <ReservationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        property={property}
        checkin={checkin}
        checkout={checkout}
        guests={guests}
        breakdown={quote}
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  disabled: (d: Date) => boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-secondary">
        {label}
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-md border border-input bg-surface px-3 py-2 text-left text-sm",
              !value && "text-text-muted",
            )}
          >
            <CalendarIcon className="h-4 w-4" />
            {value
              ? format(value, "dd/MM/yyyy", { locale: ptBR })
              : "Selecionar"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            disabled={disabled}
            initialFocus
            locale={ptBR}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}