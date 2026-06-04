import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Eye, Home as HomeIcon, Pencil, Star } from "lucide-react";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { EmptyState } from "@/components/admin/EmptyState";

export const Route = createFileRoute("/_admin/admin/propriedades/")({
  head: () => ({ meta: [{ title: "Propriedades — RotainStay" }] }),
  component: PropertiesAdminPage,
});

type PropertyRow = {
  id: string;
  name: string;
  slug: string;
  city: string;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  price_weekday: number | string;
  status: string;
  featured: boolean;
  sort_order: number | null;
  cover_url: string | null;
};

const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  active: { label: "Ativa", bg: "#E6F4EA", fg: "#1F6F35" },
  inactive: { label: "Inativa", bg: "#ECEBE7", fg: "#5C5B57" },
  maintenance: { label: "Manutenção", bg: "#FFF4E0", fg: "#8A5A12" },
};

async function fetchProperties(statusFilter: string): Promise<PropertyRow[]> {
  let q = supabase
    .from("properties")
    .select(
      "id, name, slug, city, max_guests, bedrooms, bathrooms, price_weekday, status, featured, sort_order"
    )
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  if (statusFilter !== "all") q = q.eq("status", statusFilter);
  const { data, error } = await q;
  if (error) throw error;

  const ids = (data ?? []).map((p) => p.id);
  let coverMap = new Map<string, string>();
  if (ids.length > 0) {
    const { data: photos } = await supabase
      .from("property_photos")
      .select("property_id, storage_path, is_cover, sort_order")
      .in("property_id", ids)
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true });
    const firstByProp = new Map<string, string>();
    for (const ph of photos ?? []) {
      if (!firstByProp.has(ph.property_id) && ph.storage_path) {
        firstByProp.set(ph.property_id, ph.storage_path);
      }
    }
    await Promise.all(
      Array.from(firstByProp.entries()).map(async ([pid, path]) => {
        const { data: signed } = await supabase.storage
          .from("property-photos")
          .createSignedUrl(path, 60 * 60);
        if (signed?.signedUrl) coverMap.set(pid, signed.signedUrl);
      }),
    );
  }

  return (data ?? []).map((p) => ({ ...p, cover_url: coverMap.get(p.id) ?? null }));
}

function formatPrice(v: number | string) {
  const n = typeof v === "string" ? Number(v) : v;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n || 0);
}

function PropertiesAdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "properties", statusFilter],
    queryFn: () => fetchProperties(statusFilter),
  });

  const [localOrder, setLocalOrder] = useState<PropertyRow[] | null>(null);
  const rows = localOrder ?? data ?? [];

  const ids = useMemo(() => rows.map((r) => r.id), [rows]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = rows.findIndex((r) => r.id === active.id);
    const newIdx = rows.findIndex((r) => r.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(rows, oldIdx, newIdx);
    setLocalOrder(next);

    const updates = next.map((r, i) => ({ id: r.id, sort_order: i + 1 }));
    const results = await Promise.all(
      updates.map((u) =>
        supabase.from("properties").update({ sort_order: u.sort_order }).eq("id", u.id)
      )
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error("Erro ao salvar nova ordem");
      setLocalOrder(null);
    } else {
      toast.success("Ordem atualizada");
      qc.invalidateQueries({ queryKey: ["admin", "properties"] });
      setLocalOrder(null);
    }
  }

  async function toggleFeatured(row: PropertyRow) {
    const { error } = await supabase
      .from("properties")
      .update({ featured: !row.featured })
      .eq("id", row.id);
    if (error) {
      toast.error("Erro ao atualizar destaque");
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin", "properties"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 style={{ fontWeight: 600, fontSize: 24, color: "#2F2E2A" }}>Propriedades</h1>
        <Button onClick={() => navigate({ to: "/admin/propriedades/nova" as never })}>
          Nova propriedade
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <span style={{ fontSize: 13, color: "#5C5B57" }}>Filtrar por status:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativa</SelectItem>
            <SelectItem value="inactive">Inativa</SelectItem>
            <SelectItem value="maintenance">Manutenção</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 w-full animate-pulse rounded-[10px] bg-[#E2E1DD]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={HomeIcon}
          title="Nenhuma propriedade cadastrada ainda."
          action={
            <Button onClick={() => navigate({ to: "/admin/propriedades/nova" as never })}>
              Cadastrar primeira propriedade
            </Button>
          }
        />
      ) : (
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        <div
          className="hidden md:grid md:items-center md:gap-3 md:px-4 md:py-3 md:[grid-template-columns:80px_1.6fr_1.4fr_1fr_110px_70px_110px]"
          style={{
            fontSize: 12,
            color: "#9A9890",
            borderBottom: "1px solid #ECEBE7",
          }}
        >
          <div>Foto</div>
          <div>Nome / cidade</div>
          <div>Capacidade</div>
          <div>Preço base</div>
          <div>Status</div>
          <div>Destaque</div>
          <div className="text-right">Ações</div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {rows.map((row, idx) => (
                <PropertyRowItem
                  key={row.id}
                  row={row}
                  index={idx}
                  onToggleFeatured={() => toggleFeatured(row)}
                  onEdit={() =>
                    navigate({ to: `/admin/propriedades/${row.id}/editar` as never })
                  }
                />
              ))}
            </SortableContext>
        </DndContext>
      </div>
      )}
    </div>
  );
}

