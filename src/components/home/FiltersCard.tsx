import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
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
  const listCitiesFn = useServerFn(listActiveCities);
  const { data: citiesList } = useQuery({
    queryKey: ["cities", "active"],
    queryFn: () => listCitiesFn(),
    staleTime: 5 * 60 * 1000,
  });

  const checkoutMin = checkin ? addDays(checkin, 1) : new Date();

  const handleSubmit = () => {
    onSearch({
      checkin: checkin ? format(checkin, "yyyy-MM-dd") : undefined,
      checkout: checkout ? format(checkout, "yyyy-MM-dd") : undefined,
      guests: guests ? Number(guests) : undefined,
      city: city || undefined,
    });
  };

  const isFooter = variant === "mobile-footer";

  const fields = (
    <>
      {/* Check-in */}
      <div className={cn("flex flex-col gap-1.5", isFooter && "min-w-0 flex-1")}>
        {!isFooter && (
          <label className="text-xs font-medium text-text-secondary">Chegada</label>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <UiButton
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !checkin && "text-text-muted",
                isFooter && "h-10 px-2 text-xs",
              )}
            >
              <CalendarIcon className={cn("mr-2 h-4 w-4", isFooter && "mr-1 h-3.5 w-3.5")} />
              <span className="truncate">
                {checkin
                  ? format(checkin, isFooter ? "dd/MM" : "dd/MM/yyyy", { locale: ptBR })
                  : isFooter ? "Entrada" : "Check-in"}
              </span>
            </UiButton>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align={isFooter ? "center" : "start"}>
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

      {/* Check-out */}
      <div className={cn("flex flex-col gap-1.5", isFooter && "min-w-0 flex-1")}>
        {!isFooter && (
          <label className="text-xs font-medium text-text-secondary">Saída</label>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <UiButton
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !checkout && "text-text-muted",
                isFooter && "h-10 px-2 text-xs",
              )}
            >
              <CalendarIcon className={cn("mr-2 h-4 w-4", isFooter && "mr-1 h-3.5 w-3.5")} />
              <span className="truncate">
                {checkout
                  ? format(checkout, isFooter ? "dd/MM" : "dd/MM/yyyy", { locale: ptBR })
                  : isFooter ? "Saída" : "Check-out"}
              </span>
            </UiButton>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align={isFooter ? "center" : "start"}>
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

      {/* Guests */}
      <div className={cn("flex flex-col gap-1.5", isFooter && "min-w-0 flex-1")}>
        {!isFooter && (
          <label className="text-xs font-medium text-text-secondary">Hóspedes</label>
        )}
        <Select value={guests} onValueChange={setGuests}>
          <SelectTrigger className={cn(isFooter && "h-10 px-2 text-xs")}>
            <SelectValue placeholder={isFooter ? "Hósp." : "Quantos hóspedes?"} />
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

      {/* City */}
      <div className={cn("flex flex-col gap-1.5", isFooter && "min-w-0 flex-1")}>
        {!isFooter && (
          <label className="text-xs font-medium text-text-secondary">Região</label>
        )}
        <Select
          value={city || "all"}
          onValueChange={(v) => setCity(v === "all" ? "" : v)}
        >
          <SelectTrigger className={cn(isFooter && "h-10 px-2 text-xs")}>
            <SelectValue placeholder={isFooter ? "Região" : "Todas as regiões"} />
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

      {/* Submit */}
      <Button
        variant="primary"
        onClick={handleSubmit}
        className={cn("h-10 w-full md:w-auto", isFooter && "h-10 w-auto shrink-0 px-3 text-xs")}
      >
        Buscar
      </Button>
    </>
  );

  if (isFooter) {
    return (
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 border-t bg-white px-3 py-2 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]",
          className,
        )}
        style={{ borderColor: "#E2E1DD" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          {fields}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative z-10 mx-auto -mt-8 max-w-5xl px-6", className)}>
      <div
        className="rounded-[14px] bg-white p-5"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
          {fields}
        </div>
      </div>
    </div>
  );
}

export default FiltersCard;