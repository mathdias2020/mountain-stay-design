import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/propriedades/nova")({
  head: () => ({ meta: [{ title: "Nova propriedade — RotainStay" }] }),
  component: () => (
    <div className="space-y-2">
      <h1 style={{ fontWeight: 600, fontSize: 24, color: "#2F2E2A" }}>Nova propriedade</h1>
      <p style={{ color: "#5C5B57" }}>Formulário em breve.</p>
    </div>
  ),
});