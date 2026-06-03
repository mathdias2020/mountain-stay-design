import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PriceBreakdown } from "@/lib/pricing";
import type { PropertyDetail } from "@/lib/properties.functions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  property: PropertyDetail;
  checkin: Date | undefined;
  checkout: Date | undefined;
  guests: number;
  breakdown: PriceBreakdown | null;
}

export function ReservationModal({
  open,
  onOpenChange,
  property,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-surface">
        <DialogHeader>
          <DialogTitle>Solicitar reserva</DialogTitle>
          <DialogDescription>
            {property.name}
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 text-center text-sm text-text-muted">
          Formulário de reserva — será construído na Fase 5.
        </div>
      </DialogContent>
    </Dialog>
  );
}