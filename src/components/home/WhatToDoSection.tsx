import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mountain, UtensilsCrossed, Footprints, ArrowRight } from "lucide-react";
import { getCategoryHighlights } from "@/lib/attractions.functions";

const CATEGORIES = [
  {
    key: "atracao" as const,
    label: "Atrações",
    tagline: "Cachoeiras, mirantes e cenários",
    icon: Mountain,
    to: "/atracoes",
  },
  {
    key: "restaurante" as const,
    label: "Restaurantes",
    tagline: "Sabores da serra",
    icon: UtensilsCrossed,
    to: "/restaurantes",
  },
  {
    key: "passeio" as const,
    label: "Passeios",
    tagline: "Trilhas e experiências",
    icon: Footprints,
    to: "/passeios",
  },
];

const FALLBACK =
  "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80";

export function WhatToDoSection() {
  const { data } = useQuery({
    queryKey: ["category-highlights"],
    queryFn: () => getCategoryHighlights(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <section
      style={{ paddingBottom: 64 }}
      className="bg-background"
      aria-label="O que fazer na Serra Capixaba"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <span
            style={{
              color: "#9A9890",
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Explore a região
          </span>
          <h2 className="mt-2" style={{ fontWeight: 600, fontSize: 26, color: "#1C1C1A" }}>
            O que fazer na Serra Capixaba
          </h2>
          <p style={{ fontSize: 14, color: "#5C5B57", marginTop: 6 }}>
            Atrações, restaurantes e passeios selecionados para sua estadia.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const info = data?.[c.key];
            const cover = info?.cover ?? FALLBACK;
            return (
              <Link
                key={c.key}
                to={c.to}
                className="group relative block overflow-hidden rounded-[14px] border border-border"
                style={{ aspectRatio: "4 / 5" }}
              >
                <img
                  src={cover}
                  alt={c.label}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.75) 100%)",
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <span
                      style={{
                        fontSize: 12,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        opacity: 0.85,
                      }}
                    >
                      {info && info.count > 0
                        ? `${info.count} ${info.count === 1 ? "lugar" : "lugares"}`
                        : "Em breve"}
                    </span>
                  </div>
                  <h3 className="mt-2" style={{ fontSize: 24, fontWeight: 600 }}>
                    {c.label}
                  </h3>
                  <p style={{ fontSize: 13, opacity: 0.9 }}>{c.tagline}</p>
                  <span
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium"
                    style={{ color: "#fff" }}
                  >
                    Ver tudo <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}