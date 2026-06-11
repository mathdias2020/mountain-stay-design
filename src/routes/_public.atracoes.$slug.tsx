import { createFileRoute } from "@tanstack/react-router";
import { AttractionDetailRouteContent } from "@/components/whattodo/AttractionDetail";

export const Route = createFileRoute("/_public/atracoes/$slug")({
  head: () => ({
    meta: [{ title: "Atração — RotainStay" }],
  }),
  component: () => {
    const { slug } = Route.useParams();
    return <AttractionDetailRouteContent category="atracao" slug={slug} />;
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Atração não encontrada</h1>
    </div>
  ),
});