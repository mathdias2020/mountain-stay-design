import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarSkeleton } from "@/components/skeletons/CalendarSkeleton";

export const Route = createFileRoute("/_admin/admin/calendario")({
  head: () => ({ meta: [{ title: "Calendário — RotainStay" }] }),
  component: CalendarPage,
});

type Property = { id: string; name: string };
type Blocked = { id: string; start_date: string; end_date: string; reason: string | null };
type Reservation = {
  id: string;
  reservation_code: string;
  guest_name: string;
  checkin_date: string;
  checkout_date: string;
  status: string;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function CalendarPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const { data: properties = [] } = useQuery({
    queryKey: ["admin", "calendar", "properties"],
    queryFn: async (): Promise<Property[]> => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .eq("status", "active")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!propertyId && properties.length > 0) setPropertyId(properties[0].id);
  }, [properties, propertyId]);

  // Range = 2 months from cursor
  const rangeStart = useMemo(() => isoDate(monthCursor), [monthCursor]);
  const rangeEnd = useMemo(
    () => isoDate(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 2, 0)),
    [monthCursor]
  );

  const { data: calData, isLoading: calLoading } = useQuery({
    queryKey: ["admin", "calendar", "data", propertyId, rangeStart, rangeEnd],
    enabled: !!propertyId,
    queryFn: async () => {
      const [blockedRes, resvRes] = await Promise.all([
        supabase
          .from("blocked_dates")
          .select("id, start_date, end_date, reason")
          .eq("property_id", propertyId!)
          .lte("start_date", rangeEnd)
          .gte("end_date", rangeStart),
        supabase
          .from("reservations")
          .select("id, reservation_code, guest_name, checkin_date, checkout_date, status")
          .eq("property_id", propertyId!)
          .eq("status", "confirmed")
          .lte("checkin_date", rangeEnd)
          .gte("checkout_date", rangeStart),
      ]);
      if (blockedRes.error) throw blockedRes.error;
      if (resvRes.error) throw resvRes.error;
      return {
        blocked: (blockedRes.data ?? []) as Blocked[],
        reservations: (resvRes.data ?? []) as Reservation[],
      };
    },
  });

  const today = isoDate(new Date());

  type DayState = {
    iso: string;
    reservation?: Reservation;
    blocked?: Blocked;
    checkin?: boolean;
    checkout?: boolean;
  };

  const dayMap = useMemo(() => {
    const m = new Map<string, DayState>();
    if (!calData) return m;
    for (const r of calData.reservations) {
      // occupied range [checkin .. checkout - 1]
      let d = parseISO(r.checkin_date);
      const end = parseISO(r.checkout_date);
      while (d < end) {
        const k = isoDate(d);
        const prev = m.get(k) ?? { iso: k };
        prev.reservation = r;
        m.set(k, prev);
        d = addDays(d, 1);
      }
      const ci = m.get(r.checkin_date) ?? { iso: r.checkin_date };
      ci.checkin = true;
      ci.reservation = r;
      m.set(r.checkin_date, ci);
      const coKey = isoDate(addDays(parseISO(r.checkout_date), -1));
      const co = m.get(coKey) ?? { iso: coKey };
      co.checkout = true;
      m.set(coKey, co);
    }
    for (const b of calData.blocked) {
      const isManual = !(b.reason || "").toLowerCase().includes("reserva confirmada");
      if (!isManual) continue;
      let d = parseISO(b.start_date);
      const end = parseISO(b.end_date);
      while (d < end) {
        const k = isoDate(d);
        const prev = m.get(k) ?? { iso: k };
        if (!prev.reservation) prev.blocked = b;
        m.set(k, prev);
        d = addDays(d, 1);
      }
    }
    return m;
  }, [calData]);

  // Modals
  const [blockModalDate, setBlockModalDate] = useState<string | null>(null);
  const [unblockModal, setUnblockModal] = useState<Blocked | null>(null);

  function onDayClick(state: DayState | null, iso: string) {
    if (iso < today) return;
    if (state?.reservation) {
      navigate({ to: `/admin/reservas/${state.reservation.id}` as never });
      return;
    }
    if (state?.blocked) {
      setUnblockModal(state.blocked);
      return;
    }
    setBlockModalDate(iso);
  }

  const month1 = monthCursor;
  const month2 = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        <h1 style={{ fontWeight: 600, fontSize: 24, color: "#2F2E2A" }}>
          Calendário de disponibilidade
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <div style={{ minWidth: 260 }}>
            <Select value={propertyId ?? ""} onValueChange={(v) => setPropertyId(v)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Selecione a propriedade" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
              }
              aria-label="Mês anterior"
            >
              <ChevronLeft size={16} />
            </Button>
            <span style={{ fontSize: 14, color: "#2F2E2A", minWidth: 180, textAlign: "center" }}>
              {MONTH_NAMES[monthCursor.getMonth()]} {monthCursor.getFullYear()}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))
              }
              aria-label="Próximo mês"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {calLoading || !calData ? (
          <CalendarSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MonthGrid month={month1} dayMap={dayMap} today={today} onDayClick={onDayClick} />
            <div className="hidden md:block">
              <MonthGrid month={month2} dayMap={dayMap} today={today} onDayClick={onDayClick} />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4" style={{ fontSize: 13, color: "#5C5B57" }}>
          <LegendDot color="#fff" border="#E2E1DD" label="Disponível" />
          <LegendDot color="#F8D7DA" label="Reservado" />
          <LegendDot color="#FFF3CD" label="Bloqueado manualmente" />
        </div>

        <BlockDialog
          open={!!blockModalDate}
          startDate={blockModalDate}
          onClose={() => setBlockModalDate(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "calendar", "data"] });
            setBlockModalDate(null);
          }}
          propertyId={propertyId}
        />

        <UnblockDialog
          blocked={unblockModal}
          onClose={() => setUnblockModal(null)}
          onRemoved={() => {
            qc.invalidateQueries({ queryKey: ["admin", "calendar", "data"] });
            setUnblockModal(null);
          }}
        />
      </div>
    </TooltipProvider>
  );
}

