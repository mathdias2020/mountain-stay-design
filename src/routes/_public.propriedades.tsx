import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { FiltersCard, type HomeFilters } from "@/components/home/FiltersCard";
import { PropertyCard } from "@/components/home/PropertyCard";
import { PropertyCardSkeleton } from "@/components/home/PropertyCardSkeleton";
import { Button } from "@/components/Button";
import { searchProperties } from "@/lib/properties.functions";

const searchSchema = z.object({
  checkin: fallback(z.string().optional(), undefined),
  checkout: fallback(z.string().optional(), undefined),
  guests: fallback(z.number().int().min(1).max(20).optional(), undefined),
  city: fallback(z.string().max(80).optional(), undefined),
  page: fallback(z.number().int().min(1).optional(), undefined),
});

const PAGE_SIZE = 12;

export const Route = createFileRoute("/_public/propriedades")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Todas as propriedades — RotainStay" },
      {
        name: "description",
        content:
          "Portfólio completo de casas e chalés para temporada na região serrana do Espírito Santo.",
      },
      { property: "og:title", content: "Todas as propriedades — RotainStay" },
      {
        property: "og:description",
        content:
          "Portfólio completo de casas e chalés para temporada na região serrana do Espírito Santo.",
      },
    ],
  }),
  component: AllPropertiesPage,
});

function AllPropertiesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const hasDateRange = Boolean(search.checkin && search.checkout);

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "properties-all",
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
  });

  const all = data?.properties ?? [];
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, search.page ?? 1), totalPages);
  const pageItems = useMemo(
    () => all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [all, page],
  );

  const handleSearch = (next: HomeFilters) => {
    navigate({
      search: {
        checkin: next.checkin,
        checkout: next.checkout,
        guests: next.guests,
        city: next.city,
        page: undefined,
      },
    });
  };

  const goPage = (n: number) =>
    navigate({
      search: (prev: z.infer<typeof searchSchema>) => ({
        ...prev,
        page: n === 1 ? undefined : n,
      }),
    });

  return (
    <>
      <section className="bg-background" style={{ paddingTop: 48, paddingBottom: 48 }}>
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h1
            style={{
              fontWeight: 600,
              fontSize: 32,
              color: "#1C1C1A",
            }}
          >
            Todas as propriedades
          </h1>
          <p
            className="mt-2"
            style={{ fontSize: 16, color: "#5C5B57", fontWeight: 400 }}
          >
            Conheça nosso portfólio completo de casas e chalés.
          </p>
        </div>
      </section>

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
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PropertyCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-[14px] border border-border bg-surface p-10 text-center">
            <p className="text-text-secondary">Não foi possível carregar as propriedades.</p>
          </div>
        ) : all.length === 0 ? (
          <div className="rounded-[14px] border border-border bg-surface p-10 text-center">
            <p className="text-text-secondary">
              Nenhuma propriedade encontrada para os filtros selecionados.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-sm text-text-muted">
              {all.length} {all.length === 1 ? "casa encontrada" : "casas encontradas"}
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((p) => (
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

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  disabled={page <= 1}
                  onClick={() => goPage(page - 1)}
                >
                  Anterior
                </Button>
                <span className="px-3 text-sm text-text-secondary">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="ghost"
                  disabled={page >= totalPages}
                  onClick={() => goPage(page + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}