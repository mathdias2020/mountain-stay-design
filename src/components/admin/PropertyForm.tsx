import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Crop, Plus, Star, Trash2, Upload, X } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { supabase } from "@/integrations/supabase/client";
import { generateThumbnail } from "@/lib/image-thumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultPropertyValues,
  propertyFormSchema,
  slugify,
  type PropertyFormValues,
} from "@/lib/property-form";
import { listAmenityCatalog } from "@/lib/amenities.functions";
import { listActiveCities } from "@/lib/cities.functions";
import { ImageCropDialog } from "@/components/admin/ImageCropDialog";

type ExistingPhoto = {
  id: string;
  storage_path: string;
  public_url: string;
  is_cover: boolean;
  sort_order: number;
};

type PhotoItem =
  | { kind: "existing"; data: ExistingPhoto; markedForDeletion?: boolean }
  | {
      kind: "new";
      tempId: string;
      file: File;
      previewUrl: string;
      isCover: boolean;
    };

export type PropertyFormProps = {
  mode: "create" | "edit";
  propertyId?: string;
  initialValues?: Partial<PropertyFormValues>;
  initialPhotos?: ExistingPhoto[];
};

const MAX_PHOTOS = 20;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BUCKET = "property-photos";

const sectionStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  padding: 24,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const sectionTitleStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 16,
  color: "#2F2E2A",
  marginBottom: 16,
  paddingBottom: 12,
  borderBottom: "1px solid #ECEBE7",
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p style={{ color: "#B43A3A", fontSize: 12, marginTop: 4 }}>{msg}</p>;
}

function errCls(hasError: boolean) {
  return hasError ? "border-red-500 focus-visible:ring-red-500" : "";
}

