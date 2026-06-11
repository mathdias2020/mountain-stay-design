import { useEffect, useMemo, useRef } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { PropertyCard } from "@/components/home/PropertyCard";
import { applyCuration, type PropertiesCuration } from "@/lib/home.functions";
import type { PropertyListItem } from "@/lib/properties.functions";

type Props = {
  properties: PropertyListItem[];
  curation: PropertiesCuration;
  hasFilters: boolean;
  searchParams: {
    checkin?: string;
    checkout?: string;
    guests?: number;
  };
  showAvailability: boolean;
};

const AUTOPLAY_DELAY = 7000;

export function PropertiesSlideshow({
  properties,
  curation,
  hasFilters,
  searchParams,
  showAvailability,
}: Props) {
  const ordered = useMemo(
    () => (hasFilters ? properties : applyCuration(properties, curation)),
    [properties, curation, hasFilters],
  );

  const autoplay = useRef(
    Autoplay({
      delay: AUTOPLAY_DELAY,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }),
  );

  useEffect(() => {
    autoplay.current?.reset();
  }, [ordered]);

  if (ordered.length === 0) return null;

  // Loop + setas só fazem sentido quando há mais do que cabe na tela (3 no desktop).
  const loop = ordered.length > 3;

  return (
    <div className="relative sm:px-12">
      <Carousel
        opts={{ align: "start", loop, slidesToScroll: 1 }}
        plugins={loop ? [autoplay.current] : []}
        className="relative"
      >
        <CarouselContent className="-ml-6">
          {ordered.map((p) => (
            <CarouselItem
              key={p.id}
              className="pl-6 basis-full sm:basis-1/2 lg:basis-1/3"
            >
              <PropertyCard
                property={p}
                showAvailability={showAvailability}
                searchParams={searchParams}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {loop && (
          <>
            <CarouselPrevious
              className="-left-12 hidden bg-white shadow-sm sm:flex"
              aria-label="Anterior"
            />
            <CarouselNext
              className="-right-12 hidden bg-white shadow-sm sm:flex"
              aria-label="Próximo"
            />
          </>
        )}
      </Carousel>
    </div>
  );
}