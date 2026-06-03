import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/")({
  head: () => ({
    meta: [
      { title: "RotainStay — Nas Montanhas" },
      {
        name: "description",
        content: "Locação de temporada em meio às montanhas.",
      },
      { property: "og:title", content: "RotainStay — Nas Montanhas" },
      {
        property: "og:description",
        content: "Locação de temporada em meio às montanhas.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <h1 className="text-3xl font-semibold text-text-primary">
        Bem-vindo à RotainStay
      </h1>
      <p className="mt-3 text-text-secondary">
        Conteúdo da home será adicionado em breve.
      </p>
    </section>
  );
}