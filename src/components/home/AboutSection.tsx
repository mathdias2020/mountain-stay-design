import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { getHomeAbout } from "@/lib/home.functions";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80";

export function AboutSection() {
  const { data } = useQuery({
    queryKey: ["home-about"],
    queryFn: () => getHomeAbout(),
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;

  const image = data.image_url || FALLBACK_IMAGE;

  return (
    <section
      style={{ paddingTop: 64, paddingBottom: 64 }}
      className="bg-surface"
      aria-label="Sobre a marca"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <span
              style={{
                color: "#9A9890",
                fontSize: 13,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Sobre
            </span>
            <h2
              className="mt-2"
              style={{ fontWeight: 600, fontSize: 28, color: "#1C1C1A", lineHeight: 1.2 }}
            >
              {data.title}
            </h2>
            <p
              className="mt-4 whitespace-pre-line"
              style={{ fontSize: 15, color: "#5C5B57", lineHeight: 1.7 }}
            >
              {data.body}
            </p>
            <Link
              to="/sobre"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-colors"
              style={{ backgroundColor: "#6B7052", color: "#fff" }}
            >
              {data.cta_label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="order-1 md:order-2">
            <div className="overflow-hidden rounded-[14px] border border-border">
              <img
                src={image}
                alt={data.title}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}