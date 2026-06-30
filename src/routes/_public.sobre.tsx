import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/Button";
import { getAboutPage } from "@/lib/home.functions";

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80";

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
  const { data } = useQuery({
    queryKey: ["about-page"],
    queryFn: () => getAboutPage(),
    staleTime: 5 * 60 * 1000,
  });

  if (!data) return null;

  const cover = data.image_url || FALLBACK_COVER;

  return (
    <div className="bg-background">
      <div
        className="mx-auto"
        style={{ maxWidth: 920, paddingTop: 64, paddingBottom: 64, paddingLeft: 24, paddingRight: 24 }}
      >
        <div className="overflow-hidden rounded-[14px] border border-border">
          <img
            src={cover}
            alt={data.hero_title}
            className="aspect-[16/9] w-full object-cover"
            loading="eager"
          />
        </div>

        <div style={{ maxWidth: 720, marginTop: 40 }}>
          <h1 style={{ fontWeight: 600, fontSize: 36, color: "#1C1C1A" }}>
            {data.hero_title}
          </h1>
          <p style={{ fontSize: 18, color: "#5C5B57", lineHeight: 1.7, marginTop: 24 }}>
            {data.hero_intro}
          </p>
        </div>

        <hr style={{ marginTop: 40, marginBottom: 40, borderColor: "#E2E1DD" }} />

        <div style={{ maxWidth: 720 }}>
          {data.sections.map((section, index) => (
            <section key={`${section.title}-${index}`} style={{ marginTop: index === 0 ? 0 : 40 }}>
              <h2 style={{ fontWeight: 600, fontSize: 22, color: "#1C1C1A" }}>
                {section.title}
              </h2>
              <p style={{ fontSize: 16, color: "#5C5B57", lineHeight: 1.7, marginTop: 16 }}>
                {section.body}
              </p>
            </section>
          ))}
        </div>

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
            {data.cta_title}
          </p>
          <p style={{ fontWeight: 400, fontSize: 15, color: "#DDDCD9", marginTop: 8 }}>
            {data.cta_subtitle}
          </p>
          <div style={{ marginTop: 20 }}>
            <Link to={data.cta_button_link as "/propriedades"}>
              <Button variant="secondary" style={{ color: "#6B7052" }}>
                {data.cta_button_label}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}