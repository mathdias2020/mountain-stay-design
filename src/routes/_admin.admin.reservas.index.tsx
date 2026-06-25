import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ReservationsTable,
  type ReservationRow,
} from "@/components/admin/ReservationsTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/admin/EmptyState";
import { ClipboardList } from "lucide-react";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_admin/admin/reservas/")({
  head: () => ({ meta: [{ title: "Reservas — RotainStay" }] }),
  component: ReservationsPage,
});

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function DatePickerField({
  value,
  onChange,
  placeholder,
}: {
  value?: Date;
  onChange: (d?: Date) => void;
  placeholder: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[150px] justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "dd/MM/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

function ReservationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [propertyId, setPropertyId] = useState<string>("all");
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounced(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, propertyId, from, to]);

  const propertiesQuery = useQuery({
    queryKey: ["admin", "properties-active-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      return data ?? [];
    },
  });

  const filters = useMemo(
    () => ({
      debouncedSearch,
      status,
      propertyId,
      from: from ? format(from, "yyyy-MM-dd") : null,
      to: to ? format(to, "yyyy-MM-dd") : null,
      page,
    }),
    [debouncedSearch, status, propertyId, from, to, page]
  );

  const listQuery = useQuery({
    queryKey: ["admin", "reservations", filters],
    queryFn: async () => {
      const start = (filters.page - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;
      let q = supabase
        .from("reservations")
        .select(
          "id, reservation_code, property_id, guest_name, guest_whatsapp, checkin_date, checkout_date, total_price, status, payment_method, coupon_code, coupon_discount_percent",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(start, end);

      if (filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.propertyId !== "all") q = q.eq("property_id", filters.propertyId);
      if (filters.from) q = q.gte("checkin_date", filters.from);
      if (filters.to) q = q.lte("checkin_date", filters.to);
      if (filters.debouncedSearch.trim()) {
        const s = filters.debouncedSearch.trim().replace(/[%,]/g, "");
        q = q.or(
          `reservation_code.ilike.%${s}%,guest_name.ilike.%${s}%,guest_whatsapp.ilike.%${s}%`
        );
      }

      const { data, count } = await q;
      const list = data ?? [];
      const propertyIds = Array.from(
        new Set(list.map((r: any) => r.property_id).filter(Boolean))
      );
      let nameMap = new Map<string, string>();
      if (propertyIds.length) {
        const { data: props } = await supabase
          .from("properties")
          .select("id, name")
          .in("id", propertyIds);
        nameMap = new Map((props ?? []).map((p: any) => [p.id, p.name]));
      }
      const rows: ReservationRow[] = list.map((r: any) => ({
        id: r.id,
        reservation_code: r.reservation_code,
        guest_name: r.guest_name,
        guest_whatsapp: r.guest_whatsapp,
        checkin_date: r.checkin_date,
        checkout_date: r.checkout_date,
        total_price: r.total_price,
        status: r.status,
        payment_method: r.payment_method ?? null,
        coupon_code: r.coupon_code ?? null,
        coupon_discount_percent:
          r.coupon_discount_percent != null
            ? Number(r.coupon_discount_percent)
            : null,
        property_name: nameMap.get(r.property_id) ?? null,
      }));
      return { rows, count: count ?? 0 };
    },
  });

  const totalPages = Math.max(1, Math.ceil((listQuery.data?.count ?? 0) / PAGE_SIZE));

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setPropertyId("all");
    setFrom(undefined);
    setTo(undefined);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#1C1C1A" }}>Reservas</h1>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar código, hóspede ou WhatsApp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs bg-white"
        />

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px] bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="awaiting_contract">Aguardando contrato</SelectItem>
            <SelectItem value="awaiting_balance">Aguardando saldo</SelectItem>
            <SelectItem value="confirmed">Confirmada</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
            <SelectItem value="completed">Concluída</SelectItem>
          </SelectContent>
        </Select>

        <Select value={propertyId} onValueChange={setPropertyId}>
          <SelectTrigger className="w-[220px] bg-white">
            <SelectValue placeholder="Propriedade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as propriedades</SelectItem>
            {(propertiesQuery.data ?? []).map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DatePickerField value={from} onChange={setFrom} placeholder="De" />
        <DatePickerField value={to} onChange={setTo} placeholder="Até" />

        <Button variant="ghost" onClick={clearFilters}>
          Limpar filtros
        </Button>
      </div>

      {!listQuery.isLoading && (listQuery.data?.rows ?? []).length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nenhuma reserva encontrada." />
      ) : (
        <ReservationsTable
          rows={listQuery.data?.rows ?? []}
          loading={listQuery.isLoading}
        />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {listQuery.data?.count ?? 0} reserva(s)
        </span>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span>
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
}