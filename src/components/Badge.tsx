import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "pendente" | "confirmada" | "cancelada" | "concluida";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  pendente: "bg-badge-pendente-bg text-badge-pendente-fg",
  confirmada: "bg-badge-confirmada-bg text-badge-confirmada-fg",
  cancelada: "bg-badge-cancelada-bg text-badge-cancelada-fg",
  concluida: "bg-badge-concluida-bg text-badge-concluida-fg",
};

const labels: Record<BadgeVariant, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  concluida: "Concluída",
};

export function Badge({
  className,
  variant = "pendente",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children ?? labels[variant]}
    </span>
  );
}

export default Badge;