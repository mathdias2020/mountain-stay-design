import { createFileRoute } from "@tanstack/react-router";
import { PropertyForm } from "@/components/admin/PropertyForm";

export const Route = createFileRoute("/_admin/admin/propriedades/nova")({
  head: () => ({ meta: [{ title: "Nova propriedade — RotainStay" }] }),
  component: () => (
    <div className="space-y-6">
      <h1 style={{ fontWeight: 600, fontSize: 24, color: "#2F2E2A" }}>Nova propriedade</h1>
      <PropertyForm mode="create" />
    </div>
  ),
});