import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  getHomeAbout,
  setHomeCuration,
  setHomeAbout,
  type CurationMode,
  type PropertiesCuration,
  type HomeAbout,
} from "@/lib/home.functions";

export const Route = createFileRoute("/_admin/admin/home")({
  head: () => ({ meta: [{ title: "Home — RotainStay" }] }),
  component: HomeAdmin,
});

type PropOption = { id: string; name: string; city: string };

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

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

  // ---- About ----
  const { data: aboutRemote } = useQuery({
    queryKey: ["admin", "home", "about"],
    queryFn: () => getHomeAbout(),
  });
  const [about, setAbout] = useState<HomeAbout | null>(null);
  const [aboutImageUrl, setAboutImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (aboutRemote && !about) {
      const { image_url, ...rest } = aboutRemote;
      setAbout(rest);
      setAboutImageUrl(image_url);
    }
  }, [aboutRemote, about]);

  const uploadAboutImage = async (file: File) => {
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
      const path = `about/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("home-assets")
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      setAbout((a) => (a ? { ...a, image_path: path } : a));
      const { data } = await supabase.storage
        .from("home-assets")
        .createSignedUrl(path, 60 * 60);
      setAboutImageUrl(data?.signedUrl ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao subir imagem");
    } finally {
      setUploading(false);
    }
  };

  const saveAbout = async () => {
    if (!about) return;
    try {
      await setHomeAbout({ data: about });
      toast.success("Seção Sobre salva");
      qc.invalidateQueries({ queryKey: ["home-about"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  if (!curation || !about) {
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

      {/* About section */}
      <section className="rounded-[14px] border border-border bg-white p-6">
        <header className="mb-4">
          <h2 className="text-xl font-semibold text-text-primary">
            Seção “Sobre” na home
          </h2>
          <p className="text-sm text-text-secondary">
            Texto e imagem mostrados entre o slideshow e o Instagram.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input
                value={about.title}
                onChange={(e) => setAbout({ ...about, title: e.target.value })}
                maxLength={120}
              />
            </div>
            <div>
              <Label>Texto</Label>
              <Textarea
                rows={6}
                value={about.body}
                onChange={(e) => setAbout({ ...about, body: e.target.value })}
                maxLength={800}
              />
            </div>
            <div>
              <Label>Texto do botão</Label>
              <Input
                value={about.cta_label}
                onChange={(e) =>
                  setAbout({ ...about, cta_label: e.target.value })
                }
                maxLength={60}
              />
            </div>
          </div>

          <div>
            <Label>Imagem</Label>
            <div
              className="mt-1 overflow-hidden rounded-[14px] border border-border"
              style={{ aspectRatio: "4 / 3", background: "#f5f4f0" }}
            >
              {aboutImageUrl ? (
                <img
                  src={aboutImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-text-muted text-sm">
                  Sem imagem
                </div>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
                <Upload className="h-4 w-4" />
                {uploading ? "Subindo…" : "Trocar imagem"}
                <input
                  type="file"
                  accept={ALLOWED.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAboutImage(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {about.image_path && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAbout({ ...about, image_path: "" });
                    setAboutImageUrl(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Remover
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={saveAbout}>
            <Save className="h-4 w-4 mr-2" /> Salvar Sobre
          </Button>
        </div>
      </section>
    </div>
  );
}