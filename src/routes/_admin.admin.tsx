import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ReservationsTable,
  type ReservationRow,
} from "@/components/admin/ReservationsTable";

export const Route = createFileRoute("/_admin/admin")({
  head: () => ({
    meta: [{ title: "Painel — RotainStay" }],
  }),
  component: AdminHome,
});

type Metrics = {
  pending: number;
  confirmed: number;
  checkinsThisWeek: number;
  activeProperties: number;
};

async function fetchMetrics(): Promise<Metrics> {
  const today = new Date();
  const in7 = new Date();
  in7.setDate(today.getDate() + 7);
  const isoToday = today.toISOString().slice(0, 10);
  const iso7 = in7.toISOString().slice(0, 10);

  const [pending, confirmed, week, props] = await Promise.all([
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .gte("checkin_date", isoToday)
      .lte("checkin_date", iso7),
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  return {
    pending: pending.count ?? 0,
    confirmed: confirmed.count ?? 0,
    checkinsThisWeek: week.count ?? 0,
    activeProperties: props.count ?? 0,
  };
}

async function fetchRecent(): Promise<ReservationRow[]> {
  const { data } = await supabase
    .from("reservations")
    .select(
      "id, reservation_code, guest_name, guest_whatsapp, checkin_date, checkout_date, total_price, status, properties(name)"
    )
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    reservation_code: r.reservation_code,
    guest_name: r.guest_name,
    guest_whatsapp: r.guest_whatsapp,
    checkin_date: r.checkin_date,
    checkout_date: r.checkout_date,
    total_price: r.total_price,
    status: r.status,
    property_name: r.properties?.name ?? null,
  }));
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="rounded-[14px] bg-white p-5"
      style={{ boxShadow: "0 4px 14px -8px rgba(0,0,0,0.12)" }}
    >
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
      <div className="mt-1" style={{ fontSize: 14, color: "#5C5B57" }}>
        {label}
      </div>
    </div>
  );
}

function AdminHome() {
  const metrics = useQuery({ queryKey: ["admin", "metrics"], queryFn: fetchMetrics });
  const recent = useQuery({ queryKey: ["admin", "recent"], queryFn: fetchRecent });
  const m = metrics.data ?? { pending: 0, confirmed: 0, checkinsThisWeek: 0, activeProperties: 0 };

  return (
    <div className="space-y-8">
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#1C1C1A" }}>Visão Geral</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Reservas Pendentes" value={m.pending} color="#B07D2E" />
        <MetricCard label="Reservas Confirmadas" value={m.confirmed} color="#3A7D44" />
        <MetricCard label="Check-ins esta semana" value={m.checkinsThisWeek} color="#6B7052" />
        <MetricCard label="Total de propriedades ativas" value={m.activeProperties} color="#1C1C1A" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1C1C1A" }}>
            Reservas recentes
          </h2>
          <Link
            to="/admin/reservas"
            className="text-sm font-medium hover:underline"
            style={{ color: "#6B7052" }}
          >
            Ver todas
          </Link>
        </div>
        <ReservationsTable rows={recent.data ?? []} loading={recent.isLoading} />
      </section>
    </div>
  );
}