export function formatBRL(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(n) ? (n as number) : 0);
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function nightsBetween(checkin: string, checkout: string): number {
  const a = new Date(checkin + "T00:00:00");
  const b = new Date(checkout + "T00:00:00");
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

export function onlyDigits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

export const RESERVATION_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  awaiting_contract: "Aguardando contrato",
  awaiting_balance: "Aguardando saldo",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Concluída",
};