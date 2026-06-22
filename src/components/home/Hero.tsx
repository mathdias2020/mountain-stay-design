import { useEffect, useState } from "react";

export type HeroProps = {
  imageUrls?: string[];
  title?: string;
  subtitle?: string;
  overlayOpacity?: number; // 0-100
};

const DEFAULT_TITLE = "Sua próxima escapada nas montanhas do Espírito Santo";
const DEFAULT_SUBTITLE =
  "Casas e chalés para temporada em Domingos Martins, Pedra Azul e região serrana.";
const SLIDE_INTERVAL_MS = 6000;

export function Hero({
  imageUrls = [],
  title,
  subtitle,
  overlayOpacity = 35,
}: HeroProps = {}) {
  const images = imageUrls.filter(Boolean);
  const hasImage = images.length > 0;
  const overlayAlpha = Math.max(0, Math.min(100, overlayOpacity)) / 100;
  const heading = title?.trim() || DEFAULT_TITLE;
  const sub = subtitle?.trim() || DEFAULT_SUBTITLE;

  const [active, setActive] = useState(0);
  useEffect(() => {
    if (images.length <= 1) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % images.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [images.length]);

  return (
    <section
      className="relative overflow-hidden bg-primary px-6"
      style={{
        minHeight: hasImage ? 480 : undefined,
        paddingTop: hasImage ? 96 : 56,
        paddingBottom: hasImage ? 128 : 80,
      }}
    >
      {hasImage && (
        <>
          {images.map((url, i) => (
            <img
              key={url}
              src={url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out"
              style={{ opacity: i === active ? 1 : 0 }}
            />
          ))}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: `rgba(0,0,0,${overlayAlpha})` }}
          />
        </>
      )}
      <div className="relative mx-auto max-w-4xl text-center">
        <h1
          className="font-semibold text-white"
          style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
        >
          <span
            className="block text-[28px] leading-tight md:text-[44px]"
            style={hasImage ? { textShadow: "0 2px 12px rgba(0,0,0,0.45)" } : undefined}
          >
            {heading}
          </span>
        </h1>
        <p
          className="mt-4"
          style={{ color: "#DDDCD9", fontWeight: 400 }}
        >
          <span
            className="block text-[15px] md:text-[18px]"
            style={hasImage ? { textShadow: "0 1px 8px rgba(0,0,0,0.5)" } : undefined}
          >
            {sub}
          </span>
        </p>
      </div>
    </section>
  );
}

export default Hero;