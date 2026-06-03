import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin")({
  head: () => ({
    meta: [{ title: "Painel — RotainStay" }],
  }),
  component: AdminHome,
});

function AdminHome() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Visão Geral</h1>
      <p className="mt-2 text-text-secondary">
        Conteúdo do painel será adicionado em breve.
      </p>
    </div>
  );
}