import { Link } from "@tanstack/react-router";
import { ClipboardList, Eye, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  formatBRL,
  formatDateBR,
  nightsBetween,
  onlyDigits,
  RESERVATION_STATUS_LABEL,
} from "@/lib/admin-format";

export type ReservationRow = {
  id: string;
  reservation_code: string;
  property_name: string | null;
  guest_name: string;
  guest_whatsapp: string;
  checkin_date: string;
  checkout_date: string;
  total_price: number | string;
  status: string;
};

function statusVariant(status: string) {
  switch (status) {
    case "confirmed":
      return { bg: "#E6F4EA", fg: "#1F6F35" };
    case "pending":
      return { bg: "#FFF4E0", fg: "#8A5A12" };
    case "cancelled":
      return { bg: "#FBE0DC", fg: "#A63C2E" };
    case "completed":
      return { bg: "#E2E5EA", fg: "#3F4757" };
    default:
      return { bg: "#EEE", fg: "#333" };
  }
}

function StatusPill({ status }: { status: string }) {
  const c = statusVariant(status);
  return (
    <Badge
      variant="outline"
      className="border-0 font-medium"
      style={{ backgroundColor: c.bg, color: c.fg, fontSize: 12 }}
    >
      {RESERVATION_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function ReservationsTable({
  rows,
  loading,
  emptyMessage = "Nenhuma reserva encontrada.",
}: {
  rows: ReservationRow[];
  loading?: boolean;
  emptyMessage?: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-[14px] bg-white"
      style={{ boxShadow: "0 4px 14px -8px rgba(0,0,0,0.12)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full" style={{ fontSize: 13 }}>
          <thead>
            <tr className="text-left" style={{ color: "#5C5B57" }}>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Código</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Propriedade</th>
              <th className="px-4 py-3 font-medium">Hóspede</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Período</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-t border-[#ECEBE7]">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td
                      key={j}
                      className={
                        "px-4 py-4" +
                        ([0, 1, 3, 4].includes(j) ? " hidden md:table-cell" : "")
                      }
                    >
                      <div
                        className="h-4 w-full animate-pulse rounded"
                        style={{ backgroundColor: "#E2E1DD" }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <ClipboardList size={96} color="#DDDCD9" strokeWidth={1.5} />
                    <p className="text-sm" style={{ color: "#5C5B57" }}>
                      {emptyMessage}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const nights = nightsBetween(r.checkin_date, r.checkout_date);
                const wa = onlyDigits(r.guest_whatsapp);
                return (
                  <tr
                    key={r.id}
                    style={{ backgroundColor: i % 2 === 1 ? "#F5F4F1" : "#FFFFFF" }}
                  >
                    <td className="hidden px-4 py-3 md:table-cell" style={{ fontWeight: 500 }}>
                      {r.reservation_code}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">{r.property_name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div>{r.guest_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.guest_whatsapp}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div>
                        {formatDateBR(r.checkin_date)} a {formatDateBR(r.checkout_date)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {nights} {nights === 1 ? "noite" : "noites"}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell" style={{ fontWeight: 500 }}>
                      {formatBRL(r.total_price)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={wa ? `https://wa.me/${wa}` : undefined}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Abrir WhatsApp"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                        <Link
                          to="/admin/reservas/$id"
                          params={{ id: r.id }}
                          aria-label="Ver detalhes"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}