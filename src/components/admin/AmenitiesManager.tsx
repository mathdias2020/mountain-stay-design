import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  createAmenity,
  createAmenityCategory,
  deleteAmenity,
  deleteAmenityCategory,
  listAmenityCatalogAdmin,
  updateAmenity,
  updateAmenityCategory,
  type AmenityCategory,
  type AmenityItem,
} from "@/lib/amenities.functions";

type CatEdit = { id?: string; name: string; sort_order: number; is_active: boolean };
type ItemEdit = {
  id?: string;
  category_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export function AmenitiesManager() {
  const qc = useQueryClient();
  const list = useServerFn(listAmenityCatalogAdmin);
  const createCatFn = useServerFn(createAmenityCategory);
  const updateCatFn = useServerFn(updateAmenityCategory);
  const deleteCatFn = useServerFn(deleteAmenityCategory);
  const createItemFn = useServerFn(createAmenity);
  const updateItemFn = useServerFn(updateAmenity);
  const deleteItemFn = useServerFn(deleteAmenity);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "amenity-catalog"],
    queryFn: () => list(),
    staleTime: 0,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin", "amenity-catalog"] });

  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const toggleOpen = (id: string) =>
    setOpenCats((p) => ({ ...p, [id]: !p[id] }));

  // ---- Category dialog
  const [catDlg, setCatDlg] = useState<CatEdit | null>(null);
  const saveCat = useMutation({
    mutationFn: async (v: CatEdit) => {
      if (v.id) {
        await updateCatFn({
          data: {
            id: v.id,
            name: v.name,
            sort_order: v.sort_order,
            is_active: v.is_active,
          },
        });
      } else {
        await createCatFn({
          data: {
            name: v.name,
            sort_order: v.sort_order,
            is_active: v.is_active,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success("Família salva.");
      setCatDlg(null);
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro ao salvar."),
  });

  const [delCatId, setDelCatId] = useState<string | null>(null);
  const removeCat = useMutation({
    mutationFn: async (id: string) => deleteCatFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Família removida.");
      setDelCatId(null);
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro ao remover."),
  });

  // ---- Item dialog
  const [itemDlg, setItemDlg] = useState<ItemEdit | null>(null);
  const saveItem = useMutation({
    mutationFn: async (v: ItemEdit) => {
      if (v.id) {
        await updateItemFn({
          data: {
            id: v.id,
            category_id: v.category_id,
            name: v.name,
            sort_order: v.sort_order,
            is_active: v.is_active,
          },
        });
      } else {
        await createItemFn({
          data: {
            category_id: v.category_id,
            name: v.name,
            sort_order: v.sort_order,
            is_active: v.is_active,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success("Item salvo.");
      setItemDlg(null);
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro ao salvar."),
  });

  const [delItemId, setDelItemId] = useState<string | null>(null);
  const removeItem = useMutation({
    mutationFn: async (id: string) => deleteItemFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Item removido.");
      setDelItemId(null);
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro ao remover."),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Comodidades</CardTitle>
          <p className="mt-1 text-[12px]" style={{ color: "#9A9890" }}>
            Famílias e itens disponíveis para seleção no cadastro de
            propriedades.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() =>
            setCatDlg({ name: "", sort_order: 999, is_active: true })
          }
        >
          <Plus size={14} className="mr-1" />
          Nova família
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        )}
        {!isLoading &&
          (data?.categories ?? []).map((cat: AmenityCategory) => {
            const open = openCats[cat.id] ?? false;
            return (
              <div
                key={cat.id}
                className="rounded-lg border"
                style={{ borderColor: "#ECEBE7" }}
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-secondary"
                    onClick={() => toggleOpen(cat.id)}
                    aria-label={open ? "Recolher" : "Expandir"}
                  >
                    {open ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </button>
                  <button
                    type="button"
                    className="flex-1 text-left text-sm font-medium"
                    onClick={() => toggleOpen(cat.id)}
                    style={{ color: cat.is_active ? "#2F2E2A" : "#9A9890" }}
                  >
                    {cat.name}
                    <span
                      className="ml-2 text-[11px] font-normal"
                      style={{ color: "#9A9890" }}
                    >
                      ({cat.items.length}{" "}
                      {cat.items.length === 1 ? "item" : "itens"})
                      {!cat.is_active ? " · inativa" : ""}
                    </span>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setItemDlg({
                        category_id: cat.id,
                        name: "",
                        sort_order: 999,
                        is_active: true,
                      })
                    }
                  >
                    <Plus size={14} className="mr-1" /> Item
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setCatDlg({
                        id: cat.id,
                        name: cat.name,
                        sort_order: cat.sort_order,
                        is_active: cat.is_active,
                      })
                    }
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDelCatId(cat.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                {open && (
                  <ul
                    className="divide-y border-t"
                    style={{ borderColor: "#ECEBE7" }}
                  >
                    {cat.items.length === 0 && (
                      <li className="px-4 py-3 text-[13px] text-muted-foreground">
                        Nenhum item.
                      </li>
                    )}
                    {cat.items.map((it: AmenityItem) => (
                      <li
                        key={it.id}
                        className="flex items-center gap-2 px-4 py-2"
                      >
                        <span
                          className="flex-1 text-sm"
                          style={{
                            color: it.is_active ? "#2F2E2A" : "#9A9890",
                          }}
                        >
                          {it.name}
                          {!it.is_active && (
                            <span
                              className="ml-2 text-[11px]"
                              style={{ color: "#9A9890" }}
                            >
                              inativo
                            </span>
                          )}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setItemDlg({
                              id: it.id,
                              category_id: it.category_id,
                              name: it.name,
                              sort_order: it.sort_order,
                              is_active: it.is_active,
                            })
                          }
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDelItemId(it.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
      </CardContent>

      {/* Category dialog */}
      <Dialog open={!!catDlg} onOpenChange={(o) => !o && setCatDlg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {catDlg?.id ? "Editar família" : "Nova família"}
            </DialogTitle>
          </DialogHeader>
          {catDlg && (
            <div className="space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={catDlg.name}
                  onChange={(e) =>
                    setCatDlg({ ...catDlg, name: e.target.value })
                  }
                  placeholder="Ex: Área Externa"
                />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={catDlg.sort_order}
                  onChange={(e) =>
                    setCatDlg({
                      ...catDlg,
                      sort_order: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativa</Label>
                <Switch
                  checked={catDlg.is_active}
                  onCheckedChange={(v) =>
                    setCatDlg({ ...catDlg, is_active: v })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCatDlg(null)}>
              Cancelar
            </Button>
            <Button
              disabled={!catDlg?.name?.trim() || saveCat.isPending}
              onClick={() => catDlg && saveCat.mutate(catDlg)}
            >
              {saveCat.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={!!itemDlg} onOpenChange={(o) => !o && setItemDlg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {itemDlg?.id ? "Editar item" : "Novo item"}
            </DialogTitle>
          </DialogHeader>
          {itemDlg && (
            <div className="space-y-3">
              <div>
                <Label>Família *</Label>
                <Select
                  value={itemDlg.category_id}
                  onValueChange={(v) =>
                    setItemDlg({ ...itemDlg, category_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.categories ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nome *</Label>
                <Input
                  value={itemDlg.name}
                  onChange={(e) =>
                    setItemDlg({ ...itemDlg, name: e.target.value })
                  }
                  placeholder="Ex: Piscina aquecida"
                />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={itemDlg.sort_order}
                  onChange={(e) =>
                    setItemDlg({
                      ...itemDlg,
                      sort_order: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch
                  checked={itemDlg.is_active}
                  onCheckedChange={(v) =>
                    setItemDlg({ ...itemDlg, is_active: v })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setItemDlg(null)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !itemDlg?.name?.trim() ||
                !itemDlg?.category_id ||
                saveItem.isPending
              }
              onClick={() => itemDlg && saveItem.mutate(itemDlg)}
            >
              {saveItem.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete category confirm */}
      <AlertDialog
        open={!!delCatId}
        onOpenChange={(o) => !o && setDelCatId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover família?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os itens dela também serão excluídos. Propriedades que já
              tinham esses itens marcados perderão a marcação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => delCatId && removeCat.mutate(delCatId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete item confirm */}
      <AlertDialog
        open={!!delItemId}
        onOpenChange={(o) => !o && setDelItemId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item?</AlertDialogTitle>
            <AlertDialogDescription>
              Propriedades que tinham este item marcado perderão a marcação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => delItemId && removeItem.mutate(delItemId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}