export function PropertyForm({ mode, propertyId, initialValues, initialPhotos }: PropertyFormProps) {
  const navigate = useNavigate();

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: { ...defaultPropertyValues, ...initialValues },
    mode: "onSubmit",
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = form;

  const name = watch("name");
  const description = watch("description") || "";
  const priceHigh = watch("price_high_season");
  const amenities = watch("amenities") || [];
  const acceptsPets = watch("accepts_pets");
  const featured = watch("featured");
  const tier = watch("tier");
  const slug = useMemo(() => slugify(name || ""), [name]);

  // Amenity catalog (admin selects from)
  const listCatalog = useServerFn(listAmenityCatalog);
  const { data: catalog } = useQuery({
    queryKey: ["amenity-catalog"],
    queryFn: () => listCatalog(),
    staleTime: 5 * 60 * 1000,
  });

  // Active cities (dynamic select)
  const listCitiesFn = useServerFn(listActiveCities);
  const { data: activeCities } = useQuery({
    queryKey: ["cities", "active"],
    queryFn: () => listCitiesFn(),
    staleTime: 5 * 60 * 1000,
  });

  const { fields: hsFields, append: hsAppend, remove: hsRemove } = useFieldArray({
    control,
    name: "high_season_dates",
  });

  // Photos state
  const [photos, setPhotos] = useState<PhotoItem[]>(() =>
    (initialPhotos ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => ({ kind: "existing" as const, data: p }))
  );

  // Crop queue (new uploads) and single-photo recrop
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [recropTarget, setRecropTarget] = useState<
    | { kind: "new"; tempId: string; file: File }
    | { kind: "existing"; id: string; url: string }
    | null
  >(null);

  useEffect(() => {
    return () => {
      photos.forEach((p) => {
        if (p.kind === "new") URL.revokeObjectURL(p.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleAmenity(name: string, checked: boolean) {
    const cur = watch("amenities") || [];
    if (checked) {
      if (!cur.includes(name)) setValue("amenities", [...cur, name]);
    } else {
      setValue("amenities", cur.filter((a) => a !== name));
    }
  }

  function addPhotoFiles(files: FileList | File[]) {
    const visible = photos.filter((p) => !(p.kind === "existing" && p.markedForDeletion));
    const remaining = MAX_PHOTOS - visible.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${MAX_PHOTOS} fotos`);
      return;
    }
    const arr = Array.from(files).slice(0, remaining);
    const valid: File[] = [];
    for (const file of arr) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: tipo não suportado`);
        continue;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        toast.error(`${file.name}: maior que 5MB`);
        continue;
      }
      valid.push(file);
    }
    if (valid.length) setCropQueue((q) => [...q, ...valid]);
  }

  function handleCropConfirm(croppedFile: File) {
    if (recropTarget) {
      const target = recropTarget;
      setRecropTarget(null);
      if (target.kind === "new") {
        setPhotos((prev) =>
          prev.map((p) => {
            if (p.kind === "new" && p.tempId === target.tempId) {
              URL.revokeObjectURL(p.previewUrl);
              return {
                ...p,
                file: croppedFile,
                previewUrl: URL.createObjectURL(croppedFile),
              };
            }
            return p;
          }),
        );
      } else {
        // Replace existing: mark old for deletion, add new
        setPhotos((prev) => {
          const next: PhotoItem[] = [];
          let wasCover = false;
          for (const p of prev) {
            if (p.kind === "existing" && p.data.id === target.id) {
              wasCover = p.data.is_cover;
              next.push({ ...p, markedForDeletion: true });
            } else {
              next.push(p);
            }
          }
          next.push({
            kind: "new",
            tempId: crypto.randomUUID(),
            file: croppedFile,
            previewUrl: URL.createObjectURL(croppedFile),
            isCover: wasCover,
          });
          return next;
        });
      }
      return;
    }
    // Coming from the new-upload queue
    setCropQueue((q) => q.slice(1));
    setPhotos((prev) => [
      ...prev,
      {
        kind: "new",
        tempId: crypto.randomUUID(),
        file: croppedFile,
        previewUrl: URL.createObjectURL(croppedFile),
        isCover: false,
      },
    ]);
  }

  function handleCropCancel() {
    if (recropTarget) {
      setRecropTarget(null);
      return;
    }
    // Skip current file in queue
    setCropQueue((q) => q.slice(1));
  }

  function requestRecrop(key: string) {
    const item = photos.find(
      (p) => (p.kind === "existing" ? p.data.id : p.tempId) === key,
    );
    if (!item) return;
    if (item.kind === "new") {
      setRecropTarget({ kind: "new", tempId: item.tempId, file: item.file });
    } else {
      setRecropTarget({ kind: "existing", id: item.data.id, url: item.data.public_url });
    }
  }

  function removePhoto(key: string) {
    setPhotos((prev) => {
      const next: PhotoItem[] = [];
      for (const p of prev) {
        const k = p.kind === "existing" ? p.data.id : p.tempId;
        if (k !== key) {
          next.push(p);
        } else if (p.kind === "existing") {
          next.push({ ...p, markedForDeletion: true });
        } else {
          URL.revokeObjectURL(p.previewUrl);
        }
      }
      return next;
    });
  }

  function setCover(key: string) {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.kind === "existing") {
          return { ...p, data: { ...p.data, is_cover: p.data.id === key } };
        }
        return { ...p, isCover: p.tempId === key };
      })
    );
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEndPhotos(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const visible = photos.filter((p) => !(p.kind === "existing" && p.markedForDeletion));
    const oldIdx = visible.findIndex(
      (p) => (p.kind === "existing" ? p.data.id : p.tempId) === active.id
    );
    const newIdx = visible.findIndex(
      (p) => (p.kind === "existing" ? p.data.id : p.tempId) === over.id
    );
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(visible, oldIdx, newIdx);
    const deleted = photos.filter((p) => p.kind === "existing" && p.markedForDeletion);
    setPhotos([...reordered, ...deleted]);
  }

  async function onSubmit(values: PropertyFormValues) {
    try {
      const payloadBase = {
        name: values.name,
        slug: slugify(values.name),
        city: values.city,
        address_detail: values.address_detail || null,
        google_maps_url: values.google_maps_url || null,
        description: values.description,
        status: values.status,
        featured: values.featured,
        tier: values.tier,
        max_guests: values.max_guests,
        bedrooms: values.bedrooms,
        bathrooms: values.bathrooms,
        parking_spots: values.parking_spots,
        price_weekday: values.price_weekday,
        price_weekend: values.price_weekend,
        price_high_season: values.price_high_season,
        cleaning_fee: values.cleaning_fee,
        min_nights_weekday: values.min_nights_weekday,
        min_nights_weekend: values.min_nights_weekend,
        high_season_dates:
          values.price_high_season && values.high_season_dates?.length
            ? values.high_season_dates
            : null,
        amenities: values.amenities,
        accepts_pets: values.accepts_pets,
        checkin_time: values.checkin_time,
        checkout_time: values.checkout_time,
        house_rules: values.house_rules || null,
      };

      let pid = propertyId;
      if (mode === "create") {
        const { data, error } = await supabase
          .from("properties")
          .insert(payloadBase)
          .select("id")
          .single();
        if (error) throw error;
        pid = data.id;
      } else {
        const { error } = await supabase
          .from("properties")
          .update(payloadBase)
          .eq("id", pid!);
        if (error) throw error;
      }
      if (!pid) throw new Error("ID da propriedade indisponível");

      // Delete removed existing photos
      const toDelete = photos.filter(
        (p): p is Extract<PhotoItem, { kind: "existing" }> =>
          p.kind === "existing" && !!p.markedForDeletion
      );
      if (toDelete.length) {
        const paths: string[] = [];
        for (const p of toDelete) {
          if (p.data.storage_path) paths.push(p.data.storage_path);
          if (p.data.public_url && !p.data.public_url.startsWith("http")) {
            paths.push(p.data.public_url);
          }
        }
        await supabase.storage.from(BUCKET).remove(paths);
        await supabase
          .from("property_photos")
          .delete()
          .in("id", toDelete.map((p) => p.data.id));
      }

      // Upload new photos
      const visible = photos.filter((p) => !(p.kind === "existing" && p.markedForDeletion));
      const newOrder: { id?: string; storage_path: string; public_url: string; is_cover: boolean }[] = [];

      for (let i = 0; i < visible.length; i++) {
        const p = visible[i];
        if (p.kind === "new") {
          const ext = p.file.name.split(".").pop() || "jpg";
          const id = crypto.randomUUID();
          const path = `properties/${pid}/${id}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, p.file, { contentType: p.file.type, upsert: false });
          if (upErr) throw upErr;
          // Also generate a small thumbnail used by listings / gallery preview
          // to keep the public site fast. Thumb storage path is stored in the
          // legacy `public_url` column (we no longer use public URLs).
          let thumbPath = "";
          try {
            const thumb = await generateThumbnail(p.file, 800, 0.78);
            if (thumb) {
              thumbPath = `properties/${pid}/${id}.thumb.jpg`;
              const { error: thErr } = await supabase.storage
                .from(BUCKET)
                .upload(thumbPath, thumb, {
                  contentType: "image/jpeg",
                  upsert: false,
                });
              if (thErr) thumbPath = "";
            }
          } catch {
            thumbPath = "";
          }
          newOrder.push({
            storage_path: path,
            public_url: thumbPath, // legacy column reused for thumb path
            is_cover: p.isCover,
          });
        } else {
          newOrder.push({
            id: p.data.id,
            storage_path: p.data.storage_path,
            public_url: p.data.public_url,
            is_cover: p.data.is_cover,
          });
        }
      }

      // Ensure exactly one cover if any photo exists
      if (newOrder.length && !newOrder.some((p) => p.is_cover)) {
        newOrder[0].is_cover = true;
      }
      let coverSeen = false;
      newOrder.forEach((p) => {
        if (p.is_cover && coverSeen) p.is_cover = false;
        if (p.is_cover) coverSeen = true;
      });

      // Insert new ones
      const inserts = newOrder
        .filter((p) => !p.id)
        .map((p, idx) => ({
          property_id: pid as string,
          storage_path: p.storage_path,
          public_url: p.public_url,
          is_cover: p.is_cover,
          sort_order: newOrder.findIndex((x) => x.storage_path === p.storage_path),
        }));
      if (inserts.length) {
        const { error } = await supabase.from("property_photos").insert(inserts);
        if (error) throw error;
      }

      // Update existing photos sort_order and is_cover
      for (let i = 0; i < newOrder.length; i++) {
        const p = newOrder[i];
        if (p.id) {
          await supabase
            .from("property_photos")
            .update({ sort_order: i, is_cover: p.is_cover })
            .eq("id", p.id);
        }
      }

      toast.success("Propriedade salva com sucesso.");
      navigate({ to: "/admin/propriedades" as never });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar";
      toast.error(msg);
    }
  }

  function onInvalid() {
    toast.error("Verifique os campos destacados.");
  }

  const visiblePhotos = photos.filter((p) => !(p.kind === "existing" && p.markedForDeletion));

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
      {/* Informações básicas */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Informações básicas</h2>
        <div className="grid gap-4">
          <div>
            <Label>Nome da propriedade *</Label>
            <Input
              {...register("name")}
              className={errCls(!!errors.name)}
              placeholder="Ex: Chalé Vista da Pedra"
            />
            <p style={{ fontSize: 12, color: "#9A9890", marginTop: 4 }}>
              URL: rotainstay.com.br/imovel/{slug || "[slug]"}
            </p>
            <FieldError msg={errors.name?.message} />
          </div>

          <div>
            <Label>Cidade *</Label>
            <Select
              value={watch("city")}
              onValueChange={(v) => setValue("city", v)}
            >
              <SelectTrigger className={errCls(!!errors.city)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const current = watch("city");
                  const options = activeCities ?? [];
                  const hasCurrent =
                    !current || options.some((c) => c.name === current);
                  return (
                    <>
                      {!hasCurrent && current ? (
                        <SelectItem value={current}>
                          {current} (inativa)
                        </SelectItem>
                      ) : null}
                      {options.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                  </SelectItem>
                ))}
                    </>
                  );
                })()}
              </SelectContent>
            </Select>
            <FieldError msg={errors.city?.message} />
          </div>

          <div>
            <Label>Endereço interno (não exibido ao público)</Label>
            <Input {...register("address_detail")} />
          </div>

          <div>
            <Label>URL Google Maps</Label>
            <Input
              {...register("google_maps_url")}
              placeholder="https://maps.google.com/..."
              className={errCls(!!errors.google_maps_url)}
            />
            <FieldError msg={errors.google_maps_url?.message} />
          </div>

          <div>
            <Label>Descrição *</Label>
            <Textarea
              {...register("description")}
              rows={6}
              className={errCls(!!errors.description)}
            />
            <div className="flex justify-between">
              <FieldError msg={errors.description?.message} />
              <p style={{ fontSize: 12, color: "#9A9890", marginTop: 4 }}>
                {description.length}/2000
              </p>
            </div>
          </div>

          <div>
            <Label>Status *</Label>
            <Select
              value={watch("status")}
              onValueChange={(v) => setValue("status", v as PropertyFormValues["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="inactive">Inativa</SelectItem>
                <SelectItem value="maintenance">Manutenção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Destacar no topo</Label>
            <Switch checked={featured} onCheckedChange={(v) => setValue("featured", v)} />
          </div>
        </div>
      </section>

      {/* Classificação interna */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Classificação interna</h2>
        <div>
          <Label>Tier de qualidade *</Label>
          <Select
            value={String(tier ?? 3)}
            onValueChange={(v) =>
              setValue("tier", Number(v) as PropertyFormValues["tier"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 — Premium (o melhor do portfólio)</SelectItem>
              <SelectItem value="2">2 — Destaque (muito boa)</SelectItem>
              <SelectItem value="3">3 — Padrão (boa, sólida)</SelectItem>
              <SelectItem value="4">4 — Entrada (mais simples ou de giro)</SelectItem>
            </SelectContent>
          </Select>
          <p style={{ fontSize: 12, color: "#9A9890", marginTop: 6 }}>
            Esta classificação é interna e nunca aparece para os visitantes do site.
            Define a ordem de exibição nas seções de sugestões.
          </p>
        </div>
      </section>

      {/* Capacidade */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Capacidade</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NumberField label="Máx. hóspedes *" name="max_guests" register={register} error={errors.max_guests?.message} min={1} max={30} />
          <NumberField label="Quartos *" name="bedrooms" register={register} error={errors.bedrooms?.message} min={0} max={20} />
          <NumberField label="Banheiros *" name="bathrooms" register={register} error={errors.bathrooms?.message} min={1} max={20} />
          <NumberField label="Vagas de garagem *" name="parking_spots" register={register} error={errors.parking_spots?.message} min={0} max={20} />
        </div>
      </section>

      {/* Preços */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Preços</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MoneyField label="Diária semana (seg–qui) *" name="price_weekday" register={register} error={errors.price_weekday?.message} />
          <MoneyField label="Diária fim de semana *" name="price_weekend" register={register} error={errors.price_weekend?.message} />
          <MoneyField
            label="Alta temporada (Carnaval, Festas Juninas, Natal/Ano Novo)"
            name="price_high_season"
            register={register}
            error={errors.price_high_season?.message}
            allowNull
          />
          <MoneyField label="Taxa de limpeza *" name="cleaning_fee" register={register} error={errors.cleaning_fee?.message} />
          <NumberField label="Mínimo noites (semana) *" name="min_nights_weekday" register={register} error={errors.min_nights_weekday?.message} min={1} />
          <NumberField label="Mínimo noites (fim de semana) *" name="min_nights_weekend" register={register} error={errors.min_nights_weekend?.message} min={1} />
        </div>
      </section>

      {/* Alta temporada */}
      {priceHigh != null && priceHigh !== 0 && (
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Alta temporada</h2>
          <div className="space-y-3">
            {hsFields.map((field, idx) => (
              <div key={field.id} className="flex items-end gap-3">
                <div className="flex-1">
                  <Label>Início</Label>
                  <Input type="date" {...register(`high_season_dates.${idx}.start` as const)} />
                </div>
                <div className="flex-1">
                  <Label>Fim</Label>
                  <Input type="date" {...register(`high_season_dates.${idx}.end` as const)} />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => hsRemove(idx)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => hsAppend({ start: "", end: "" })}
            >
              <Plus size={14} className="mr-1" /> Adicionar período
            </Button>
          </div>
        </section>
      )}

      {/* Comodidades */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Comodidades</h2>
        {!catalog && (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        )}
        {catalog && catalog.categories.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma comodidade cadastrada. Cadastre famílias e itens em
            Configurações &gt; Comodidades.
          </p>
        )}
        <div className="space-y-5">
          {(catalog?.categories ?? []).map((cat) => (
            <div key={cat.id}>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#5C5B57",
                  marginBottom: 8,
                }}
              >
                {cat.name}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {cat.items.map((it) => {
                  const checked = amenities.includes(it.slug);
                  return (
                    <label
                      key={it.slug}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleAmenity(it.slug, !!v)}
                      />
                      <span style={{ fontSize: 14, color: "#2F2E2A" }}>
                        {it.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <Label>Aceita animais de estimação</Label>
          <Switch checked={acceptsPets} onCheckedChange={(v) => setValue("accepts_pets", v)} />
        </div>
      </section>

      {/* Regras */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Regras</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Check-in *</Label>
            <Input {...register("checkin_time")} placeholder="14:00" className={errCls(!!errors.checkin_time)} />
            <FieldError msg={errors.checkin_time?.message} />
          </div>
          <div>
            <Label>Check-out *</Label>
            <Input {...register("checkout_time")} placeholder="11:00" className={errCls(!!errors.checkout_time)} />
            <FieldError msg={errors.checkout_time?.message} />
          </div>
        </div>
        <div className="mt-4">
          <Label>Regras da casa</Label>
          <Textarea
            {...register("house_rules")}
            rows={4}
            placeholder="Descreva as regras da casa, restrições e informações importantes para os hóspedes."
          />
        </div>
      </section>

      {/* Fotos */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Fotos</h2>
        <PhotoDropzone onFiles={addPhotoFiles} disabled={visiblePhotos.length >= MAX_PHOTOS} />
        <p style={{ fontSize: 12, color: "#9A9890", marginTop: 8 }}>
          {visiblePhotos.length}/{MAX_PHOTOS} fotos · JPG/PNG/WebP até 5MB
        </p>

        {visiblePhotos.length > 0 && (
          <div className="mt-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndPhotos}>
              <SortableContext
                items={visiblePhotos.map((p) =>
                  p.kind === "existing" ? p.data.id : p.tempId
                )}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {visiblePhotos.map((p) => {
                    const key = p.kind === "existing" ? p.data.id : p.tempId;
                    const url = p.kind === "existing" ? p.data.public_url : p.previewUrl;
                    const isCover = p.kind === "existing" ? p.data.is_cover : p.isCover;
                    return (
                      <PhotoThumb
                        key={key}
                        id={key}
                        url={url}
                        isCover={isCover}
                        onRemove={() => removePhoto(key)}
                        onSetCover={() => setCover(key)}
                        onRecrop={() => requestRecrop(key)}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </section>

      <ImageCropDialog
        open={!!recropTarget || cropQueue.length > 0}
        source={
          recropTarget
            ? recropTarget.kind === "new"
              ? { kind: "file", file: recropTarget.file }
              : { kind: "url", url: recropTarget.url }
            : cropQueue[0]
              ? { kind: "file", file: cropQueue[0] }
              : null
        }
        title={recropTarget ? "Recortar foto" : `Recortar foto (${cropQueue.length} restante${cropQueue.length === 1 ? "" : "s"})`}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />

      {/* Footer */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate({ to: "/admin/propriedades" as never })}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar propriedade"}
        </Button>
      </div>
    </form>
  );
}

function NumberField({
  label,
  name,
  register,
  error,
  min,
  max,
}: {
  label: string;
  name: keyof PropertyFormValues;
  register: ReturnType<typeof useForm<PropertyFormValues>>["register"];
  error?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        {...register(name as never, { valueAsNumber: true })}
        className={errCls(!!error)}
      />
      <FieldError msg={error} />
    </div>
  );
}

function MoneyField({
  label,
  name,
  register,
  error,
  allowNull,
}: {
  label: string;
  name: keyof PropertyFormValues;
  register: ReturnType<typeof useForm<PropertyFormValues>>["register"];
  error?: string;
  allowNull?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <span
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 13,
            color: "#5C5B57",
          }}
        >
          R$
        </span>
        <Input
          type="number"
          step="0.01"
          min={0}
          {...register(name as never, {
            setValueAs: (v) => {
              if (v === "" || v === null || v === undefined) return allowNull ? null : 0;
              const n = Number(v);
              return Number.isFinite(n) ? n : allowNull ? null : 0;
            },
          })}
          className={`pl-9 ${errCls(!!error)}`}
        />
      </div>
      <FieldError msg={error} />
    </div>
  );
}

function PhotoDropzone({
  onFiles,
  disabled,
}: {
  onFiles: (files: FileList | File[]) => void;
  disabled?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
      }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 24,
        border: `2px dashed ${dragOver ? "#6B7052" : "#DDDCD9"}`,
        borderRadius: 12,
        background: dragOver ? "#F5F4F1" : "#FAFAF8",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Upload size={20} color="#6B7052" />
      <p style={{ fontSize: 13, color: "#5C5B57" }}>
        Arraste fotos aqui ou clique para selecionar
      </p>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />
    </label>
  );
}

function PhotoThumb({
  id,
  url,
  isCover,
  onRemove,
  onSetCover,
  onRecrop,
}: {
  id: string;
  url: string;
  isCover: boolean;
  onRemove: () => void;
  onSetCover: () => void;
  onRecrop: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: "hidden",
    background: "#DDDCD9",
    opacity: isDragging ? 0.6 : 1,
    cursor: "grab",
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <img
        src={url}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Remover"
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: 0,
          cursor: "pointer",
        }}
      >
        <X size={14} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSetCover();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Definir como capa"
        style={{
          position: "absolute",
          top: 4,
          left: 4,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: "rgba(255,255,255,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: 0,
          cursor: "pointer",
        }}
      >
        <Star size={14} color="#B07D2E" fill={isCover ? "#B07D2E" : "transparent"} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRecrop();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Recortar"
        title="Recortar"
        style={{
          position: "absolute",
          bottom: 4,
          right: 4,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: 0,
          cursor: "pointer",
        }}
      >
        <Crop size={13} />
      </button>
    </div>
  );
}