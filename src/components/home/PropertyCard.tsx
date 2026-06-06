import { useState } from "react";
import { Home, MapPin, Users, BedDouble } from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import type { PropertyListItem } from "@/lib/properties.functions";

const currency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  property: PropertyListItem;
  showAvailability: boolean;
}

export function PropertyCard({ property, showAvailability }: Props) {
  const disabled = showAvailability && property.is_available === false;
  const basePrice = Math.min(property.price_weekday, property.price_weekend);
  const [imgBroken, setImgBroken] = useState(false);
  const hasImg = !!property.cover_url && !imgBroken;

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-[14px] bg-surface border border-border transition-opacity",
        disabled && "opacity-50",
      )}
    >
      {/* Cover */}
      <div className="relative aspect-[4/3] w-full bg-secondary">
        {hasImg ? (
          <img
            src={property.cover_url!}
            alt={`Foto de ${property.name}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setImgBroken(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Home className="h-12 w-12 text-text-muted" strokeWidth={1.5} />
          </div>
        )}

        {showAvailability && property.is_available !== null && (
          <span
            className={cn(
              "absolute right-3 top-3 inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-medium",
              property.is_available
                ? "bg-[#D4EDDA] text-[#1A5C2A]"
                : "bg-[#E2E1DD] text-[#3A3A38]",
            )}
          >
            {property.is_available ? "Disponível" : "Indisponível"}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[16px] font-semibold text-text-primary">{property.name}</h3>

        <p className="mt-1 flex items-center gap-1 text-[13px] text-text-muted">
          <MapPin className="h-3.5 w-3.5" />
          {property.city}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-text-secondary">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            até {property.max_guests} hóspedes
          </span>
          <span className="inline-flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" />
            {property.bedrooms} {property.bedrooms === 1 ? "quarto" : "quartos"}
          </span>
        </div>

        <div className="mt-3">
          <p className="text-[15px] font-semibold text-primary">
            A partir de {currency(basePrice)}/noite
          </p>
          {property.estimated_total !== null && (
            <p className="mt-0.5 text-[13px] text-text-secondary">
              Total estimado: {currency(property.estimated_total)}
            </p>
          )}
        </div>

        <div className="mt-auto pt-3">
          <Button
            variant="ghost"
            className="w-full"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                // Página de detalhes ainda não existe; placeholder.
                window.location.href = `/imovel/${property.slug}`;
              }
            }}
          >
            Ver detalhes
          </Button>
        </div>
      </div>
    </article>
  );
}

export default PropertyCard;