function LegendDot({ color, border, label }: { color: string; border?: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        style={{
          display: "inline-block",
          width: 14,
          height: 14,
          background: color,
          border: `1px solid ${border ?? color}`,
          borderRadius: 3,
        }}
      />
      {label}
    </span>
  );
}

function MonthGrid({
  month,
  dayMap,
  today,
  onDayClick,
}: {
  month: Date;
  dayMap: Map<string, { iso: string; reservation?: Reservation; blocked?: Blocked; checkin?: boolean; checkout?: boolean }>;
  today: string;
  onDayClick: (
    state: { iso: string; reservation?: Reservation; blocked?: Blocked; checkin?: boolean; checkout?: boolean } | null,
    iso: string
  ) => void;
}) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(isoDate(new Date(month.getFullYear(), month.getMonth(), d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, color: "#2F2E2A", marginBottom: 12 }}>
        {MONTH_NAMES[month.getMonth()]} {month.getFullYear()}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ fontSize: 11, color: "#9A9890", textAlign: "center", padding: 4 }}>
            {w}
          </div>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const state = dayMap.get(iso);
          const isPast = iso < today;
          const isReserved = !!state?.reservation;
          const isBlocked = !!state?.blocked;
          const dayNum = parseISO(iso).getDate();

          let bg = "#fff";
          let color = "#1C1C1A";
          let border = "1px solid #E2E1DD";
          if (isPast) {
            bg = "#F5F4F1";
            color = "#9A9890";
            border = "1px solid transparent";
          } else if (isReserved) {
            bg = "#F8D7DA";
            color = "#6B1F1F";
            border = "1px solid #F1C2C6";
          } else if (isBlocked) {
            bg = "#FFF3CD";
            color = "#7A5300";
            border = "1px solid #F3E1A6";
          }

          const cell = (
            <button
              type="button"
              disabled={isPast}
              onClick={() => onDayClick(state ?? null, iso)}
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                background: bg,
                color,
                border,
                borderLeft: state?.checkin ? "3px solid #3A7D44" : border,
                borderRight: state?.checkout ? "3px solid #3A7D44" : border,
                borderRadius: 6,
                fontSize: 13,
                cursor: isPast ? "not-allowed" : "pointer",
                padding: 0,
              }}
            >
              {dayNum}
            </button>
          );

          const tip = isReserved
            ? `Reserva: ${state!.reservation!.reservation_code} — ${state!.reservation!.guest_name}`
            : isBlocked
              ? state!.blocked!.reason || "Bloqueado"
              : null;

          if (tip) {
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>{cell}</TooltipTrigger>
                <TooltipContent>{tip}</TooltipContent>
              </Tooltip>
            );
          }
          return <div key={i}>{cell}</div>;
        })}
      </div>
    </div>
  );
}

function BlockDialog({
  open,
  startDate,
  propertyId,
  onClose,
  onSaved,
}: {
  open: boolean;
  startDate: string | null;
  propertyId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("Manutenção");
  const [description, setDescription] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (startDate) {
      setEndDate(isoDate(addDays(parseISO(startDate), 1)));
      setReason("Manutenção");
      setDescription("");
    }
  }, [startDate]);

  async function submit() {
    if (!startDate || !propertyId) return;
    if (endDate <= startDate) {
      toast.error("Data fim deve ser após a data início");
      return;
    }
    setSaving(true);
    const fullReason = description ? `${reason}: ${description}` : reason;
    const { error } = await supabase.from("blocked_dates").insert({
      property_id: propertyId,
      start_date: startDate,
      end_date: endDate,
      reason: fullReason,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao bloquear período");
      return;
    }
    toast.success("Período bloqueado");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bloquear período</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Primeira noite bloqueada</Label>
            <Input type="date" value={startDate ?? ""} readOnly />
          </div>
          <div>
            <Label>Liberação (check-in disponível neste dia)</Label>
            <Input
              type="date"
              value={endDate}
              min={startDate ? isoDate(addDays(parseISO(startDate), 1)) : undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <p style={{ fontSize: 12, color: "#9A9890", marginTop: 4 }}>
              Esta data fica disponível para nova reserva.
            </p>
          </div>
          <div>
            <Label>Motivo</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Manutenção">Manutenção</SelectItem>
                <SelectItem value="Uso próprio">Uso próprio</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Salvando..." : "Confirmar bloqueio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UnblockDialog({
  blocked,
  onClose,
  onRemoved,
}: {
  blocked: Blocked | null;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const [removing, setRemoving] = useState(false);
  async function remove() {
    if (!blocked) return;
    setRemoving(true);
    const { error } = await supabase.from("blocked_dates").delete().eq("id", blocked.id);
    setRemoving(false);
    if (error) {
      toast.error("Erro ao remover bloqueio");
      return;
    }
    toast.success("Bloqueio removido");
    onRemoved();
  }

  return (
    <Dialog open={!!blocked} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover bloqueio</DialogTitle>
        </DialogHeader>
        {blocked && (
          <div className="space-y-2" style={{ fontSize: 14, color: "#2F2E2A" }}>
            <div>
              <strong>Período:</strong> {blocked.start_date} → {blocked.end_date}
            </div>
            <div>
              <strong>Motivo:</strong> {blocked.reason || "—"}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={removing}>Cancelar</Button>
          <Button variant="destructive" onClick={remove} disabled={removing}>
            {removing ? "Removendo..." : "Remover bloqueio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}