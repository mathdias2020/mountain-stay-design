import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import {
  getAttractionsByCategory,
  type AttractionCategory,
} from "@/lib/attractions.functions";

const META: Record<
  AttractionCategory,
  {
    title: string;
    description: string;
    detailRoute: "/atracoes/$slug" | "/restaurantes/$slug" | "/passeios/$slug";
    emptyLabel: string;
  }
> = {
  atracao: {
    title: "Atrações da Serra Capixaba",
    description: "Cachoeiras, mirantes, parques e cenários para visitar.",
    detailRoute: "/atracoes/$slug",
    emptyLabel: "Nenhuma atração cadastrada ainda.",
  },
  restaurante: {
    title: "Restaurantes da Serra Capixaba",
    description: "Onde comer bem entre as montanhas — da cozinha pomerana ao café colonial.",
    detailRoute: "/restaurantes/$slug",
    emptyLabel: "Nenhum restaurante cadastrado ainda.",
  },
  passeio: {
    title: "Passeios na Serra Capixaba",
    description: "Trilhas, vinícolas, cervejarias e experiências para a sua estadia.",
    detailRoute: "/passeios/$slug",
    emptyLabel: "Nenhum passeio cadastrado ainda.",
  },
};

export function CategoryListing({ category }: { category: AttractionCategory }) {
  const meta = META[category];
  const { data, isLoading } = useQuery({
    queryKey: ["attractions", category],
    queryFn: () => getAttractionsByCategory({ data: { category } }),
    staleTime: 5 * 60 * 1000,
  });

  const items = data?.items ?? [];

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-8 max-w-2xl">
        <h1 style={{ fontWeight: 600, fontSize: 30, color: "#1C1C1A" }}>
          {meta.title}
        </h1>
        <p className="mt-2" style={{ fontSize: 15, color: "#5C5B57" }}>
          {meta.description}
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[4/3] animate-pulse rounded-[14px] bg-secondary"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-surface p-10 text-center">
          <p className="text-text-secondary">{meta.emptyLabel}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.id}
              to={meta.detailRoute}
              params={{ slug: item.slug }}
              className="group block overflow-hidden rounded-[14px] border border-border bg-white"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={item.cover_url}
                  alt={item.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <div
                  className="flex items-center gap-1 text-xs"
                  style={{ color: "#9A9890" }}
                >
                  <MapPin className="h-3 w-3" />
                  {item.city}
                </div>
                <h3
                  className="mt-1"
                  style={{ fontSize: 17, fontWeight: 600, color: "#1C1C1A" }}
                >
                  {item.title}
                </h3>
                {item.short_description && (
                  <p
                    className="mt-1 line-clamp-2"
                    style={{ fontSize: 14, color: "#5C5B57" }}
                  >
                    {item.short_description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}