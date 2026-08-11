export const WEEKDAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export const PET_MODE_LABELS: Record<string, string> = {
  per_reservation: "Por reserva",
  per_night: "Por noite",
  per_pet: "Por pet",
  per_pet_night: "Por pet por noite",
};

export const FEE_MODE_LABELS: Record<string, string> = {
  fixed_per_reservation: "Valor fixo por reserva",
  per_night: "Valor por noite",
  per_guest: "Valor por hóspede",
  per_guest_night: "Valor por hóspede/noite",
  per_pet: "Valor por pet",
  per_pet_night: "Valor por pet/noite",
  percent_of_lodging: "Percentual sobre hospedagem",
};

export const PRICING_QUERY_KEY = (id: string) => ["admin", "pricing", id];

export function toNum(v: string, fallback = 0): number {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

export const cardStyle: React.CSSProperties = {
  boxShadow: "0 4px 14px -8px rgba(0,0,0,0.10)",
};
