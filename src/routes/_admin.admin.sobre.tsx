import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  getAboutPage,
  getHomeAbout,
  setAboutPage,
  setHomeAbout,
  type AboutPage,
  type HomeAbout,
} from "@/lib/home.functions";

export const Route = createFileRoute("/_admin/admin/sobre")({
  head: () => ({ meta: [{ title: "Sobre — RotainStay" }] }),
  component: AboutAdmin,
});

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

function AboutAdmin() {
  const qc = useQueryClient();
  const [homeAbout, setHomeAboutState] = useState<HomeAbout | null>(null);
  const [homeImageUrl, setHomeImageUrl] = useState<string | null>(null);
  const [homeUploading, setHomeUploading] = useState(false);
  const [aboutPage, setAboutPageState] = useState<AboutPage | null>(null);
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [pageUploading, setPageUploading] = useState(false);

  const { data: homeRemote } = useQuery({
    queryKey: ["admin", "home", "about"],
    queryFn: () => getHomeAbout(),
  });

  const { data: pageRemote } = useQuery({
    queryKey: ["admin", "about-page"],
    queryFn: () => getAboutPage(),
  });

  useEffect(() => {
    if (homeRemote && !homeAbout) {
      const { image_url, ...rest } = homeRemote;
      setHomeAboutState(rest);
      setHomeImageUrl(image_url);
    }
  }, [homeRemote, homeAbout]);

  useEffect(() => {
    if (pageRemote && !aboutPage) {
      const { image_url, ...rest } = pageRemote;
      setAboutPageState(rest);
      setPageImageUrl(image_url);
    }
  }, [pageRemote, aboutPage]);

  const uploadImage = async ({
    file,
    prefix,
    setUploading,
    onUploaded,
  }: {
    file: File;
    prefix: string;
    setUploading: (value: boolean) => void;
    onUploaded: (path: string, url: string | null) => void;
  }) => {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Imagem muito grande (máx 10 MB).");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("home-assets")
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = await supabase.storage
        .from("home-assets")
        .createSignedUrl(path, 60 * 60);
      onUploaded(path, data?.signedUrl ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao subir imagem");
    } finally {
      setUploading(false);
    }
  };

  const saveHomeAbout = async () => {
    if (!homeAbout) return;
    try {
      await setHomeAbout({ data: homeAbout });
      toast.success("Sobre da Home salvo");
      qc.invalidateQueries({ queryKey: ["home-about"] });
      qc.invalidateQueries({ queryKey: ["admin", "home", "about"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  const saveAboutPage = async () => {
    if (!aboutPage) return;
    try {
      await setAboutPage({ data: aboutPage });
      toast.success("Página Sobre salva");
      qc.invalidateQueries({ queryKey: ["about-page"] });
      qc.invalidateQueries({ queryKey: ["admin", "about-page"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  if (!homeAbout || !aboutPage) {
    return (
      <div className="flex items-center gap-2 p-8 text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <header>
        <h1 className="text-[24px] font-semibold text-text-primary">Sobre</h1>
        <p className="text-sm text-text-secondary">
          Configure os conteúdos de Sobre exibidos na Home e na página pública.
        </p>
      </header>

      <Tabs defaultValue="home" className="space-y-5">
        <TabsList>
          <TabsTrigger value="home">Sobre na Home</TabsTrigger>
          <TabsTrigger value="page">Página /sobre</TabsTrigger>
        </TabsList>

        <TabsContent value="home">
          <section className="rounded-[14px] border border-border bg-white p-6">
            <header className="mb-4">
              <h2 className="text-xl font-semibold text-text-primary">
                Seção “Sobre” na Home
              </h2>
              <p className="text-sm text-text-secondary">
                Texto, imagem e botão mostrados entre o slideshow e o Instagram.
              </p>
            </header>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="home-about-title">Título</Label>
                  <Input
                    id="home-about-title"
                    value={homeAbout.title}
                    onChange={(e) =>
                      setHomeAboutState({ ...homeAbout, title: e.target.value })
                    }
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label htmlFor="home-about-body">Texto</Label>
                  <Textarea
                    id="home-about-body"
                    rows={6}
                    value={homeAbout.body}
                    onChange={(e) =>
                      setHomeAboutState({ ...homeAbout, body: e.target.value })
                    }
                    maxLength={800}
                  />
                </div>
                <div>
                  <Label htmlFor="home-about-cta">Texto do botão</Label>
                  <Input
                    id="home-about-cta"
                    value={homeAbout.cta_label}
                    onChange={(e) =>
                      setHomeAboutState({ ...homeAbout, cta_label: e.target.value })
                    }
                    maxLength={60}
                  />
                </div>
              </div>

              <ImageField
                label="Imagem"
                imageUrl={homeImageUrl}
                uploading={homeUploading}
                hasImage={!!homeAbout.image_path}
                onSelect={(file) =>
                  uploadImage({
                    file,
                    prefix: "about",
                    setUploading: setHomeUploading,
                    onUploaded: (path, url) => {
                      setHomeAboutState({ ...homeAbout, image_path: path });
                      setHomeImageUrl(url);
                    },
                  })
                }
                onRemove={() => {
                  setHomeAboutState({ ...homeAbout, image_path: "" });
                  setHomeImageUrl(null);
                }}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={saveHomeAbout}>
                <Save className="mr-2 h-4 w-4" /> Salvar Sobre da Home
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="page">
          <section className="rounded-[14px] border border-border bg-white p-6">
            <header className="mb-4">
              <h2 className="text-xl font-semibold text-text-primary">
                Página pública /sobre
              </h2>
              <p className="text-sm text-text-secondary">
                Capa, textos principais, três blocos fixos e card inferior.
              </p>
            </header>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="about-page-title">Título</Label>
                  <Input
                    id="about-page-title"
                    value={aboutPage.hero_title}
                    onChange={(e) =>
                      setAboutPageState({ ...aboutPage, hero_title: e.target.value })
                    }
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label htmlFor="about-page-intro">Introdução</Label>
                  <Textarea
                    id="about-page-intro"
                    rows={7}
                    value={aboutPage.hero_intro}
                    onChange={(e) =>
                      setAboutPageState({ ...aboutPage, hero_intro: e.target.value })
                    }
                    maxLength={900}
                  />
                </div>
              </div>

              <ImageField
                label="Imagem de capa"
                imageUrl={pageImageUrl}
                uploading={pageUploading}
                hasImage={!!aboutPage.image_path}
                aspectRatio="16 / 9"
                onSelect={(file) =>
                  uploadImage({
                    file,
                    prefix: "about-page",
                    setUploading: setPageUploading,
                    onUploaded: (path, url) => {
                      setAboutPageState({ ...aboutPage, image_path: path });
                      setPageImageUrl(url);
                    },
                  })
                }
                onRemove={() => {
                  setAboutPageState({ ...aboutPage, image_path: "" });
                  setPageImageUrl(null);
                }}
              />
            </div>

            <div className="mt-6 space-y-4">
              <h3 className="text-base font-semibold text-text-primary">
                Blocos da página
              </h3>
              {aboutPage.sections.map((section, index) => (
                <div
                  key={index}
                  className="rounded-[10px] border border-border p-4"
                >
                  <p className="mb-3 text-sm font-medium text-text-secondary">
                    Bloco {index + 1}
                  </p>
                  <div className="grid gap-3 md:grid-cols-[280px_1fr]">
                    <div>
                      <Label htmlFor={`about-section-title-${index}`}>Título</Label>
                      <Input
                        id={`about-section-title-${index}`}
                        value={section.title}
                        maxLength={80}
                        onChange={(e) => {
                          const sections = [...aboutPage.sections];
                          sections[index] = { ...section, title: e.target.value };
                          setAboutPageState({ ...aboutPage, sections });
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`about-section-body-${index}`}>Texto</Label>
                      <Textarea
                        id={`about-section-body-${index}`}
                        rows={4}
                        value={section.body}
                        maxLength={900}
                        onChange={(e) => {
                          const sections = [...aboutPage.sections];
                          sections[index] = { ...section, body: e.target.value };
                          setAboutPageState({ ...aboutPage, sections });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-4 rounded-[10px] border border-border p-4">
              <h3 className="text-base font-semibold text-text-primary">
                Card inferior
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor="about-cta-title">Título</Label>
                  <Input
                    id="about-cta-title"
                    value={aboutPage.cta_title}
                    onChange={(e) =>
                      setAboutPageState({ ...aboutPage, cta_title: e.target.value })
                    }
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label htmlFor="about-cta-subtitle">Subtítulo</Label>
                  <Input
                    id="about-cta-subtitle"
                    value={aboutPage.cta_subtitle}
                    onChange={(e) =>
                      setAboutPageState({ ...aboutPage, cta_subtitle: e.target.value })
                    }
                    maxLength={220}
                  />
                </div>
                <div>
                  <Label htmlFor="about-cta-label">Texto do botão</Label>
                  <Input
                    id="about-cta-label"
                    value={aboutPage.cta_button_label}
                    onChange={(e) =>
                      setAboutPageState({
                        ...aboutPage,
                        cta_button_label: e.target.value,
                      })
                    }
                    maxLength={60}
                  />
                </div>
                <div>
                  <Label htmlFor="about-cta-link">Link do botão</Label>
                  <Input
                    id="about-cta-link"
                    value={aboutPage.cta_button_link}
                    onChange={(e) =>
                      setAboutPageState({
                        ...aboutPage,
                        cta_button_link: e.target.value,
                      })
                    }
                    maxLength={160}
                    placeholder="/propriedades"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={saveAboutPage}>
                <Save className="mr-2 h-4 w-4" /> Salvar página /sobre
              </Button>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ImageField({
  label,
  imageUrl,
  uploading,
  hasImage,
  aspectRatio = "4 / 3",
  onSelect,
  onRemove,
}: {
  label: string;
  imageUrl: string | null;
  uploading: boolean;
  hasImage: boolean;
  aspectRatio?: string;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div
        className="mt-1 overflow-hidden rounded-[14px] border border-border"
        style={{ aspectRatio, background: "#f5f4f0" }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-text-muted">
            Sem imagem
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
          <Upload className="h-4 w-4" />
          {uploading ? "Subindo…" : "Trocar imagem"}
          <input
            type="file"
            accept={ALLOWED.join(",")}
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSelect(f);
              e.target.value = "";
            }}
          />
        </label>
        {hasImage && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="mr-1 h-4 w-4" /> Remover
          </Button>
        )}
      </div>
    </div>
  );
}