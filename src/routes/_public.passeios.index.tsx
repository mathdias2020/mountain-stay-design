import { createFileRoute } from "@tanstack/react-router";
import { CategoryListing } from "@/components/whattodo/CategoryListing";

export const Route = createFileRoute("/_public/passeios/")({
  head: () => ({
    meta: [
      { title: "Passeios na Serra Capixaba — RotainStay" },
      {
        name: "description",
        content:
          "Trilhas, vinícolas e experiências para curtir na Serra Capixaba.",
      },
      { property: "og:title", content: "Passeios na Serra Capixaba — RotainStay" },
      {
        property: "og:description",
        content:
          "Trilhas, vinícolas e experiências para curtir na Serra Capixaba.",
      },
    ],
  }),
  component: () => <CategoryListing category="passeio" />,
});