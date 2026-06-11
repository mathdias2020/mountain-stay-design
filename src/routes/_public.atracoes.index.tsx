import { createFileRoute } from "@tanstack/react-router";
import { CategoryListing } from "@/components/whattodo/CategoryListing";

export const Route = createFileRoute("/_public/atracoes/")({
  head: () => ({
    meta: [
      { title: "Atrações da Serra Capixaba — RotainStay" },
      {
        name: "description",
        content:
          "Cachoeiras, mirantes e parques para visitar na Serra Capixaba.",
      },
      { property: "og:title", content: "Atrações da Serra Capixaba — RotainStay" },
      {
        property: "og:description",
        content:
          "Cachoeiras, mirantes e parques para visitar na Serra Capixaba.",
      },
    ],
  }),
  component: () => <CategoryListing category="atracao" />,
});