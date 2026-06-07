import { useEffect, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { toast } from "sonner";
import {
  MapPin,
  Users,
  BedDouble,
  Bath,
  Car,
  PawPrint,
  ExternalLink,
  Clock,
} from "lucide-react";
import { getPropertyDetail } from "@/lib/properties.functions";
import { PhotoGallery } from "@/components/property/PhotoGallery";
import { AmenitiesList } from "@/components/property/AmenitiesList";
import { BookingCard } from "@/components/property/BookingCard";
import { AvailabilityCalendar } from "@/components/property/AvailabilityCalendar";
import { expandBlockedDates } from "@/lib/pricing";
import { DetailPageSkeleton } from "@/components/skeletons/DetailPageSkeleton";
import { Suggestions } from "@/components/property/Suggestions";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(new Date(s).getTime()));

const detailSearchSchema = z.object({
  checkin: fallback(isoDate.optional(), undefined),
  checkout: fallback(isoDate.optional(), undefined),
  guests: fallback(z.number().int().min(1).max(30).optional(), undefined),
});

const propertyQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["property", slug],
    queryFn: () => getPropertyDetail({ data: { slug } }),
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const Route = createFileRoute("/_public/imovel/$slug")({
  validateSearch: zodValidator(detailSearchSchema),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(propertyQueryOptions(params.slug)),
  component: PropertyDetailPage,
});

function PropertyDetailPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const { data: property, isLoading, isError } = useQuery(
    propertyQueryOptions(slug),
  );

  useEffect(() => {
    if (isError) {
      toast.error("Propriedade não encontrada.");
      navigate({ to: "/" });
    }
  }, [isError, navigate]);

  const blockedSet = useMemo(
    () => expandBlockedDates(property?.blocked_ranges ?? []),
    [property],
  );

  const initialCheckin = useMemo(
    () => (search.checkin ? new Date(`${search.checkin}T00:00:00`) : undefined),
    [search.checkin],
  );
  const initialCheckout = useMemo(
    () => (search.checkout ? new Date(`${search.checkout}T00:00:00`) : undefined),
    [search.checkout],
  );
  const initialGuests = useMemo(() => {
    if (!property || !search.guests) return undefined;
    return search.guests >= 1 && search.guests <= property.max_guests
      ? search.guests
      : undefined;
  }, [property, search.guests]);

  if (isLoading || !property) {
    return <DetailPageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        {/* Coluna principal */}
        <div>
          <PhotoGallery photos={property.photos} propertyName={property.name} />

          <header className="mt-6">
            <h1 className="text-[26px] font-semibold text-text-primary">
              {property.name}
            </h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-text-muted">
              <MapPin className="h-4 w-4" />
              {property.city}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-text-secondary">
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4" />
                até {property.max_guests} hóspedes
              </span>
              <span className="inline-flex items-center gap-2">
                <BedDouble className="h-4 w-4" />
                {property.bedrooms}{" "}
                {property.bedrooms === 1 ? "quarto" : "quartos"}
              </span>
              <span className="inline-flex items-center gap-2">
                <Bath className="h-4 w-4" />
                {property.bathrooms}{" "}
                {property.bathrooms === 1 ? "banheiro" : "banheiros"}
              </span>
              <span className="inline-flex items-center gap-2">
                <Car className="h-4 w-4" />
                {property.parking_spots}{" "}
                {property.parking_spots === 1 ? "vaga" : "vagas"}
              </span>
            </div>
          </header>

          <hr className="my-6 border-border" />

          <section>
            <h2 className="text-lg font-semibold text-text-primary">
              Sobre esta propriedade
            </h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-[1.7] text-text-secondary">
              {property.description ?? "Sem descrição."}
            </p>
          </section>

          <hr className="my-6 border-border" />

          <section>
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              O que esta casa oferece
            </h2>
            <AmenitiesList items={property.amenities} />
          </section>

          <hr className="my-6 border-border" />

          <section>
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              Regras da casa
            </h2>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-primary" />
                Check-in a partir das {property.checkin_time}
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-primary" />
                Check-out até {property.checkout_time}
              </li>
              <li className="flex items-center gap-2">
                <PawPrint className="h-4 w-4 shrink-0 text-primary" />
                Aceita pets: {property.accepts_pets ? "Sim" : "Não"}
              </li>
            </ul>
            {property.house_rules && (
              <p className="mt-4 whitespace-pre-line text-sm text-text-secondary">
                {property.house_rules}
              </p>
            )}
          </section>

          <hr className="my-6 border-border" />

          <section>
            <h2 className="mb-3 text-lg font-semibold text-text-primary">
              Localização
            </h2>
            <p className="flex items-center gap-2 text-sm text-text-secondary">
              <MapPin className="h-4 w-4 shrink-0" />
              {property.city}
            </p>
            {property.google_maps_url && (
              <a
                href={property.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
              >
                <ExternalLink className="h-4 w-4" />
                Ver no Google Maps
              </a>
            )}
          </section>
        </div>

        {/* Coluna lateral */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <BookingCard
            property={property}
            blockedSet={blockedSet}
            initialCheckin={initialCheckin}
            initialCheckout={initialCheckout}
            initialGuests={initialGuests}
          />
          <AvailabilityCalendar blockedSet={blockedSet} />
        </aside>
      </div>
      <Suggestions
        excludeId={property.id}
        checkin={search.checkin}
        checkout={search.checkout}
        guests={search.guests}
      />
    </div>
  );
}