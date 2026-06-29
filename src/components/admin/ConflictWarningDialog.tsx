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
import { formatDateBR } from "@/lib/admin-format";

export type ConflictPayload = {
  reservations: Array<{
    id: string;
    reservation_code: string;
    guest_name: string;
    checkin_date: string;
    checkout_date: string;
    status: string;
  }>;
  blocks: Array<{
    id: string;
    start_date: string;
    end_date: string;
    reason: string | null;
  }>;
};

export function ConflictWarningDialog({
  open,
  onOpenChange,
  conflicts,
  onConfirm,
  confirmLabel = "Salvar mesmo assim",
  title = "Conflito de datas",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: ConflictPayload | null;
  onConfirm: () => void;
  confirmLabel?: string;
  title?: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            As datas escolhidas se sobrepõem aos itens abaixo. Você pode
            cancelar e ajustar, ou continuar mesmo assim (overbooking).
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="max-h-72 overflow-auto rounded-md border p-3 text-sm">
          {conflicts?.reservations.map((r) => (
            <div key={r.id} className="mb-2">
              <div className="font-medium">
                Reserva {r.reservation_code} — {r.guest_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDateBR(r.checkin_date)} a {formatDateBR(r.checkout_date)} · {r.status}
              </div>
            </div>
          ))}
          {conflicts?.blocks.map((b) => (
            <div key={b.id} className="mb-2">
              <div className="font-medium">Bloqueio: {b.reason || "—"}</div>
              <div className="text-xs text-muted-foreground">
                {formatDateBR(b.start_date)} a {formatDateBR(b.end_date)}
              </div>
            </div>
          ))}
          {conflicts &&
            conflicts.reservations.length === 0 &&
            conflicts.blocks.length === 0 && (
              <div className="text-muted-foreground">Sem detalhes.</div>
            )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}