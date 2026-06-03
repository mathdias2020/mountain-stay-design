import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/reservas/$id")({
  head: () => ({ meta: [{ title: "Reserva — RotainStay" }] }),
  component: ReservationDetailStub,
});

function ReservationDetailStub() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-4">
      <Link
        to="/admin/reservas"
        className="text-sm hover:underline"
        style={{ color: "#6B7052" }}
      >
        ← Voltar para reservas
      </Link>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: "#1C1C1A" }}>
        Detalhes da reserva
      </h1>
      <p className="text-sm text-muted-foreground">
        Página de detalhes da reserva <code>{id}</code> será implementada em breve.
      </p>
    </div>
  );
}