import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Plus, ExternalLink, X, GripVertical } from "lucide-react";
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
import { getPropertyCities } from "@/lib/events.functions";

export const Route = createFileRoute("/_admin/admin/eventos")({
  head: () => ({ meta: [{ title: "Eventos — RotainStay" }] }),
  component: EventsAdmin,
});

type EventRow = {
  id: string;
  image_path: string;
  title: string;
  description: string | null;
  city: string;
  start_date: string;
  end_date: string;
  button_label: string;
  button_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  long_description: string | null;
  schedule: ScheduleItem[] | null;
  gallery_paths: string[] | null;
  location_name: string | null;
  location_address: string | null;
  map_url: string | null;
};

type ScheduleItem = { datetime: string; title: string; description?: string | null };

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

const sb = supabase as unknown as {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

function EventsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [open, setOpen] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin", "events"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("events")
        .select(
          "id, image_path, title, description, city, start_date, end_date, button_label, button_url, sort_order, is_active, created_at, long_description, schedule, gallery_paths, location_name, location_address, map_url",
        )
        .order("sort_order", { ascending: true })
        .order("start_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as EventRow[];
    },
  });

  useEffect(() => {
    if (events.length === 0) return;
    let cancelled = false;
    (async () => {
      const paths = events.map((e) => e.image_path).filter(Boolean);
      const { data } = await supabase.storage
        .from("event-photos")
        .createSignedUrls(paths, 60 * 30);
      if (cancelled || !data) return;
      const map: Record<string, string> = {};
      for (const e of data) if (e.path && e.signedUrl) map[e.path] = e.signedUrl;
      setSignedUrls(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [events]);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (e: EventRow) => {
    setEditing(e);
    setOpen(true);
  };

  const toggleActive = async (e: EventRow) => {
    const { error } = await sb
      .from("events")
      .update({ is_active: !e.is_active })
      .eq("id", e.id);
    if (error) {
      toast.error("Erro ao atualizar.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin", "events"] });
    qc.invalidateQueries({ queryKey: ["events-home"] });
    qc.invalidateQueries({ queryKey: ["events-all"] });
  };

  const remove = async (e: EventRow) => {
    if (!confirm("Excluir este evento?")) return;
    const { error } = await sb.from("events").delete().eq("id", e.id);
    if (error) {
      toast.error("Erro ao excluir.");
      return;
    }
    await supabase.storage.from("event-photos").remove([e.image_path]);
    toast.success("Evento excluído.");
    qc.invalidateQueries({ queryKey: ["admin", "events"] });
    qc.invalidateQueries({ queryKey: ["events-home"] });
    qc.invalidateQueries({ queryKey: ["events-all"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 style={{ fontWeight: 600, fontSize: 24, color: "#2F2E2A" }}>
            Eventos
          </h1>
          <p style={{ fontSize: 14, color: "#9A9890", marginTop: 4 }}>
            Cadastre eventos exibidos na home e em /eventos.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo evento
        </Button>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        {isLoading ? (
          <div className="p-6 text-sm text-text-muted">Carregando...</div>
        ) : events.length === 0 ? (
          <div className="p-6 text-sm text-text-muted">
            Nenhum evento cadastrado.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "#ECEBE7" }}>
            {events.map((e) => (
              <div
                key={e.id}
                className="grid items-center gap-4 px-4 py-3"
                style={{
                  gridTemplateColumns: "72px 1fr 140px 100px 120px",
                }}
              >
                <div className="h-[72px] w-[72px] overflow-hidden rounded bg-muted">
                  {signedUrls[e.image_path] && (
                    <img
                      src={signedUrls[e.image_path]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <div
                    className="line-clamp-1"
                    style={{ fontSize: 14, color: "#2F2E2A", fontWeight: 600 }}
                  >
                    {e.title}
                  </div>
                  <div
                    className="line-clamp-1"
                    style={{ fontSize: 12, color: "#5C5B57" }}
                  >
                    {e.city}
                  </div>
                  {e.button_url && (
                    <a
                      href={e.button_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Link custom
                    </a>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#5C5B57" }}>
                  {e.start_date} → {e.end_date}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={e.is_active}
                    onCheckedChange={() => toggleActive(e)}
                  />
                  <span style={{ fontSize: 12, color: "#9A9890" }}>
                    {e.is_active ? "Ativo" : "Oculto"}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(e)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(e)}
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EventFormDialog
        open={open}
        onOpenChange={setOpen}
        event={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["admin", "events"] });
          qc.invalidateQueries({ queryKey: ["events-home"] });
          qc.invalidateQueries({ queryKey: ["events-all"] });
        }}
      />
    </div>
  );
}

function EventFormDialog({
  open,
  onOpenChange,
  event,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: EventRow | null;
  onSaved: () => void;
}) {
  const isEdit = !!event;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Ver hospedagens");
  const [buttonUrl, setButtonUrl] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [longDescription, setLongDescription] = useState("");
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [galleryPaths, setGalleryPaths] = useState<string[]>([]);
  const [galleryUrls, setGalleryUrls] = useState<Record<string, string>>({});
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");

  const { data: citiesData } = useQuery({
    queryKey: ["property-cities"],
    queryFn: () => getPropertyCities(),
    staleTime: 5 * 60 * 1000,
  });
  const cities = citiesData?.cities ?? [];

  useEffect(() => {
    if (!open) return;
    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    const evCity = event?.city ?? "";
    if (evCity && cities.length && !cities.includes(evCity)) {
      setCity("__custom__");
      setCustomCity(evCity);
    } else {
      setCity(evCity);
      setCustomCity("");
    }
    setStartDate(event?.start_date ?? "");
    setEndDate(event?.end_date ?? "");
    setButtonLabel(event?.button_label ?? "Ver hospedagens");
    setButtonUrl(event?.button_url ?? "");
    setSortOrder(event?.sort_order ?? 0);
    setIsActive(event?.is_active ?? true);
    setFile(null);
    setError(null);
    setLongDescription(event?.long_description ?? "");
    setSchedule(Array.isArray(event?.schedule) ? (event!.schedule as ScheduleItem[]) : []);
    setGalleryPaths(event?.gallery_paths ?? []);
    setLocationName(event?.location_name ?? "");
    setLocationAddress(event?.location_address ?? "");
    setMapUrl(event?.map_url ?? "");
  }, [open, event, cities]);

  useEffect(() => {
    if (!open || galleryPaths.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage
        .from("event-photos")
        .createSignedUrls(galleryPaths, 60 * 30);
      if (cancelled || !data) return;
      const map: Record<string, string> = {};
      for (const e of data) if (e.path && e.signedUrl) map[e.path] = e.signedUrl;
      setGalleryUrls(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, galleryPaths]);

  const uploadGallery = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setGalleryUploading(true);
    setError(null);
    try {
      const added: string[] = [];
      for (const f of Array.from(files)) {
        if (!ALLOWED.includes(f.type)) {
          setError("Use JPG, PNG ou WEBP.");
          continue;
        }
        if (f.size > MAX_BYTES) {
          setError("Arquivo maior que 10MB.");
          continue;
        }
        const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `gallery/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("event-photos")
          .upload(path, f, { contentType: f.type, upsert: false });
        if (upErr) throw upErr;
        added.push(path);
      }
      if (added.length) setGalleryPaths((prev) => [...prev, ...added]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao enviar foto.";
      setError(msg);
    } finally {
      setGalleryUploading(false);
    }
  };

  const removeGalleryPhoto = async (path: string) => {
    setGalleryPaths((prev) => prev.filter((p) => p !== path));
    await supabase.storage.from("event-photos").remove([path]);
  };

  const addScheduleItem = () =>
    setSchedule((prev) => [...prev, { datetime: "", title: "", description: "" }]);
  const updateScheduleItem = (i: number, patch: Partial<ScheduleItem>) =>
    setSchedule((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const removeScheduleItem = (i: number) =>
    setSchedule((prev) => prev.filter((_, idx) => idx !== i));
  const moveScheduleItem = (i: number, dir: -1 | 1) =>
    setSchedule((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    if (!ALLOWED.includes(f.type)) {
      setError("Use JPG, PNG ou WEBP.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("Arquivo maior que 10MB.");
      return;
    }
    setFile(f);
  };

  const save = async () => {
    const finalCity = city === "__custom__" ? customCity.trim() : city.trim();
    if (!title.trim()) return setError("Informe o título.");
    if (!finalCity) return setError("Informe a cidade.");
    if (!startDate || !endDate) return setError("Informe as datas.");
    if (endDate < startDate)
      return setError("Data final deve ser após a inicial.");
    if (!buttonLabel.trim()) return setError("Informe o texto do botão.");
    if (buttonUrl) {
      try {
        new URL(buttonUrl);
      } catch {
        return setError("URL do botão inválida.");
      }
    }
    if (!isEdit && !file) return setError("Selecione uma imagem.");

    setSaving(true);
    try {
      let image_path = event?.image_path ?? "";
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("event-photos")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        if (isEdit && event?.image_path) {
          await supabase.storage.from("event-photos").remove([event.image_path]);
        }
        image_path = path;
      }

      const payload = {
        image_path,
        title: title.trim(),
        description: description.trim() || null,
        city: finalCity,
        start_date: startDate,
        end_date: endDate,
        button_label: buttonLabel.trim(),
        button_url: buttonUrl.trim() || null,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
        long_description: longDescription.trim() || null,
        schedule: schedule
          .filter((s) => s.title.trim() && s.datetime.trim())
          .map((s) => ({
            datetime: s.datetime,
            title: s.title.trim(),
            description: s.description?.trim() || null,
          })),
        gallery_paths: galleryPaths,
        location_name: locationName.trim() || null,
        location_address: locationAddress.trim() || null,
        map_url: mapUrl.trim() || null,
      };

      if (isEdit && event) {
        const { error: upErr } = await sb
          .from("events")
          .update(payload)
          .eq("id", event.id);
        if (upErr) throw upErr;
      } else {
        const { error: insErr } = await sb.from("events").insert(payload);
        if (insErr) throw insErr;
      }

      toast.success(isEdit ? "Evento atualizado." : "Evento criado.");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar evento" : "Novo evento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Imagem {isEdit && "(opcional para manter atual)"}</Label>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-text-muted">
              JPG, PNG ou WEBP até 10MB.
            </p>
          </div>
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label>Cidade</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">Selecione...</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__custom__">Outra cidade...</option>
            </select>
            {city === "__custom__" && (
              <Input
                className="mt-2"
                placeholder="Digite a cidade"
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
              />
            )}
            <p className="mt-1 text-xs text-text-muted">
              Lista baseada nas cidades das propriedades cadastradas.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Texto do botão</Label>
            <Input
              value={buttonLabel}
              onChange={(e) => setButtonLabel(e.target.value)}
            />
          </div>
          <div>
            <Label>URL custom do botão (opcional)</Label>
            <Input
              type="url"
              value={buttonUrl}
              onChange={(e) => setButtonUrl(e.target.value)}
              placeholder="Deixe vazio para filtrar hospedagens pelas datas do evento"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <span style={{ fontSize: 13, color: "#5C5B57" }}>
                  {isActive ? "Ativo" : "Oculto"}
                </span>
              </div>
            </div>
          </div>
          {error && (
            <p className="text-sm" style={{ color: "#A63C2E" }}>
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}