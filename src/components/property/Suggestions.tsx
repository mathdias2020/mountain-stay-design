import { useQuery } from "@tanstack/react-query";
import { getSuggestedProperties } from "@/lib/properties.functions";
import { PropertyCard } from "@/components/home/PropertyCard";

interface Props {
  excludeId: string;
  checkin?: string;
  checkout?: string;
  guests?: number;
}

export function Suggestions({ excludeId, checkin, checkout, guests }: Props) {
  const { data } = useQuery({
    queryKey: ["suggestions", excludeId, checkin ?? null, checkout ?? null, guests ?? null],
    queryFn: () =>
      getSuggestedProperties({ data: { excludeId, checkin, checkout, guests } }),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const items = data?.properties ?? [];
  if (items.length === 0) return null;

  const hasDateRange = Boolean(checkin && checkout);

  return (
    <section style={{ paddingTop: 64, paddingBottom: 64, paddingLeft: 24, paddingRight: 24 }}>
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 style={{ fontWeight: 600, fontSize: 26, color: "#1C1C1A" }}>
            Você também pode gostar
          </h2>
          <p style={{ fontSize: 14, color: "#9A9890", marginTop: 8 }}>
            Outras casas selecionadas para você.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              showAvailability={hasDateRange}
              searchParams={{ checkin, checkout, guests }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}