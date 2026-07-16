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

  // Scroll indicator: always visible on mobile.
  const scrollHintVisible = true;

  if (isMobile) {
    // iPhone 14 Pro Max reference: 430×932 CSS px. The sticky mobile header is
    // ~68 px (40 px logo + 14 px top + 14 px bottom padding), so the hero must
    // subtract that height to fit entirely on the first screen.
    return (
      <section
        className="relative -mt-[68px] w-full overflow-hidden bg-primary md:mt-0"
        style={{
          height: "100svh",
          minHeight: "100svh",
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
              style={{
                background: `linear-gradient(to bottom, rgba(0,0,0,${overlayAlpha * 0.6}) 0%, rgba(0,0,0,${overlayAlpha * 0.4}) 40%, rgba(0,0,0,${Math.min(1, overlayAlpha + 0.35)}) 100%)`,
              }}
            />
          </>
        )}
        <div className="absolute inset-0 flex flex-col">
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pt-[68px] text-center">
            <h1
              className="font-semibold text-white"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
            >
              <span
                className="block leading-tight"
                style={{
                  fontSize: `clamp(${24 * tScale}px, ${6 * tScale}vw, ${30 * tScale}px)`,
                  ...(hasImage ? { textShadow: "0 2px 12px rgba(0,0,0,0.55)" } : {}),
                }}
              >
                {heading}
              </span>
            </h1>
            <p
              className="mt-3 max-w-[17rem]"
              style={{ color: "#EEEDEA", fontWeight: 400 }}
            >
              <span
                className="block"
                style={{
                  fontSize: `clamp(${13 * sScale}px, ${3.8 * sScale}vw, ${15 * sScale}px)`,
                  ...(hasImage ? { textShadow: "0 1px 8px rgba(0,0,0,0.6)" } : {}),
                }}
              >
                {sub}
              </span>
            </p>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none flex shrink-0 flex-col items-center pt-4 transition-opacity duration-500"
            style={{
              opacity: scrollHintVisible ? 1 : 0,
              paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
            }}
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