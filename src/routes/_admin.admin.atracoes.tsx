import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus, Upload, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getAdminAttractions,
  upsertAttraction,
  deleteAttraction,
  type AttractionCategory,
} from "@/lib/attractions.functions";
import { getPropertyCities } from "@/lib/events.functions";

export const Route = createFileRoute("/_admin/admin/atracoes")({
  head: () => ({ meta: [{ title: "O que fazer — RotainStay" }] }),
  component: AttractionsAdmin,
});

const CAT_LABEL: Record<AttractionCategory, string> = {
  atracao: "Atrações",
  restaurante: "Restaurantes",
  passeio: "Passeios",
};

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

type Row = Awaited<ReturnType<typeof getAdminAttractions>>["items"][number];

type FormState = {
  id?: string;
  category: AttractionCategory;
  title: string;
  short_description: string;
  long_description: string;
  city: string;
  external_url: string;
  cover_image_path: string;
  gallery: string[];
  sort_order: number;
  is_active: boolean;
};

function emptyForm(category: AttractionCategory): FormState {
  return {
    category,
    title: "",
    short_description: "",
    long_description: "",
    city: "",
    external_url: "",
    cover_image_path: "",
    gallery: [],
    sort_order: 0,
    is_active: true,
  };
}

function AttractionsAdmin() {
  const qc = useQueryClient();
  const [category, setCategory] = useState<AttractionCategory>("atracao");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm("atracao"));
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [signedCovers, setSignedCovers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "attractions", category],
    queryFn: () => getAdminAttractions({ data: { category } }),
  });
  const items: Row[] = data?.items ?? [];

  const { data: cityData } = useQuery({
    queryKey: ["property-cities"],
    queryFn: () => getPropertyCities(),
    staleTime: 5 * 60 * 1000,
  });
  const cities = cityData?.cities ?? [];

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    (async () => {
      const paths = items.map((i) => i.cover_image_path).filter(Boolean);
      const map: Record<string, string> = {};
      paths.forEach((p) => {
        if (signedCovers[p]) map[p] = signedCovers[p];
      });
      const missing = paths.filter((p) => !map[p]);
      if (missing.length === 0) return;
      const { data: signed } = await supabase.storage
        .from("attraction-photos")
        .createSignedUrls(missing, 60 * 30);
      if (cancelled || !signed) return;
      for (const e of signed) {
        if (e.path && e.signedUrl) map[e.path] = e.signedUrl;
      }
      setSignedCovers((prev) => ({ ...prev, ...map }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const openNew = () => {
    setForm(emptyForm(category));
    setCoverUrl(null);
    setGalleryUrls([]);
    setOpen(true);
  };

  const openEdit = async (row: Row) => {
    setForm({
      id: row.id,
      category: row.category,
      title: row.title,
      short_description: row.short_description ?? "",
      long_description: row.long_description ?? "",
      city: row.city,
      external_url: row.external_url ?? "",
      cover_image_path: row.cover_image_path,
      gallery: row.gallery,
      sort_order: row.sort_order,
      is_active: row.is_active,
    });
    setCoverUrl(row.cover_url || null);
    const paths = row.gallery;
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage
        .from("attraction-photos")
        .createSignedUrls(paths, 60 * 30);
      const map = new Map<string, string>();
      (signed ?? []).forEach((e) => {
        if (e.path && e.signedUrl) map.set(e.path, e.signedUrl);
      });
      setGalleryUrls(paths.map((p) => map.get(p) ?? ""));
    } else {
      setGalleryUrls([]);
    }
    setOpen(true);
  };

  const uploadImage = async (
    file: File,
    kind: "cover" | "gallery",
  ): Promise<void> => {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Formato inválido (JPG, PNG, WebP).");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Imagem muito grande (máx 10 MB).");
      return;
    }
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${form.category}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("attraction-photos")
      .upload(path, file, { contentType: file.type });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data: signed } = await supabase.storage
      .from("attraction-photos")
      .createSignedUrl(path, 60 * 30);
    const url = signed?.signedUrl ?? "";
    if (kind === "cover") {
      setForm((f) => ({ ...f, cover_image_path: path }));
      setCoverUrl(url);
    } else {
      setForm((f) => ({ ...f, gallery: [...f.gallery, path] }));
      setGalleryUrls((u) => [...u, url]);
    }
  };

  const removeGalleryImage = (idx: number) => {
    setForm((f) => ({
      ...f,
      gallery: f.gallery.filter((_, i) => i !== idx),
    }));
    setGalleryUrls((u) => u.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Título obrigatório");
    if (!form.city.trim()) return toast.error("Cidade obrigatória");
    if (!form.cover_image_path) return toast.error("Imagem de capa obrigatória");
    setSaving(true);
    try {
      await upsertAttraction({
        data: {
          id: form.id,
          category: form.category,
          title: form.title.trim(),
          short_description: form.short_description.trim() || null,
          long_description: form.long_description.trim() || null,
          city: form.city.trim(),
          external_url: form.external_url.trim() || null,
          cover_image_path: form.cover_image_path,
          gallery: form.gallery,
          sort_order: form.sort_order,
          is_active: form.is_active,
        },
      });
      toast.success("Salvo");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "attractions"] });
      qc.invalidateQueries({ queryKey: ["attractions"] });
      qc.invalidateQueries({ queryKey: ["category-highlights"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Row) => {
    if (!confirm(`Excluir "${row.title}"?`)) return;
    try {
      await deleteAttraction({ data: { id: row.id } });
      toast.success("Excluído");
      qc.invalidateQueries({ queryKey: ["admin", "attractions"] });
      qc.invalidateQueries({ queryKey: ["attractions"] });
      qc.invalidateQueries({ queryKey: ["category-highlights"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  };

  return (
    <div className="p-6 md:p-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            O que fazer na Serra
          </h1>
          <p className="text-sm text-text-secondary">
            Cadastre atrações, restaurantes e passeios da região.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Novo
        </Button>
      </header>

      <div className="mb-6 inline-flex rounded-md border border-border bg-white p-1">
        {(["atracao", "restaurante", "passeio"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className="px-3 py-1.5 rounded text-sm transition-colors"
            style={{
              backgroundColor: category === c ? "#6B7052" : "transparent",
              color: category === c ? "#fff" : "#1C1C1A",
            }}
          >
            {CAT_LABEL[c]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-text-secondary">Carregando…</p>
      ) : items.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-surface p-10 text-center">
          <p className="text-text-secondary">Nada cadastrado nesta categoria.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface text-text-secondary">
              <tr>
                <th className="text-left px-4 py-3 w-20">Capa</th>
                <th className="text-left px-4 py-3">Título</th>
                <th className="text-left px-4 py-3">Cidade</th>
                <th className="text-left px-4 py-3 w-20">Ordem</th>
                <th className="text-left px-4 py-3 w-24">Ativo</th>
                <th className="text-right px-4 py-3 w-32">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <div
                      className="h-12 w-16 overflow-hidden rounded bg-secondary"
                    >
                      {signedCovers[r.cover_image_path] && (
                        <img
                          src={signedCovers[r.cover_image_path]}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-text-primary">{r.title}</div>
                    {r.external_url && (
                      <a
                        href={r.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-muted inline-flex items-center gap-1"
                      >
                        site <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-2 text-text-secondary">{r.city}</td>
                  <td className="px-4 py-2">{r.sort_order}</td>
                  <td className="px-4 py-2">
                    {r.is_active ? "Sim" : "Não"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Editar" : "Novo"} — {CAT_LABEL[form.category]}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm({ ...form, category: v as AttractionCategory })
                  }
                  disabled={!!form.id}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atracao">Atração</SelectItem>
                    <SelectItem value="restaurante">Restaurante</SelectItem>
                    <SelectItem value="passeio">Passeio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cidade</Label>
                <Select
                  value={cities.includes(form.city) ? form.city : "__other__"}
                  onValueChange={(v) =>
                    setForm({ ...form, city: v === "__other__" ? "" : v })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                    <SelectItem value="__other__">Outra…</SelectItem>
                  </SelectContent>
                </Select>
                {!cities.includes(form.city) && (
                  <Input
                    className="mt-2"
                    placeholder="Digite a cidade"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                )}
              </div>
            </div>

            <div>
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div>
              <Label>Descrição curta (cartão)</Label>
              <Textarea
                rows={2}
                value={form.short_description}
                onChange={(e) =>
                  setForm({ ...form, short_description: e.target.value })
                }
                maxLength={300}
              />
            </div>

            <div>
              <Label>Descrição longa (página de detalhe)</Label>
              <Textarea
                rows={5}
                value={form.long_description}
                onChange={(e) =>
                  setForm({ ...form, long_description: e.target.value })
                }
                maxLength={5000}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Link externo (opcional)</Label>
                <Input
                  placeholder="https://"
                  value={form.external_url}
                  onChange={(e) =>
                    setForm({ ...form, external_url: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Ordem de exibição</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sort_order: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="is_active">Ativo (visível no site)</Label>
            </div>

            <div>
              <Label>Imagem de capa</Label>
              <div className="mt-1 flex items-center gap-3">
                <div
                  className="h-24 w-32 overflow-hidden rounded border border-border bg-secondary"
                >
                  {coverUrl && (
                    <img
                      src={coverUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
                  <Upload className="h-4 w-4" />
                  Selecionar
                  <input
                    type="file"
                    accept={ALLOWED.join(",")}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f, "cover");
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <Label>Galeria (opcional)</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {galleryUrls.map((u, i) => (
                  <div
                    key={i}
                    className="relative h-20 w-24 overflow-hidden rounded border border-border"
                  >
                    {u && <img src={u} alt="" className="h-full w-full object-cover" />}
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(i)}
                      className="absolute right-0 top-0 inline-flex h-6 w-6 items-center justify-center rounded-bl bg-black/60 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="inline-flex h-20 w-24 cursor-pointer items-center justify-center rounded border border-dashed border-border text-text-muted hover:bg-secondary">
                  <Plus className="h-4 w-4" />
                  <input
                    type="file"
                    accept={ALLOWED.join(",")}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadImage(f, "gallery");
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}