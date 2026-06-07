import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Hero } from "@/components/home/Hero";
import { FiltersCard, type HomeFilters } from "@/components/home/FiltersCard";
import { PropertyCard } from "@/components/home/PropertyCard";
import { PropertyCardSkeleton } from "@/components/home/PropertyCardSkeleton";
import { Button } from "@/components/Button";
import { searchProperties } from "@/lib/properties.functions";

const CITY_VALUES = [
  "Domingos Martins",
  "Pedra Azul",
  "Marechal Floriano",
  "Venda Nova do Imigrante",
  "Paraju",
  "Outro",
] as const;

const searchSchema = z.object({
  checkin: fallback(z.string().optional(), undefined),
  checkout: fallback(z.string().optional(), undefined),
  guests: fallback(z.number().int().min(1).max(20).optional(), undefined),
  city: fallback(z.enum(CITY_VALUES).optional(), undefined),
});

export const Route = createFileRoute("/_public/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "RotainStay — Nas Montanhas" },
      {
        name: "description",
        content:
          "Casas e chalés para temporada em Domingos Martins, Pedra Azul e região serrana do Espírito Santo.",
      },
      { property: "og:title", content: "RotainStay — Nas Montanhas" },
      {
        property: "og:description",
        content:
          "Casas e chalés para temporada em Domingos Martins, Pedra Azul e região serrana do Espírito Santo.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const hasDateRange = Boolean(search.checkin && search.checkout);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "properties",
      search.checkin ?? null,
      search.checkout ?? null,
      search.guests ?? null,
      search.city ?? null,
    ],
    queryFn: () =>
      searchProperties({
        data: {
          checkin: search.checkin,
          checkout: search.checkout,
          guests: search.guests,
          city: search.city,
        },
      }),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const properties = data?.properties ?? [];
  const count = properties.length;

  const handleSearch = (next: HomeFilters) => {
    navigate({
      search: {
        checkin: next.checkin,
        checkout: next.checkout,
        guests: next.guests,
        city: next.city as (typeof CITY_VALUES)[number] | undefined,
      },
    });
  };

  const clearFilters = () =>
    navigate({
      search: {
        checkin: undefined,
        checkout: undefined,
        guests: undefined,
        city: undefined,
      },
    });

  return (
    <>
      <Hero />

      <FiltersCard
        initial={{
          checkin: search.checkin,
          checkout: search.checkout,
          guests: search.guests,
          city: search.city,
        }}
        onSearch={handleSearch}
      />

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 flex items-baseline gap-2">
          <h2 className="text-xl font-semibold text-text-primary">
            Propriedades disponíveis
          </h2>
          {!isLoading && !isError && (
            <span className="text-sm text-text-muted">
              ({count} {count === 1 ? "casa encontrada" : "casas encontradas"})
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <PropertyCardSkeleton />
            <PropertyCardSkeleton />
            <PropertyCardSkeleton />
          </div>
        ) : isError ? (
          <div className="rounded-[14px] border border-border bg-surface p-10 text-center">
            <p className="text-text-secondary">
              Não foi possível carregar as propriedades.{" "}
              {error instanceof Error ? error.message : ""}
            </p>
          </div>
        ) : count === 0 ? (
          <div className="rounded-[14px] border border-border bg-surface p-10 text-center">
            <p className="text-text-secondary">
              Nenhuma propriedade encontrada para os filtros selecionados. Tente outras
              datas ou remova alguns filtros.
            </p>
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                showAvailability={hasDateRange}
                searchParams={{
                  checkin: search.checkin,
                  checkout: search.checkout,
                  guests: search.guests,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}