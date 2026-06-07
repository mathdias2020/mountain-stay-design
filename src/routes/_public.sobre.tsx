import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/Button";

export const Route = createFileRoute("/_public/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — RotainStay" },
      {
        name: "description",
        content:
          "Conheça a RotainStay: casas e chalés selecionados na região serrana do Espírito Santo.",
      },
      { property: "og:title", content: "Sobre — RotainStay" },
      {
        property: "og:description",
        content:
          "Conheça a RotainStay: casas e chalés selecionados na região serrana do Espírito Santo.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="bg-background">
      <div
        className="mx-auto"
        style={{ maxWidth: 720, paddingTop: 64, paddingBottom: 64, paddingLeft: 24, paddingRight: 24 }}
      >
        <h1 style={{ fontWeight: 600, fontSize: 36, color: "#1C1C1A" }}>
          Sobre a RotainStay
        </h1>
        <p style={{ fontSize: 18, color: "#5C5B57", lineHeight: 1.7, marginTop: 24 }}>
          A RotainStay nasceu do amor pelas montanhas do Espírito Santo e do desejo de
          oferecer aos visitantes muito mais que uma simples hospedagem. Cada propriedade
          do nosso portfólio é cuidadosamente selecionada para garantir que sua estadia
          na Serra seja inesquecível.
        </p>

        <hr style={{ marginTop: 40, marginBottom: 40, borderColor: "#E2E1DD" }} />

        <h2 style={{ fontWeight: 600, fontSize: 22, color: "#1C1C1A" }}>Nossa região</h2>
        <p style={{ fontSize: 16, color: "#5C5B57", lineHeight: 1.7, marginTop: 16 }}>
          Atuamos em Domingos Martins, Pedra Azul, Marechal Floriano, Venda Nova do
          Imigrante, Paraju e demais cidades da região serrana capixaba. Um destino de
          clima ameno, paisagens deslumbrantes, gastronomia rica e tradição de
          hospitalidade. Seja para uma escapada romântica, uma viagem em família ou um
          retiro com amigos, temos a propriedade certa para você.
        </p>

        <h2 style={{ fontWeight: 600, fontSize: 22, color: "#1C1C1A", marginTop: 40 }}>
          Como funciona
        </h2>
        <p style={{ fontSize: 16, color: "#5C5B57", lineHeight: 1.7, marginTop: 16 }}>
          Você navega pelo nosso site, encontra a casa ideal para suas datas e número de
          hóspedes, e envia uma solicitação de reserva. Em seguida, nosso atendimento
          entra em contato via WhatsApp para confirmar os detalhes, esclarecer dúvidas e
          finalizar sua reserva com segurança. Nada de processos burocráticos: simples,
          direto e humano.
        </p>

        <h2 style={{ fontWeight: 600, fontSize: 22, color: "#1C1C1A", marginTop: 40 }}>
          Nosso compromisso
        </h2>
        <p style={{ fontSize: 16, color: "#5C5B57", lineHeight: 1.7, marginTop: 16 }}>
          Cada propriedade é avaliada pessoalmente antes de entrar no portfólio.
          Verificamos estrutura, limpeza, conforto, segurança e a qualidade do que é
          entregue. Trabalhamos apenas com proprietários comprometidos com a excelência,
          para que você se preocupe apenas em aproveitar.
        </p>

        <div
          style={{
            marginTop: 56,
            background: "#6B7052",
            borderRadius: 14,
            padding: 32,
            textAlign: "center",
            color: "#fff",
          }}
        >
          <p style={{ fontWeight: 600, fontSize: 22 }}>
            Pronto para sua próxima escapada?
          </p>
          <p style={{ fontWeight: 400, fontSize: 15, color: "#DDDCD9", marginTop: 8 }}>
            Explore nosso portfólio completo e encontre a casa perfeita para você.
          </p>
          <div style={{ marginTop: 20 }}>
            <Link to="/propriedades">
              <Button variant="secondary" style={{ color: "#6B7052" }}>
                Ver todas as propriedades
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}