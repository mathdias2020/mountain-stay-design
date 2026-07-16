import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, SlidersHorizontal } from "lucide-react";
import { Button as UiButton } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { listActiveCities } from "@/lib/cities.functions";

export type HomeFilters = {
  checkin?: string;
  checkout?: string;
  guests?: number;
  city?: string;
};

interface Props {
  initial: HomeFilters;
  onSearch: (next: HomeFilters) => void;
  variant?: "default" | "mobile-footer";
  className?: string;
}

export function FiltersCard({ initial, onSearch, variant = "default", className }: Props) {
  const [checkin, setCheckin] = useState<Date | undefined>(
    initial.checkin ? parseISO(initial.checkin) : undefined,
  );
  const [checkout, setCheckout] = useState<Date | undefined>(
    initial.checkout ? parseISO(initial.checkout) : undefined,
  );
  const [guests, setGuests] = useState<string>(
    initial.guests ? String(initial.guests) : "",
  );
  const [city, setCity] = useState<string>(initial.city ?? "");
  const [open, setOpen] = useState(false);
  const listCitiesFn = useServerFn(listActiveCities);
  const { data: citiesList } = useQuery({
    queryKey: ["cities", "active"],
    queryFn: () => listCitiesFn(),
    staleTime: 5 * 60 * 1000,
  });

  const checkoutMin = checkin ? addDays(checkin, 1) : new Date();

  const handleSubmit = () => {
    const next = {
      checkin: checkin ? format(checkin, "yyyy-MM-dd") : undefined,
      checkout: checkout ? format(checkout, "yyyy-MM-dd") : undefined,
      guests: guests ? Number(guests) : undefined,
      city: city || undefined,
    };
    onSearch(next);
    setOpen(false);
  };

  const summary = [
    checkin ? format(checkin, "dd/MM") : "Entrada",
    checkout ? format(checkout, "dd/MM") : "Saída",
    guests ? `${guests} hósp.` : "Hóspedes",
    city || "Todas as regiões",
  ].join(" · ");

  const checkInField = (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-text-secondary">Chegada</label>
      <Popover>
        <PopoverTrigger asChild>
          <UiButton
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !checkin && "text-text-muted",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {checkin
              ? format(checkin, "dd/MM/yyyy", { locale: ptBR })
              : "Check-in"}
          </UiButton>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={checkin}
            onSelect={(d) => {
              setCheckin(d ?? undefined);
              if (d && checkout && checkout <= d) {
                setCheckout(addDays(d, 1));
              }
            }}
            initialFocus
            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
            className="pointer-events-auto p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  const checkOutField = (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-text-secondary">Saída</label>
      <Popover>
        <PopoverTrigger asChild>
          <UiButton
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !checkout && "text-text-muted",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {checkout
              ? format(checkout, "dd/MM/yyyy", { locale: ptBR })
              : "Check-out"}
          </UiButton>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={checkout}
            onSelect={(d) => setCheckout(d ?? undefined)}
            initialFocus
            disabled={(d) => d < checkoutMin}
            className="pointer-events-auto p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  const guestsField = (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-text-secondary">Hóspedes</label>
      <Select value={guests} onValueChange={setGuests}>
        <SelectTrigger>
          <SelectValue placeholder="Quantos hóspedes?" />
        </SelectTrigger>
        <SelectContent className="max-h-60 bg-white">
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n} {n === 1 ? "hóspede" : "hóspedes"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const cityField = (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-text-secondary">Região</label>
      <Select
        value={city || "all"}
        onValueChange={(v) => setCity(v === "all" ? "" : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Todas as regiões" />
        </SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="all">Todas as regiões</SelectItem>
          {(citiesList ?? []).map((c) => (
            <SelectItem key={c.id} value={c.name}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const submitButton = (
    <Button variant="primary" onClick={handleSubmit} className="h-10 w-full md:w-auto">
      Buscar
    </Button>
  );

  if (variant === "mobile-footer") {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 border-t bg-white px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]",
              className,
            )}
            style={{ borderColor: "#E2E1DD" }}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-muted/30"
              style={{ borderColor: "#E2E1DD" }}
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                {summary}
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
              </span>
            </button>
          </div>
        </SheetTrigger>
        <SheetContent side="bottom" className="px-6 pb-8 pt-4">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="text-lg font-semibold text-text-primary">
              Ajustar busca
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-1 gap-4">
            {checkInField}
            {checkOutField}
            {guestsField}
            {cityField}
            <Button variant="primary" onClick={handleSubmit} className="h-11 w-full">
              Buscar propriedades
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className={cn("relative z-10 mx-auto -mt-8 max-w-5xl px-6", className)}>
      <div
        className="rounded-[14px] bg-white p-5"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
          {checkInField}
          {checkOutField}
          {guestsField}
          {cityField}
          {submitButton}
        </div>
      </div>
    </div>
  );
}

export default FiltersCard;
