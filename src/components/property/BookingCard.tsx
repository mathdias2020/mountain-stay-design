import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Minus, Plus } from "lucide-react";
import { Button } from "@/components/Button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  calculatePrice,
  formatBRL,
  rangeIsBlocked,
} from "@/lib/pricing";
import { ReservationModal } from "./ReservationModal";
import type { PropertyDetail } from "@/lib/properties.functions";

interface Props {
  property: PropertyDetail;
  blockedSet: Set<string>;
}

export function BookingCard({ property, blockedSet }: Props) {
  const [checkin, setCheckin] = useState<Date | undefined>(undefined);
  const [checkout, setCheckout] = useState<Date | undefined>(undefined);
  const [guests, setGuests] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const breakdown = useMemo(() => {
    if (!checkin || !checkout || checkout <= checkin) return null;
    return calculatePrice(
      checkin,
      checkout,
      property.price_weekday,
      property.price_weekend,
      property.cleaning_fee,
    );
  }, [checkin, checkout, property]);

  const isBlocked = useMemo(() => {
    if (!checkin || !checkout) return false;
    return rangeIsBlocked(checkin, checkout, blockedSet);
  }, [checkin, checkout, blockedSet]);

  // Mínimo de noites: usa o weekend min se a estadia inclui qualquer noite de fim de semana.
  const minNightsRequired = useMemo(() => {
    if (!breakdown) return 0;
    return breakdown.weekendNights > 0
      ? property.min_nights_weekend
      : property.min_nights_weekday;
  }, [breakdown, property]);

  const tooShort =
    breakdown !== null && breakdown.nights < minNightsRequired;

  const canSubmit =
    !!checkin &&
    !!checkout &&
    !isBlocked &&
    !tooShort &&
    !!breakdown &&
    breakdown.nights > 0;

  return (
    <div
      className="rounded-[14px] bg-surface p-6"
      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.10)" }}
    >
      <p className="text-[22px] font-bold text-primary">
        {formatBRL(property.price_weekday)}{" "}
        <span className="text-sm font-normal text-text-secondary">/ noite</span>
      </p>
      <p className="mt-1 text-xs text-text-muted">
        Fins de semana a partir de {formatBRL(property.price_weekend)}/noite.
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

      {breakdown && (
        <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm text-text-secondary">
          {breakdown.weekdayNights > 0 && (
            <div className="flex justify-between">
              <span>
                {breakdown.weekdayNights} {breakdown.weekdayNights === 1 ? "noite de semana" : "noites de semana"} × {formatBRL(breakdown.weekdayPrice)}
              </span>
              <span>{formatBRL(breakdown.weekdaySubtotal)}</span>
            </div>
          )}
          {breakdown.weekendNights > 0 && (
            <div className="flex justify-between">
              <span>
                {breakdown.weekendNights} {breakdown.weekendNights === 1 ? "noite de fim de semana" : "noites de fim de semana"} × {formatBRL(breakdown.weekendPrice)}
              </span>
              <span>{formatBRL(breakdown.weekendSubtotal)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Taxa de limpeza</span>
            <span>{formatBRL(breakdown.cleaningFee)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-text-primary">
            <span className="font-semibold">Total</span>
            <span className="font-bold">{formatBRL(breakdown.total)}</span>
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
        breakdown={breakdown}
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