import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/admin/propriedades/$id/editar")({
  head: () => ({ meta: [{ title: "Editar propriedade — RotainStay" }] }),
  component: EditProperty,
});

function EditProperty() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-2">
      <h1 style={{ fontWeight: 600, fontSize: 24, color: "#2F2E2A" }}>Editar propriedade</h1>
      <p style={{ color: "#5C5B57" }}>ID: {id}</p>
    </div>
  );
}