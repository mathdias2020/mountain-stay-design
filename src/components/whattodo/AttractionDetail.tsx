import { useQuery } from "@tanstack/react-query";
import { Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import {
  getAttractionBySlug,
  type AttractionCategory,
  type AttractionDetail as AttractionDetailType,
} from "@/lib/attractions.functions";

const BACK: Record<AttractionCategory, { to: "/atracoes" | "/restaurantes" | "/passeios"; label: string }> = {
  atracao: { to: "/atracoes", label: "Atrações" },
  restaurante: { to: "/restaurantes", label: "Restaurantes" },
  passeio: { to: "/passeios", label: "Passeios" },
};

export function AttractionDetailView({
  category,
  item,
}: {
  category: AttractionCategory;
  item: AttractionDetailType;
}) {
  const back = BACK[category];
  const [activeImage, setActiveImage] = useState(item.cover_url);
  const thumbs = [item.cover_url, ...item.gallery_urls].filter(Boolean);

  return (
    <article className="mx-auto max-w-6xl px-6 py-10">
      <Link
        to={back.to}
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: "#6B7052" }}
      >
        <ArrowLeft className="h-4 w-4" />
        {back.label}
      </Link>

      <header className="mt-4">
        <div
          className="flex items-center gap-1 text-xs"
          style={{ color: "#9A9890" }}
        >
          <MapPin className="h-3 w-3" />
          {item.city}
        </div>
        <h1
          className="mt-1"
          style={{ fontWeight: 600, fontSize: 32, color: "#1C1C1A" }}
        >
          {item.title}
        </h1>
        {item.short_description && (
          <p className="mt-2" style={{ fontSize: 16, color: "#5C5B57" }}>
            {item.short_description}
          </p>
        )}
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-[14px] border border-border">
            <img
              src={activeImage}
              alt={item.title}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          {thumbs.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {thumbs.map((url) => (
                <button
                  type="button"
                  key={url}
                  onClick={() => setActiveImage(url)}
                  className="shrink-0 overflow-hidden rounded-md border"
                  style={{
                    borderColor: url === activeImage ? "#6B7052" : "#E2E1DD",
                    width: 96,
                    height: 72,
                  }}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {item.long_description && (
            <div className="rounded-[14px] border border-border bg-surface p-5">
              <h2
                style={{
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#9A9890",
                }}
              >
                Sobre o lugar
              </h2>
              <p
                className="mt-2 whitespace-pre-line"
                style={{ fontSize: 15, color: "#1C1C1A", lineHeight: 1.6 }}
              >
                {item.long_description}
              </p>
            </div>
          )}

          {item.external_url && (
            <a
              href={item.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-medium transition-colors"
              style={{ backgroundColor: "#6B7052", color: "#fff" }}
            >
              Visitar site oficial
              <ExternalLink className="h-4 w-4" />
            </a>
          )}

          <Link
            to="/propriedades"
            search={{ city: item.city as never }}
            className="inline-flex w-full items-center justify-center rounded-md border px-5 py-3 text-sm font-medium transition-colors"
            style={{ borderColor: "#E2E1DD", color: "#1C1C1A" }}
          >
            Encontrar hospedagem em {item.city}
          </Link>
        </aside>
      </div>
    </article>
  );
}

export function AttractionDetailRouteContent({
  category,
  slug,
}: {
  category: AttractionCategory;
  slug: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["attraction", category, slug],
    queryFn: () => getAttractionBySlug({ data: { category, slug } }),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="aspect-[4/3] animate-pulse rounded-[14px] bg-secondary" />
      </div>
    );
  }
  if (!data?.item) throw notFound();
  return <AttractionDetailView category={category} item={data.item} />;
}