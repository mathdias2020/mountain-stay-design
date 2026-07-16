import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin } from "lucide-react";
import { getHomeEvents, type EventPublic } from "@/lib/events.functions";

function formatRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const s = new Date(start + "T00:00:00").toLocaleDateString("pt-BR", opts);
  const e = new Date(end + "T00:00:00").toLocaleDateString("pt-BR", opts);
  return start === end ? s : `${s} – ${e}`;
}

export function EventCard({ event }: { event: EventPublic }) {
  const href =
    event.button_url && event.button_url.trim().length > 0
      ? event.button_url
      : null;

  const primaryBtn = (
    <span
      className="inline-flex items-center justify-center w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors"
      style={{ backgroundColor: "#6B7052", color: "#fff" }}
    >
      Ver detalhes
    </span>
  );
  const secondaryBtn = (
    <span
      className="inline-flex items-center justify-center w-full px-3 py-2.5 rounded-md text-sm font-medium transition-colors border"
      style={{ borderColor: "#6B7052", color: "#6B7052", backgroundColor: "transparent" }}
    >
      {event.button_label}
    </span>
  );

  return (
    <article
      className="overflow-hidden rounded-[14px] bg-surface border border-border flex flex-col"
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
        <img
          src={event.image_url}
          alt={event.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 style={{ fontWeight: 600, fontSize: 16, color: "#1C1C1A" }}>
          {event.title}
        </h3>
        <div
          className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1"
          style={{ fontSize: 12, color: "#5C5B57" }}
        >
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {event.city}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatRange(event.start_date, event.end_date)}
          </span>
        </div>
        {event.description && (
          <p
            className="mt-2 line-clamp-3"
            style={{ fontSize: 13, color: "#5C5B57" }}
          >
            {event.description}
          </p>
        )}
        <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
          <Link
            to="/eventos/$id"
            params={{ id: event.id }}
            className="block"
          >
            {primaryBtn}
          </Link>
          {href ? (
            <a href={href} target="_blank" rel="noreferrer" className="block">
              {secondaryBtn}
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
              className="block"
            >
              {secondaryBtn}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function EventsSection() {
  const { data } = useQuery({
    queryKey: ["events-home"],
    queryFn: () => getHomeEvents(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const events = data?.events ?? [];
  if (events.length === 0) return null;

  return (
    <section
      style={{ paddingBottom: 64 }}
      className="bg-background"
      aria-label="Eventos na região"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <span
            style={{ color: "#9A9890", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            Eventos
          </span>
          <h2 className="mt-2" style={{ fontWeight: 600, fontSize: 26, color: "#1C1C1A" }}>
            Eventos na região
          </h2>
          <p style={{ fontSize: 14, color: "#5C5B57", marginTop: 6 }}>
            Confira o que está acontecendo e encontre uma hospedagem perto.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            to="/eventos"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-[#CFCEC9] transition-colors"
          >
            Ver todos os eventos
          </Link>
        </div>
      </div>
    </section>
  );
}