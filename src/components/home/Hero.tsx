export function Hero() {
  return (
    <section className="bg-primary px-6 py-14 md:py-20">
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
    </section>
  );
}

export default Hero;