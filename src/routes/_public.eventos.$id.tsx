import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, ArrowLeft, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { getEventById } from "@/lib/events.functions";

function formatRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" };
  const s = new Date(start + "T00:00:00").toLocaleDateString("pt-BR", opts);
  const e = new Date(end + "T00:00:00").toLocaleDateString("pt-BR", opts);
  return start === end ? s : `${s} – ${e}`;
}

function formatDateTime(v: string) {
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const Route = createFileRoute("/_public/eventos/$id")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["event-detail", params.id],
      queryFn: () => getEventById({ data: { id: params.id } }),
      staleTime: 5 * 60 * 1000,
    });
    if (!data.event) throw notFound();
    return data.event;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} — RotainStay` : "Evento — RotainStay";
    const description = loaderData?.description ?? loaderData?.long_description ?? "Detalhes do evento.";
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description.slice(0, 160) },
      { property: "og:title", content: title },
      { property: "og:description", content: description.slice(0, 160) },
    ];
    if (loaderData?.image_url) {
      meta.push({ property: "og:image", content: loaderData.image_url });
    }
    return { meta };
  },
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-6 py-12 text-center">
      <p style={{ color: "#A63C2E" }}>Não foi possível carregar o evento. {error instanceof Error ? error.message : ""}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-6 py-12 text-center">
      <h1 style={{ fontWeight: 600, fontSize: 24, color: "#1C1C1A" }}>Evento não encontrado</h1>
      <Link to="/eventos" className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Voltar para eventos
      </Link>
    </div>
  ),
  component: EventDetailPage,
});

function EventDetailPage() {
  const params = Route.useParams();
  const { data: event } = useQuery({
    queryKey: ["event-detail", params.id],
    queryFn: () => getEventById({ data: { id: params.id } }),
    staleTime: 5 * 60 * 1000,
    select: (d) => d.event,
  });

  if (!event) return null;

  return (
    <article className="mx-auto max-w-5xl px-6 py-8">
      <Link
        to="/eventos"
        className="inline-flex items-center gap-2 text-sm hover:underline"
        style={{ color: "#5C5B57" }}
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para eventos
      </Link>

      <div className="mt-4 overflow-hidden rounded-[14px] bg-muted aspect-[16/9]">
        {event.image_url && (
          <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
        )}
      </div>

      <header className="mt-6">
        <h1 style={{ fontWeight: 600, fontSize: 30, color: "#1C1C1A" }}>{event.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1" style={{ fontSize: 14, color: "#5C5B57" }}>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> {event.city}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" /> {formatRange(event.start_date, event.end_date)}
          </span>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {event.long_description ? (
            <section>
              <div className="prose prose-neutral max-w-none" style={{ color: "#2F2E2A", fontSize: 15, lineHeight: 1.7 }}>
                <ReactMarkdown>{event.long_description}</ReactMarkdown>
              </div>
            </section>
          ) : event.description ? (
            <section>
              <p style={{ color: "#2F2E2A", fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {event.description}
              </p>
            </section>
          ) : null}

          {event.schedule.length > 0 && (
            <section>
              <h2 style={{ fontWeight: 600, fontSize: 20, color: "#1C1C1A", marginBottom: 12 }}>
                Programação
              </h2>
              <ul className="space-y-3">
                {event.schedule.map((it, i) => (
                  <li
                    key={i}
                    className="rounded-[10px] border p-3"
                    style={{ borderColor: "#ECEBE7", background: "#fff" }}
                  >
                    <div style={{ fontSize: 12, color: "#6B7052", fontWeight: 600, textTransform: "uppercase" }}>
                      {formatDateTime(it.datetime)}
                    </div>
                    <div style={{ fontSize: 15, color: "#1C1C1A", fontWeight: 600, marginTop: 2 }}>
                      {it.title}
                    </div>
                    {it.description && (
                      <p style={{ fontSize: 13, color: "#5C5B57", marginTop: 4 }}>{it.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {event.gallery_urls.length > 0 && (
            <section>
              <h2 style={{ fontWeight: 600, fontSize: 20, color: "#1C1C1A", marginBottom: 12 }}>
                Galeria
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {event.gallery_urls.map((url, i) => (
                  <div key={i} className="aspect-square overflow-hidden rounded-[10px] bg-muted">
                    <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          {(event.location_name || event.location_address || event.map_url) && (
            <div className="rounded-[14px] border p-4" style={{ borderColor: "#ECEBE7", background: "#fff" }}>
              <h3 style={{ fontWeight: 600, fontSize: 15, color: "#1C1C1A" }}>Local</h3>
              {event.location_name && (
                <div className="mt-2" style={{ fontSize: 14, color: "#2F2E2A" }}>
                  {event.location_name}
                </div>
              )}
              {event.location_address && (
                <div className="mt-1" style={{ fontSize: 13, color: "#5C5B57" }}>
                  {event.location_address}
                </div>
              )}
              {event.map_url && (
                <a
                  href={event.map_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm hover:underline"
                  style={{ color: "#6B7052" }}
                >
                  <ExternalLink className="h-4 w-4" /> Ver no mapa
                </a>
              )}
            </div>
          )}

          <div className="rounded-[14px] border p-4" style={{ borderColor: "#ECEBE7", background: "#fff" }}>
            <h3 style={{ fontWeight: 600, fontSize: 15, color: "#1C1C1A" }}>Encontre onde ficar</h3>
            <p className="mt-1" style={{ fontSize: 13, color: "#5C5B57" }}>
              Veja hospedagens disponíveis nas datas do evento.
            </p>
            {event.button_url ? (
              <a
                href={event.button_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium"
                style={{ backgroundColor: "#6B7052", color: "#fff" }}
              >
                {event.button_label}
              </a>
            ) : (
              <Link
                to="/propriedades"
                search={{
                  checkin: event.start_date,
                  checkout: event.end_date,
                  guests: undefined,
                  city: undefined,
                  page: undefined,
                }}
                className="mt-3 inline-flex w-full items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium"
                style={{ backgroundColor: "#6B7052", color: "#fff" }}
              >
                {event.button_label}
              </Link>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}