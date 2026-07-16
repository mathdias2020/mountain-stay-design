import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

export type HeroProps = {
  imageUrls?: string[];
  title?: string;
  subtitle?: string;
  overlayOpacity?: number; // 0-100
  titleScale?: number; // percent, default 100
  subtitleScale?: number; // percent, default 100
  slideIntervalMs?: number;
  mobileImageUrls?: string[];
  mobileOverlayOpacity?: number;
  mobileTitleScale?: number;
  mobileSubtitleScale?: number;
  /** Force render mode (used by admin preview toggle). Auto-detects otherwise. */
  forceMode?: "desktop" | "mobile";
};

const DEFAULT_TITLE = "Sua próxima escapada nas montanhas do Espírito Santo";
const DEFAULT_SUBTITLE =
  "Casas e chalés para temporada em Domingos Martins, Pedra Azul e região serrana.";
export function Hero({
  imageUrls = [],
  title,
  subtitle,
  overlayOpacity = 35,
  titleScale = 100,
  subtitleScale = 100,
  slideIntervalMs = 6000,
  mobileImageUrls,
  mobileOverlayOpacity,
  mobileTitleScale,
  mobileSubtitleScale,
  forceMode,
}: HeroProps = {}) {
  const heading = title?.trim() || DEFAULT_TITLE;
  const sub = subtitle?.trim() || DEFAULT_SUBTITLE;

  // Detect mobile viewport (client only). SSR fallback = desktop, then hydrates.
  const [isMobileDetected, setIsMobileDetected] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileDetected(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const isMobile =
    forceMode === "mobile" ||
    (forceMode === undefined && isMobileDetected);

  // Pick image set (mobile falls back to desktop when empty).
  const desktopImages = imageUrls.filter(Boolean);
  const mobileImagesResolved = (mobileImageUrls ?? []).filter(Boolean);
  const activeImages =
    isMobile && mobileImagesResolved.length > 0
      ? mobileImagesResolved
      : desktopImages;
  const hasImage = activeImages.length > 0;

  // Pick numeric overrides.
  const effectiveOverlay = isMobile
    ? (mobileOverlayOpacity ?? overlayOpacity)
    : overlayOpacity;
  const effectiveTitleScale = isMobile
    ? (mobileTitleScale ?? titleScale)
    : titleScale;
  const effectiveSubtitleScale = isMobile
    ? (mobileSubtitleScale ?? subtitleScale)
    : subtitleScale;

  const overlayAlpha = Math.max(0, Math.min(100, effectiveOverlay)) / 100;
  const tScale = Math.max(50, Math.min(200, effectiveTitleScale)) / 100;
  const sScale = Math.max(50, Math.min(200, effectiveSubtitleScale)) / 100;

  const [active, setActive] = useState(0);
  useEffect(() => {
    setActive(0);
  }, [isMobile, activeImages.length]);
  useEffect(() => {
    if (activeImages.length <= 1) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % activeImages.length);
    }, slideIntervalMs);
    return () => window.clearInterval(id);
  }, [activeImages.length, slideIntervalMs]);

  // Scroll indicator: hide after first user scroll (mobile only).
  const [scrollHintVisible, setScrollHintVisible] = useState(true);
  useEffect(() => {
    if (!isMobile) return;
    const onScroll = () => {
      if (window.scrollY > 24) setScrollHintVisible(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  if (isMobile) {
    return (
      <section
        className="relative w-full overflow-hidden bg-primary"
        style={{ aspectRatio: "9 / 16", minHeight: "100svh" }}
      >
        {hasImage && (
          <>
            {activeImages.map((url, i) => (
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
              style={{
                background: `linear-gradient(to bottom, rgba(0,0,0,${overlayAlpha * 0.6}) 0%, rgba(0,0,0,${overlayAlpha * 0.4}) 40%, rgba(0,0,0,${Math.min(1, overlayAlpha + 0.35)}) 100%)`,
              }}
            />
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-20 text-center">
          <h1
            className="font-semibold text-white"
            style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
          >
            <span
              className="block leading-tight"
              style={{
                fontSize: `${32 * tScale}px`,
                ...(hasImage ? { textShadow: "0 2px 12px rgba(0,0,0,0.55)" } : {}),
              }}
            >
              {heading}
            </span>
          </h1>
          <p
            className="mt-4 max-w-sm"
            style={{ color: "#EEEDEA", fontWeight: 400 }}
          >
            <span
              className="block"
              style={{
                fontSize: `${15 * sScale}px`,
                ...(hasImage ? { textShadow: "0 1px 8px rgba(0,0,0,0.6)" } : {}),
              }}
            >
              {sub}
            </span>
          </p>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center transition-opacity duration-500"
          style={{ opacity: scrollHintVisible ? 1 : 0 }}
        >
          <span
            className="mb-1 text-[11px] uppercase tracking-[0.2em] text-white/85"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
          >
            Role para explorar
          </span>
          <ChevronDown
            className="h-5 w-5 animate-bounce text-white"
            strokeWidth={2.5}
            style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.5))" }}
          />
        </div>
      </section>
    );
  }

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
          {activeImages.map((url, i) => (
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
            className="block leading-tight"
            style={{
              fontSize: `clamp(${28 * tScale}px, ${4.5 * tScale}vw, ${44 * tScale}px)`,
              ...(hasImage ? { textShadow: "0 2px 12px rgba(0,0,0,0.45)" } : {}),
            }}
          >
            {heading}
          </span>
        </h1>
        <p
          className="mt-4"
          style={{ color: "#DDDCD9", fontWeight: 400 }}
        >
          <span
            className="block"
            style={{
              fontSize: `clamp(${15 * sScale}px, ${1.8 * sScale}vw, ${18 * sScale}px)`,
              ...(hasImage ? { textShadow: "0 1px 8px rgba(0,0,0,0.5)" } : {}),
            }}
          >
            {sub}
          </span>
        </p>
      </div>
    </section>
  );
}

export default Hero;