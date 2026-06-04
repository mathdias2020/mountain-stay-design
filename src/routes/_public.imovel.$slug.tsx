import { useEffect } from "react";
import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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

export const Route = createFileRoute("/_public/imovel/$slug")({
  component: PropertyDetailPage,
});

function PropertyDetailPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();

  const { data: property, isLoading, isError } = useQuery({
    queryKey: ["property", slug],
    queryFn: () => getPropertyDetail({ data: { slug } }),
    retry: false,
  });

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
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                até {property.max_guests} hóspedes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BedDouble className="h-4 w-4" />
                {property.bedrooms}{" "}
                {property.bedrooms === 1 ? "quarto" : "quartos"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Bath className="h-4 w-4" />
                {property.bathrooms}{" "}
                {property.bathrooms === 1 ? "banheiro" : "banheiros"}
              </span>
              <span className="inline-flex items-center gap-1.5">
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
              <li className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Check-in a partir das {property.checkin_time}
              </li>
              <li className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Check-out até {property.checkout_time}
              </li>
              <li className="flex items-center gap-2">
                <PawPrint className="h-4 w-4 text-primary" />
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
              <MapPin className="h-4 w-4" />
              {property.city}
            </p>
            {property.google_maps_url && (
              <a
                href={property.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
              >
                <ExternalLink className="h-4 w-4" />
                Ver no Google Maps
              </a>
            )}
          </section>
        </div>

        {/* Coluna lateral */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <BookingCard property={property} blockedSet={blockedSet} />
          <AvailabilityCalendar blockedSet={blockedSet} />
        </aside>
      </div>
    </div>
  );
}