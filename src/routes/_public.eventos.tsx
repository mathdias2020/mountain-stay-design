import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { EventCard } from "@/components/home/EventsSection";
import { getAllEvents } from "@/lib/events.functions";

export const Route = createFileRoute("/_public/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos na região — RotainStay" },
      {
        name: "description",
        content:
          "Confira os próximos eventos nas cidades atendidas pela RotainStay e encontre hospedagens nas datas.",
      },
      { property: "og:title", content: "Eventos na região — RotainStay" },
      {
        property: "og:description",
        content:
          "Confira os próximos eventos nas cidades atendidas pela RotainStay e encontre hospedagens nas datas.",
      },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["events-all"],
    queryFn: () => getAllEvents(),
    staleTime: 5 * 60 * 1000,
  });

  const events = data?.events ?? [];

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-8">
        <h1 style={{ fontWeight: 600, fontSize: 28, color: "#1C1C1A" }}>
          Eventos na região
        </h1>
        <p style={{ fontSize: 14, color: "#5C5B57", marginTop: 6 }}>
          Próximos eventos nas cidades atendidas. Clique em um evento para ver
          hospedagens disponíveis nas datas.
        </p>
      </header>

      {isLoading ? (
        <p style={{ color: "#5C5B57" }}>Carregando...</p>
      ) : isError ? (
        <p style={{ color: "#A63C2E" }}>Não foi possível carregar os eventos.</p>
      ) : events.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-surface p-10 text-center">
          <p className="text-text-secondary">
            Nenhum evento programado no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </section>
  );
}