function PropertyRowItem({
  row,
  index,
  onToggleFeatured,
  onEdit,
}: {
  row: PropertyRow;
  index: number;
  onToggleFeatured: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });
  const meta = STATUS_META[row.status] ?? STATUS_META.inactive;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: isDragging ? "#FAFAF8" : index % 2 === 1 ? "#F5F4F1" : "#fff",
    borderBottom: "1px solid #ECEBE7",
    cursor: isDragging ? "grabbing" : "default",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid items-center gap-3 px-4 py-3 [grid-template-columns:60px_1fr_auto] md:[grid-template-columns:80px_1.6fr_1.4fr_1fr_110px_70px_110px]"
    >
      <div {...attributes} {...listeners} style={{ cursor: "grab" }}>
        {row.cover_url ? (
          <img
            src={row.cover_url}
            alt={row.name}
            style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 8,
              background: "#DDDCD9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <HomeIcon size={24} color="#9A9890" />
          </div>
        )}
      </div>
      <div>
        <div style={{ fontWeight: 500, color: "#2F2E2A" }}>{row.name}</div>
        <div style={{ fontSize: 12, color: "#9A9890" }}>{row.city}</div>
        <div className="mt-1 md:hidden">
          <Badge
            style={{ background: meta.bg, color: meta.fg, borderColor: "transparent" }}
            variant="outline"
          >
            {meta.label}
          </Badge>
        </div>
      </div>
      <div className="hidden md:block" style={{ fontSize: 13, color: "#5C5B57" }}>
        {row.max_guests} hóspedes · {row.bedrooms} quartos · {row.bathrooms} banheiros
      </div>
      <div className="hidden md:block" style={{ fontSize: 13, color: "#2F2E2A" }}>{formatPrice(row.price_weekday)}/noite</div>
      <div className="hidden md:block">
        <Badge
          style={{ background: meta.bg, color: meta.fg, borderColor: "transparent" }}
          variant="outline"
        >
          {meta.label}
        </Badge>
      </div>
      <div className="hidden md:block">
        <button
          type="button"
          onClick={onToggleFeatured}
          aria-label={row.featured ? "Remover destaque" : "Destacar"}
          style={{ background: "transparent", border: 0, cursor: "pointer", padding: 4 }}
        >
          <Star
            size={20}
            color="#B07D2E"
            fill={row.featured ? "#B07D2E" : "transparent"}
          />
        </button>
      </div>
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Editar">
          <Pencil size={16} />
        </Button>
        <Button variant="ghost" size="icon" asChild aria-label="Ver imóvel">
          <a href={`/imovel/${row.slug}`} target="_blank" rel="noreferrer">
            <Eye size={16} />
          </a>
        </Button>
      </div>
    </div>
  );
}