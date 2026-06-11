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

// Group the ordered list into pages of 3 (desktop) — each page is one slide.
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function PropertiesSlideshow({
  properties,
  curation,
  hasFilters,
  searchParams,
  showAvailability,
}: Props) {
  // When filters are active, respect server order; otherwise apply curation.
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

  // Reset autoplay timer when slide list changes
  useEffect(() => {
    autoplay.current?.reset();
  }, [ordered]);

  if (ordered.length === 0) return null;

  const pages = chunk(ordered, 3);
  const loop = pages.length > 1;

  return (
    <div className="relative">
      {/* Desktop / tablet: pages of up to 3 */}
      <div className="hidden sm:block sm:px-12">
        <Carousel
          opts={{ align: "start", loop }}
          plugins={loop ? [autoplay.current] : []}
          className="relative"
        >
          <CarouselContent>
            {pages.map((page, idx) => (
              <CarouselItem key={idx} className="basis-full">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {page.map((p) => (
                    <PropertyCard
                      key={p.id}
                      property={p}
                      showAvailability={showAvailability}
                      searchParams={searchParams}
                    />
                  ))}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {loop && (
            <>
              <CarouselPrevious
                className="-left-12 bg-white shadow-sm"
                aria-label="Anterior"
              />
              <CarouselNext
                className="-right-12 bg-white shadow-sm"
                aria-label="Próximo"
              />
            </>
          )}
        </Carousel>
      </div>

      {/* Mobile: 1 card per slide */}
      <div className="sm:hidden">
        <Carousel
          opts={{ align: "start", loop: ordered.length > 1 }}
          plugins={ordered.length > 1 ? [autoplay.current] : []}
        >
          <CarouselContent>
            {ordered.map((p) => (
              <CarouselItem key={p.id} className="basis-full">
                <PropertyCard
                  property={p}
                  showAvailability={showAvailability}
                  searchParams={searchParams}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  );
}