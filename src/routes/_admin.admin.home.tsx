import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getHomeCuration,
  setHomeCuration,
  getHomeHero,
  setHomeHero,
  HERO_MAX_IMAGES,
  HERO_INTERVAL_OPTIONS,
  type CurationMode,
  type PropertiesCuration,
  type HomeHero,
} from "@/lib/home.functions";
import { ImageCropDialog } from "@/components/admin/ImageCropDialog";
import { Slider } from "@/components/ui/slider";
import { Hero } from "@/components/home/Hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const HERO_PREVIEW_REF_WIDTH = 1280;
const HERO_PREVIEW_REF_WIDTH_MOBILE = 390;

function HeroPreview({
  imageUrls,
  title,
  subtitle,
  overlayOpacity,
  titleScale,
  subtitleScale,
  slideIntervalMs,
  mode,
  mobileImageUrls,
  mobileOverlayOpacity,
  mobileTitleScale,
  mobileSubtitleScale,
}: {
  imageUrls: string[];
  title: string;
  subtitle: string;
  overlayOpacity: number;
  titleScale: number;
  subtitleScale: number;
  slideIntervalMs: number;
  mode: "desktop" | "mobile";
  mobileImageUrls: string[];
  mobileOverlayOpacity: number;
  mobileTitleScale: number;
  mobileSubtitleScale: number;
}) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(480);
  const refWidth =
    mode === "mobile" ? HERO_PREVIEW_REF_WIDTH_MOBILE : HERO_PREVIEW_REF_WIDTH;

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const w = outer.clientWidth;
      if (w > 0) setScale(Math.min(1, w / refWidth));
      setInnerHeight(inner.offsetHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [refWidth]);

  return (
    <div
      ref={outerRef}
      className={
        mode === "mobile"
          ? "mt-5 mx-auto overflow-hidden rounded-[14px] border border-border bg-[#f5f4f0]"
          : "mt-5 overflow-hidden rounded-[14px] border border-border bg-[#f5f4f0]"
      }
      style={{ height: innerHeight * scale, position: "relative" }}
    >
      <div
        ref={innerRef}
        style={{
          width: refWidth,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <Hero
          imageUrls={imageUrls}
          title={title}
          subtitle={subtitle}
          overlayOpacity={overlayOpacity}
          titleScale={titleScale}
          subtitleScale={subtitleScale}
          slideIntervalMs={slideIntervalMs}
          mobileImageUrls={mobileImageUrls}
          mobileOverlayOpacity={mobileOverlayOpacity}
          mobileTitleScale={mobileTitleScale}
          mobileSubtitleScale={mobileSubtitleScale}
          forceMode={mode}
        />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_admin/admin/home")({
  head: () => ({ meta: [{ title: "Home — RotainStay" }] }),
  component: HomeAdmin,
});

type PropOption = { id: string; name: string; city: string };

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;
const HERO_ASPECT = 1920 / 720; // 8:3
const HERO_MIN_W = 1920;
const HERO_MIN_H = 720;
const HERO_ASPECT_MOBILE = 9 / 16; // retrato
const HERO_MIN_W_MOBILE = 720;
const HERO_MIN_H_MOBILE = 1280;

function HomeAdmin() {
  const qc = useQueryClient();

  // ---- Properties for picker ----
  const { data: props = [] } = useQuery({
    queryKey: ["admin", "home", "props"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, city")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return (data ?? []) as PropOption[];
    },
  });

  // ---- Curation ----
  const { data: curationRemote } = useQuery({
    queryKey: ["admin", "home", "curation"],
    queryFn: () => getHomeCuration(),
  });
  const [curation, setCuration] = useState<PropertiesCuration | null>(null);
  useEffect(() => {
    if (curationRemote && !curation) setCuration(curationRemote);
  }, [curationRemote, curation]);

  const saveCuration = async () => {
    if (!curation) return;
    try {
      await setHomeCuration({ data: curation });
      toast.success("Curadoria salva");
      qc.invalidateQueries({ queryKey: ["home-curation"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  // ---- Hero ----
  const { data: heroRemote } = useQuery({
    queryKey: ["admin", "home", "hero"],
    queryFn: () => getHomeHero(),
  });
  const [hero, setHero] = useState<HomeHero | null>(null);
  const [heroImageUrls, setHeroImageUrls] = useState<string[]>([]);
  const [heroMobileImageUrls, setHeroMobileImageUrls] = useState<string[]>([]);
  const [heroPendingFile, setHeroPendingFile] = useState<
    { file: File; target: "desktop" | "mobile" } | null
  >(null);
  const [heroUploading, setHeroUploading] = useState(false);
  const [imageTab, setImageTab] = useState<"desktop" | "mobile">("desktop");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop",
  );

  useEffect(() => {
    if (heroRemote && !hero) {
      const { image_urls, mobile_image_urls, ...rest } = heroRemote;
      setHero(rest);
      setHeroImageUrls(image_urls);
      setHeroMobileImageUrls(mobile_image_urls);
    }
  }, [heroRemote, hero]);

  const onHeroFileSelected = async (
    file: File,
    target: "desktop" | "mobile",
  ) => {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Imagem muito grande (máx 10 MB).");
      return;
    }
    // Validate min dimensions
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Não foi possível ler a imagem."));
      };
      img.src = url;
    }).catch((e) => {
      toast.error(e instanceof Error ? e.message : "Erro ao ler imagem");
      return null;
    });
    if (!dims) return;
    const minW = target === "mobile" ? HERO_MIN_W_MOBILE : HERO_MIN_W;
    const minH = target === "mobile" ? HERO_MIN_H_MOBILE : HERO_MIN_H;
    if (dims.w < minW || dims.h < minH) {
      toast.error(
        `A imagem precisa ter no mínimo ${minW}×${minH}px (atual: ${dims.w}×${dims.h}).`,
      );
      return;
    }
    setHeroPendingFile({ file, target });
  };

  const onHeroCropConfirmed = async (cropped: File) => {
    const target = heroPendingFile?.target ?? "desktop";
    setHeroPendingFile(null);
    setHeroUploading(true);
    try {
      const folder = target === "mobile" ? "hero-mobile" : "hero";
      const path = `${folder}/${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from("home-assets")
        .upload(path, cropped, { contentType: "image/jpeg" });
      if (error) throw error;
      const { data } = await supabase.storage
        .from("home-assets")
        .createSignedUrl(path, 60 * 60);
      if (target === "mobile") {
        setHero((h) =>
          h
            ? {
                ...h,
                mobile_images: [...h.mobile_images, path].slice(
                  0,
                  HERO_MAX_IMAGES,
                ),
              }
            : h,
        );
        setHeroMobileImageUrls((urls) =>
          [...urls, data?.signedUrl ?? ""]
            .filter(Boolean)
            .slice(0, HERO_MAX_IMAGES),
        );
      } else {
        setHero((h) =>
          h
            ? { ...h, images: [...h.images, path].slice(0, HERO_MAX_IMAGES) }
            : h,
        );
        setHeroImageUrls((urls) =>
          [...urls, data?.signedUrl ?? ""]
            .filter(Boolean)
            .slice(0, HERO_MAX_IMAGES),
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao subir imagem");
    } finally {
      setHeroUploading(false);
    }
  };

  const removeHeroImage = (idx: number, target: "desktop" | "mobile") => {
    if (target === "mobile") {
      setHero((h) =>
        h
          ? { ...h, mobile_images: h.mobile_images.filter((_, i) => i !== idx) }
          : h,
      );
      setHeroMobileImageUrls((urls) => urls.filter((_, i) => i !== idx));
    } else {
      setHero((h) =>
        h ? { ...h, images: h.images.filter((_, i) => i !== idx) } : h,
      );
      setHeroImageUrls((urls) => urls.filter((_, i) => i !== idx));
    }
  };

  const moveHeroImage = (
    from: number,
    to: number,
    target: "desktop" | "mobile",
  ) => {
    setHero((h) => {
      if (!h) return h;
      const src = target === "mobile" ? h.mobile_images : h.images;
      if (to < 0 || to >= src.length) return h;
      const arr = [...src];
      const [it] = arr.splice(from, 1);
      arr.splice(to, 0, it);
      return target === "mobile"
        ? { ...h, mobile_images: arr }
        : { ...h, images: arr };
    });
    const setter =
      target === "mobile" ? setHeroMobileImageUrls : setHeroImageUrls;
    setter((urls) => {
      if (to < 0 || to >= urls.length) return urls;
      const arr = [...urls];
      const [it] = arr.splice(from, 1);
      arr.splice(to, 0, it);
      return arr;
    });
  };

  const saveHero = async () => {
    if (!hero) return;
    try {
      await setHomeHero({ data: hero });
      toast.success("Hero da home salvo");
      qc.invalidateQueries({ queryKey: ["home-hero"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  if (!curation) {
    return (
      <div className="p-8 flex items-center gap-2 text-text-secondary">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  const setPinned = (idx: number, id: string) =>
    setCuration((c) => {
      if (!c) return c;
      const arr = [...c.pinned_ids];
      arr[idx] = id === "__none__" ? null : id;
      return { ...c, pinned_ids: arr };
    });

  const moveManual = (from: number, to: number) =>
    setCuration((c) => {
      if (!c) return c;
      const order = [...c.manual_order];
      const [it] = order.splice(from, 1);
      order.splice(to, 0, it);
      return { ...c, manual_order: order };
    });

  const initManualOrder = () => {
    if (curation.manual_order.length === 0) {
      setCuration({ ...curation, manual_order: props.map((p) => p.id) });
    }
  };

  return (
    <div className="space-y-10 p-6 md:p-8">
      <section className="rounded-[14px] border border-border bg-white p-5">
        <p className="text-sm text-text-secondary">
          A configuração da seção “Sobre” foi movida para uma área própria.
        </p>
        <Link
          to="/admin/sobre"
          className="mt-2 inline-flex text-sm font-medium text-primary hover:text-primary-dark"
        >
          Abrir Admin/Sobre
        </Link>
      </section>

      {/* Hero image */}
      {hero && (
        <section className="rounded-[14px] border border-border bg-white p-6">
          <header className="mb-4">
            <h2 className="text-xl font-semibold text-text-primary">
              Hero da home
            </h2>
            <p className="text-sm text-text-secondary">
              Texto e imagens que aparecem no topo da home, atrás do card de
              busca. Adicione até <strong>{HERO_MAX_IMAGES} imagens</strong> —
              quando houver mais de uma, elas alternam automaticamente no
              intervalo configurado abaixo. Tamanho recomendado:{" "}
              <strong>1920×720px</strong> (mínimo), proporção 8:3.
            </p>
          </header>

          {/* Texts */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="hero-title">Título</Label>
              <Input
                id="hero-title"
                value={hero.title}
                maxLength={120}
                onChange={(e) => setHero({ ...hero, title: e.target.value })}
                className="mt-1"
              />
              <p className="mt-1 text-[12px] text-text-muted">
                {hero.title.length}/120
              </p>
            </div>
            <div>
              <Label htmlFor="hero-subtitle">Subtítulo</Label>
              <Textarea
                id="hero-subtitle"
                value={hero.subtitle}
                maxLength={200}
                rows={3}
                onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
                className="mt-1"
              />
              <p className="mt-1 text-[12px] text-text-muted">
                {hero.subtitle.length}/200
              </p>
            </div>
          </div>

          {/* Preview WYSIWYG (mesmo componente da home, escalado) */}
          <p className="mt-5 text-[12px] text-text-muted">
            Pré-visualização proporcional à home — tipografia, espaçamentos e
            posicionamento idênticos ao que o visitante vê.
          </p>
          <HeroPreview
            imageUrls={heroImageUrls}
            title={hero.title}
            subtitle={hero.subtitle}
            overlayOpacity={hero.overlay_opacity}
            titleScale={hero.title_scale}
            subtitleScale={hero.subtitle_scale}
            slideIntervalMs={hero.slide_interval_ms}
          />

          {/* Image list */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <Label>
                Imagens ({hero.images.length}/{HERO_MAX_IMAGES})
              </Label>
              <label
                className={`inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm ${
                  hero.images.length >= HERO_MAX_IMAGES || heroUploading
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:bg-secondary"
                }`}
              >
                <Upload className="h-4 w-4" />
                {heroUploading ? "Subindo…" : "Adicionar imagem"}
                <input
                  type="file"
                  accept={ALLOWED.join(",")}
                  className="hidden"
                  disabled={hero.images.length >= HERO_MAX_IMAGES || heroUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onHeroFileSelected(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {hero.images.length === 0 ? (
              <p className="text-sm text-text-muted">
                Nenhuma imagem cadastrada.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {hero.images.map((path, idx) => (
                  <div
                    key={path}
                    className="relative overflow-hidden rounded-[10px] border border-border"
                    style={{ aspectRatio: "8 / 3", background: "#f5f4f0" }}
                  >
                    {heroImageUrls[idx] && (
                      <img
                        src={heroImageUrls[idx]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                    <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                      {idx + 1}
                    </div>
                    <div className="absolute right-2 top-2 flex gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveHeroImage(idx, idx - 1)}
                        className="rounded bg-black/60 px-2 py-0.5 text-[11px] text-white disabled:opacity-40"
                        title="Mover para cima"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={idx === hero.images.length - 1}
                        onClick={() => moveHeroImage(idx, idx + 1)}
                        className="rounded bg-black/60 px-2 py-0.5 text-[11px] text-white disabled:opacity-40"
                        title="Mover para baixo"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeHeroImage(idx)}
                        className="rounded bg-black/60 px-2 py-0.5 text-[11px] text-white hover:bg-red-600/80"
                        title="Remover"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 max-w-md">
            <Label>Opacidade do overlay escuro: {hero.overlay_opacity}%</Label>
            <Slider
              value={[hero.overlay_opacity]}
              min={0}
              max={80}
              step={5}
              onValueChange={(v) => setHero({ ...hero, overlay_opacity: v[0] })}
              className="mt-2"
            />
            <p className="mt-1 text-[12px] text-text-muted">
              Mais opacidade = texto mais legível, foto menos vibrante. Padrão 35%.
            </p>
          </div>

          <div className="mt-5 max-w-md">
            <Label>Intervalo entre imagens</Label>
            <Select
              value={String(hero.slide_interval_ms)}
              onValueChange={(v) =>
                setHero({
                  ...hero,
                  slide_interval_ms: Number(v) as HomeHero["slide_interval_ms"],
                })
              }
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HERO_INTERVAL_OPTIONS.map((ms) => (
                  <SelectItem key={ms} value={String(ms)}>
                    {ms / 1000} segundos
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[12px] text-text-muted">
              Tempo que cada imagem fica visível antes de trocar. Só se aplica
              quando houver mais de uma imagem.
            </p>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <Label>Tamanho do título: {hero.title_scale}%</Label>
              <Slider
                value={[hero.title_scale]}
                min={60}
                max={160}
                step={5}
                onValueChange={(v) => setHero({ ...hero, title_scale: v[0] })}
                className="mt-2"
              />
              <p className="mt-1 text-[12px] text-text-muted">
                100% = padrão. Aumenta/diminui proporcionalmente em mobile e desktop.
              </p>
            </div>
            <div>
              <Label>Tamanho do subtítulo: {hero.subtitle_scale}%</Label>
              <Slider
                value={[hero.subtitle_scale]}
                min={60}
                max={160}
                step={5}
                onValueChange={(v) => setHero({ ...hero, subtitle_scale: v[0] })}
                className="mt-2"
              />
              <p className="mt-1 text-[12px] text-text-muted">
                100% = padrão.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={saveHero}>
              <Save className="h-4 w-4 mr-2" /> Salvar hero
            </Button>
          </div>

          <ImageCropDialog
            open={!!heroPendingFile}
            source={heroPendingFile ? { kind: "file", file: heroPendingFile } : null}
            aspect={HERO_ASPECT}
            title="Recortar imagem do hero (8:3)"
            onCancel={() => setHeroPendingFile(null)}
            onConfirm={onHeroCropConfirmed}
          />
        </section>
      )}

      {/* Slideshow curation */}
      <section className="rounded-[14px] border border-border bg-white p-6">
        <header className="mb-4">
          <h1 className="text-xl font-semibold text-text-primary">
            Slideshow da home
          </h1>
          <p className="text-sm text-text-secondary">
            Define quais e em que ordem as propriedades aparecem no slideshow
            (3 cards, rotação a cada 7s). Quando o visitante aplica filtros, o
            slideshow respeita o resultado da busca.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-[260px_1fr] md:gap-6">
          <div>
            <Label>Modo</Label>
            <Select
              value={curation.mode}
              onValueChange={(v) => {
                const mode = v as CurationMode;
                setCuration({ ...curation, mode });
                if (mode === "manual") initManualOrder();
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Ordem específica (manual)</SelectItem>
                <SelectItem value="pinned">Fixar posições 1, 2 e 3</SelectItem>
                <SelectItem value="random">Aleatório</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-text-muted">
              {curation.mode === "manual" &&
                "Reordene a lista ao lado — o slideshow segue essa sequência."}
              {curation.mode === "pinned" &&
                "Escolha até 3 propriedades fixas. As demais entram em ordem aleatória."}
              {curation.mode === "random" &&
                "Todas as propriedades ativas entram em ordem aleatória por sessão."}
            </p>
          </div>

          <div>
            {curation.mode === "pinned" && (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <Label>Posição {i + 1}</Label>
                    <Select
                      value={curation.pinned_ids[i] ?? "__none__"}
                      onValueChange={(v) => setPinned(i, v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecionar propriedade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Vazio (aleatório)</SelectItem>
                        {props.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — {p.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}

            {curation.mode === "manual" && (
              <div className="rounded-md border border-border">
                {(curation.manual_order.length === 0
                  ? props.map((p) => p.id)
                  : curation.manual_order
                )
                  .map((id) => props.find((p) => p.id === id))
                  .filter((p): p is PropOption => !!p)
                  .map((p, idx, arr) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between border-b border-border px-3 py-2 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-xs text-text-muted">
                          {idx + 1}
                        </span>
                        <span className="text-sm">
                          {p.name}{" "}
                          <span className="text-text-muted">— {p.city}</span>
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={idx === 0}
                          onClick={() => moveManual(idx, idx - 1)}
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={idx === arr.length - 1}
                          onClick={() => moveManual(idx, idx + 1)}
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {curation.mode === "random" && (
              <p className="text-sm text-text-secondary">
                Nenhuma configuração adicional. Todas as {props.length} propriedades
                ativas entram no sorteio.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={saveCuration}>
            <Save className="h-4 w-4 mr-2" /> Salvar slideshow
          </Button>
        </div>
      </section>

    </div>
  );
}