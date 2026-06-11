import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Autoplay from "embla-carousel-autoplay";
import { Instagram } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getInstagramPosts } from "@/lib/instagram.functions";

const INSTAGRAM_HANDLE = "rotainstay";
const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`;

export function InstagramCarousel() {
  const { data } = useQuery({
    queryKey: ["instagram-posts"],
    queryFn: () => getInstagramPosts(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const autoplay = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  const posts = data?.posts ?? [];
  if (posts.length === 0) return null;

  return (
    <section
      style={{ paddingTop: 64, paddingBottom: 64 }}
      className="bg-background"
      aria-label="Posts do Instagram"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <span
            className="inline-flex items-center gap-2"
            style={{ color: "#9A9890", fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            <Instagram className="h-4 w-4" />
            Instagram
          </span>
          <h2 className="mt-2" style={{ fontWeight: 600, fontSize: 26, color: "#1C1C1A" }}>
            Siga no Instagram
          </h2>
          <p style={{ fontSize: 14, color: "#5C5B57", marginTop: 6 }}>
            Acompanhe nosso dia a dia em{" "}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium hover:underline"
              style={{ color: "#1C1C1A" }}
            >
              @{INSTAGRAM_HANDLE}
            </a>
            .
          </p>
        </div>

        <Carousel
          opts={{ align: "start", loop: true }}
          plugins={[autoplay.current]}
          className="relative px-10 sm:px-12"
        >
          <CarouselContent className="-ml-4">
            {posts.map((post) => {
              const card = (
                <div className="overflow-hidden rounded-[14px] bg-surface border border-border">
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    <img
                      src={post.image_url}
                      alt={post.caption ?? "Post do Instagram"}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  {post.caption && (
                    <p
                      className="px-3 py-2 line-clamp-2"
                      style={{ fontSize: 12, color: "#5C5B57" }}
                    >
                      {post.caption}
                    </p>
                  )}
                </div>
              );
              return (
                <CarouselItem
                  key={post.id}
                  className="pl-4 basis-full sm:basis-1/2 lg:basis-1/4"
                >
                  {post.post_url ? (
                    <a
                      href={post.post_url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Abrir post no Instagram"
                      className="block"
                    >
                      {card}
                    </a>
                  ) : (
                    card
                  )}
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious
            className="left-0 sm:-left-2 bg-white"
            aria-label="Post anterior"
          />
          <CarouselNext
            className="right-0 sm:-right-2 bg-white"
            aria-label="Próximo post"
          />
        </Carousel>
      </div>
    </section>
  );
}