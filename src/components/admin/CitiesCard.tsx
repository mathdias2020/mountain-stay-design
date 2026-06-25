import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

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
  listCities,
  createCity,
  updateCity,
  deleteCity,
  type City,
} from "@/lib/cities.functions";

type FormState = {
  id?: string;
  name: string;
  active: boolean;
  sort_order: string;
};

const EMPTY: FormState = {
  name: "",
  active: true,
  sort_order: "100",
};

export function CitiesCard() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listCities);
  const createFn = useServerFn(createCity);
  const updateFn = useServerFn(updateCity);
  const deleteFn = useServerFn(deleteCity);

  const { data: cities, isLoading } = useQuery({
    queryKey: ["admin", "cities"],
    queryFn: () => fetchList(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<City | null>(null);

  function openNew() {
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(c: City) {
    setForm({
      id: c.id,
      name: c.name,
      active: c.active,
      sort_order: String(c.sort_order),
    });
    setOpen(true);
  }

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["admin", "cities"] });
    qc.invalidateQueries({ queryKey: ["cities", "active"] });
  }

  const save = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      if (name.length < 2) throw new Error("Nome muito curto.");
      const sort = Number(form.sort_order);
      if (!Number.isInteger(sort) || sort < 0) {
        throw new Error("Ordem deve ser um número inteiro positivo.");
      }
      const payload = { name, active: form.active, sort_order: sort };
      if (form.id) {
        await updateFn({ data: { id: form.id, ...payload } });
      } else {
        await createFn({ data: payload });
      }
    },
    onSuccess: () => {
      toast.success("Cidade salva.");
      setOpen(false);
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Cidade excluída.");
      setPendingDelete(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir."),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Cidades atendidas</CardTitle>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" />
          Nova cidade
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !cities || cities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma cidade cadastrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Nome</th>
                  <th className="py-2 font-medium">Slug</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Ordem</th>
                  <th className="py-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="py-2 font-medium">{c.name}</td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {c.slug}
                    </td>
                    <td className="py-2">
                      <span
                        className={
                          c.active
                            ? "rounded-full bg-[#E6F4EA] px-2 py-0.5 text-xs text-[#1F6F35]"
                            : "rounded-full bg-[#EEE] px-2 py-0.5 text-xs text-[#666]"
                        }
                      >
                        {c.active ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {c.sort_order}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(c)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingDelete(c)}
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.id ? "Editar cidade" : "Nova cidade"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="ct-name">Nome</Label>
              <Input
                id="ct-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Domingos Martins"
                maxLength={80}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ct-active">Ativa</Label>
              <Switch
                id="ct-active"
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ct-order">Ordem</Label>
              <Input
                id="ct-order"
                type="number"
                min="0"
                step="1"
                value={form.sort_order}
                onChange={(e) =>
                  setForm({ ...form, sort_order: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Menor número aparece primeiro nos selects.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cidade</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a cidade{" "}
              <strong>{pendingDelete?.name}</strong>? Se houver propriedades
              associadas, a exclusão será bloqueada — desative em vez disso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && remove.mutate(pendingDelete.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}