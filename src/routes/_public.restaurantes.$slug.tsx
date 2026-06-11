import { createFileRoute } from "@tanstack/react-router";
import { AttractionDetailRouteContent } from "@/components/whattodo/AttractionDetail";

export const Route = createFileRoute("/_public/restaurantes/$slug")({
  head: () => ({ meta: [{ title: "Restaurante — RotainStay" }] }),
  component: () => {
    const { slug } = Route.useParams();
    return <AttractionDetailRouteContent category="restaurante" slug={slug} />;
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Restaurante não encontrado</h1>
    </div>
  ),
});