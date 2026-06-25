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
}

export function FiltersCard({ initial, onSearch }: Props) {
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

  return (
    <div className="relative z-10 mx-auto -mt-8 max-w-5xl px-6">
      <div
        className="rounded-[14px] bg-white p-5"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
          {/* Check-in */}
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

          {/* Check-out */}
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

          {/* Guests */}
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

          {/* City */}
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
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit */}
          <Button variant="primary" onClick={handleSubmit} className="h-10 w-full md:w-auto">
            Buscar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default FiltersCard;