import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Home, MapPin, Users, BedDouble } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import type { PropertyListItem } from "@/lib/properties.functions";

const currency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  property: PropertyListItem;
  showAvailability: boolean;
  searchParams?: {
    checkin?: string;
    checkout?: string;
    guests?: number;
  };
}

export function PropertyCard({ property, showAvailability, searchParams }: Props) {
  const disabled = showAvailability && property.is_available === false;
  const basePrice =
    property.from_price ??
    Math.min(property.price_weekday, property.price_weekend);
  const [imgBroken, setImgBroken] = useState(false);
  const photos = property.photos?.length
    ? property.photos
    : property.cover_url
      ? [property.cover_url]
      : [];
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, Math.max(0, photos.length - 1));
  const currentSrc = photos[safeIndex];
  const hasImg = !!currentSrc && !imgBroken;
  const showArrows = photos.length > 1;
  const [loadedSet, setLoadedSet] = useState<Set<string>>(() => new Set());
  const isLoading = !!currentSrc && !loadedSet.has(currentSrc);

  // Preload all photos in background to warm browser cache.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const imgs: HTMLImageElement[] = [];
    photos.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        setLoadedSet((prev) => {
          if (prev.has(src)) return prev;
          const next = new Set(prev);
          next.add(src);
          return next;
        });
      };
      img.src = src;
      imgs.push(img);
    });
    return () => {
      imgs.forEach((img) => {
        img.onload = null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.join("|")]);

  const go = (e: React.MouseEvent, delta: number) => {
    e.preventDefault();
    e.stopPropagation();
    setImgBroken(false);
    setIndex((i) => {
      const n = photos.length;
      return (i + delta + n) % n;
    });
  };

  return (
    <article
      className={cn(
        "group/card flex flex-col overflow-hidden rounded-[14px] bg-surface border border-border transition-opacity",
        disabled && "opacity-50",
      )}
    >
      {/* Cover */}
      <div data-card-photo className="relative aspect-[4/3] w-full bg-secondary">
        {hasImg ? (
          <>
            <img
              key={currentSrc}
              src={currentSrc}
              alt={`Foto de ${property.name}`}
              loading={safeIndex === 0 ? "lazy" : "eager"}
              decoding="async"
              className={cn(
                "h-full w-full object-cover transition-opacity duration-150",
                isLoading && "opacity-0",
              )}
              onLoad={() =>
                setLoadedSet((prev) => {
                  if (prev.has(currentSrc)) return prev;
                  const next = new Set(prev);
                  next.add(currentSrc);
                  return next;
                })
              }
              onError={() => setImgBroken(true)}
            />
            {isLoading && (
              <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-white/20">
                <div className="h-full w-1/3 animate-[card-photo-progress_1s_linear_infinite] bg-white/80" />
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Home className="h-12 w-12 text-text-muted" strokeWidth={1.5} />
          </div>
        )}

        {showArrows && hasImg && (
          <>
            <button
              type="button"
              onClick={(e) => go(e, -1)}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity hover:bg-black/65 focus:opacity-100 group-hover/card:opacity-100 md:opacity-0 max-md:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => go(e, 1)}
              aria-label="Próxima foto"
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity hover:bg-black/65 focus:opacity-100 group-hover/card:opacity-100 md:opacity-0 max-md:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-all",
                    i === safeIndex ? "bg-white" : "bg-white/50",
                  )}
                />
              ))}
            </div>
          </>
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

        <p className="mt-1 flex items-center gap-2 text-[13px] text-text-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {property.city}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-text-secondary">
          <span className="inline-flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0" />
            até {property.max_guests} hóspedes
          </span>
          <span className="inline-flex items-center gap-2">
            <BedDouble className="h-3.5 w-3.5 shrink-0" />
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
          {disabled ? (
            <Button variant="ghost" className="w-full" disabled>
              Ver detalhes
            </Button>
          ) : (
            <Link
              to="/imovel/$slug"
              params={{ slug: property.slug }}
              search={{
                checkin: searchParams?.checkin,
                checkout: searchParams?.checkout,
                guests: searchParams?.guests,
              }}
              className="block"
            >
              <Button variant="ghost" className="w-full">
                Ver detalhes
              </Button>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export default PropertyCard;