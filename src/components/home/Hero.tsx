export type HeroProps = {
  imageUrl?: string | null;
  overlayOpacity?: number; // 0-100
};

export function Hero({ imageUrl, overlayOpacity = 35 }: HeroProps = {}) {
  const hasImage = !!imageUrl;
  const overlayAlpha = Math.max(0, Math.min(100, overlayOpacity)) / 100;
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
          <img
            src={imageUrl as string}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
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
            Sua próxima escapada nas montanhas do Espírito Santo
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
            Casas e chalés para temporada em Domingos Martins, Pedra Azul e região serrana.
          </span>
        </p>
      </div>
    </section>
  );
}

export default Hero;