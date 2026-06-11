import { createFileRoute } from "@tanstack/react-router";
import { CategoryListing } from "@/components/whattodo/CategoryListing";

export const Route = createFileRoute("/_public/restaurantes/")({
  head: () => ({
    meta: [
      { title: "Restaurantes da Serra Capixaba — RotainStay" },
      {
        name: "description",
        content:
          "Onde comer bem entre as montanhas — restaurantes selecionados na Serra Capixaba.",
      },
      { property: "og:title", content: "Restaurantes da Serra Capixaba — RotainStay" },
      {
        property: "og:description",
        content:
          "Onde comer bem entre as montanhas — restaurantes selecionados na Serra Capixaba.",
      },
    ],
  }),
  component: () => <CategoryListing category="restaurante" />,
});