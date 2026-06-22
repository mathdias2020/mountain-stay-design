import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  type Coupon,
} from "@/lib/coupons.functions";

type FormState = {
  id?: string;
  code: string;
  discount_percent: string;
  active: boolean;
  expires_at: string; // yyyy-mm-dd
  max_uses: string;
};

const EMPTY: FormState = {
  code: "",
  discount_percent: "10",
  active: true,
  expires_at: "",
  max_uses: "",
};

export function CouponsCard() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listCoupons);
  const createFn = useServerFn(createCoupon);
  const updateFn = useServerFn(updateCoupon);
  const deleteFn = useServerFn(deleteCoupon);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: () => fetchList(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pendingDelete, setPendingDelete] = useState<Coupon | null>(null);

  function openNew() {
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(c: Coupon) {
    setForm({
      id: c.id,
      code: c.code,
      discount_percent: String(c.discount_percent),
      active: c.active,
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      max_uses: c.max_uses != null ? String(c.max_uses) : "",
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      const code = form.code.trim().toUpperCase();
      const pct = Number(form.discount_percent);
      if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
        throw new Error("Código deve ter 3-30 caracteres (A-Z, 0-9, _ ou -).");
      }
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        throw new Error("Percentual deve estar entre 0,01 e 100.");
      }
      const expires_at = form.expires_at
        ? new Date(form.expires_at + "T23:59:59").toISOString()
        : null;
      const max_uses = form.max_uses.trim()
        ? Number(form.max_uses)
        : null;
      if (max_uses != null && (!Number.isInteger(max_uses) || max_uses < 1)) {
        throw new Error("Limite de usos deve ser um número inteiro positivo.");
      }
      const payload = {
        code,
        discount_percent: pct,
        active: form.active,
        expires_at,
        max_uses,
      };
      if (form.id) {
        await updateFn({ data: { id: form.id, ...payload } });
      } else {
        await createFn({ data: payload });
      }
    },
    onSuccess: () => {
      toast.success("Cupom salvo.");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Cupom excluído.");
      setPendingDelete(null);
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir."),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Cupons de desconto</CardTitle>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" />
          Novo cupom
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !coupons || coupons.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum cupom cadastrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Código</th>
                  <th className="py-2 font-medium">Desconto</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Validade</th>
                  <th className="py-2 font-medium">Usos</th>
                  <th className="py-2 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="py-2 font-medium">{c.code}</td>
                    <td className="py-2">{Number(c.discount_percent)}%</td>
                    <td className="py-2">
                      <span
                        className={
                          c.active
                            ? "rounded-full bg-[#E6F4EA] px-2 py-0.5 text-xs text-[#1F6F35]"
                            : "rounded-full bg-[#EEE] px-2 py-0.5 text-xs text-[#666]"
                        }
                      >
                        {c.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {c.expires_at
                        ? new Date(c.expires_at).toLocaleDateString("pt-BR")
                        : "Sem validade"}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {c.uses_count}
                      {c.max_uses != null ? ` / ${c.max_uses}` : " / ∞"}
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
              {form.id ? "Editar cupom" : "Novo cupom"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="cp-code">Código</Label>
              <Input
                id="cp-code"
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                placeholder="VERAO10"
                maxLength={30}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cp-pct">Desconto (%)</Label>
              <Input
                id="cp-pct"
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={form.discount_percent}
                onChange={(e) =>
                  setForm({ ...form, discount_percent: e.target.value })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="cp-active">Ativo</Label>
              <Switch
                id="cp-active"
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cp-exp">Validade (opcional)</Label>
              <Input
                id="cp-exp"
                type="date"
                value={form.expires_at}
                onChange={(e) =>
                  setForm({ ...form, expires_at: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cp-max">Limite de usos (opcional)</Label>
              <Input
                id="cp-max"
                type="number"
                min="1"
                step="1"
                value={form.max_uses}
                onChange={(e) =>
                  setForm({ ...form, max_uses: e.target.value })
                }
                placeholder="Deixe vazio para ilimitado"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending}
            >
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
            <AlertDialogTitle>Excluir cupom</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cupom{" "}
              <strong>{pendingDelete?.code}</strong>? Reservas existentes que já
              usaram o cupom manterão o desconto aplicado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                pendingDelete && remove.mutate(pendingDelete.id)
              }
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}