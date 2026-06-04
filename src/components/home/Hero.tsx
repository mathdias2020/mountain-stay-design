import { MountainSilhouette } from "@/components/brand/MountainSilhouette";

export function Hero() {
  return (
    <section className="relative bg-primary px-6 pt-14 pb-24 md:pt-20 md:pb-28">
      <div className="mx-auto max-w-4xl text-center">
        <h1
          className="font-semibold text-white"
          style={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
        >
          <span className="block text-[26px] leading-tight md:text-[36px]">
            Sua próxima escapada nas montanhas do Espírito Santo
          </span>
        </h1>
        <p
          className="mt-4"
          style={{ color: "#DDDCD9", fontWeight: 400 }}
        >
          <span className="block text-[15px] md:text-[18px]">
            Casas e chalés para temporada em Domingos Martins, Pedra Azul e região serrana.
          </span>
        </p>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 leading-[0]">
        <MountainSilhouette
          backColor="#4E5438"
          frontColor="#5A6045"
          height={80}
        />
      </div>
    </section>
  );
}

export default Hero;