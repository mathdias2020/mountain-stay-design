import {
  Waves,
  Flame,
  Wifi,
  Snowflake,
  Tv,
  ChefHat,
  WashingMachine,
  Car,
  PawPrint,
  Accessibility,
  Mountain,
  Droplets,
  Gamepad2,
  Check,
  type LucideIcon,
} from "lucide-react";

type AmenityDef = { key: string; label: string; icon: LucideIcon };

export const AMENITIES: AmenityDef[] = [
  { key: "pool", label: "Piscina", icon: Waves },
  { key: "bbq", label: "Churrasqueira", icon: Flame },
  { key: "wifi", label: "Wi-Fi", icon: Wifi },
  { key: "fireplace", label: "Lareira", icon: Flame },
  { key: "ac", label: "Ar-condicionado", icon: Snowflake },
  { key: "tv", label: "TV Smart", icon: Tv },
  { key: "kitchen", label: "Cozinha equipada", icon: ChefHat },
  { key: "washer", label: "Máquina de lavar", icon: WashingMachine },
  { key: "parking", label: "Estacionamento", icon: Car },
  { key: "pets", label: "Aceita pets", icon: PawPrint },
  { key: "accessibility", label: "Acessibilidade", icon: Accessibility },
  { key: "mountain_view", label: "Vista para montanha", icon: Mountain },
  { key: "waterfall", label: "Beira de cachoeira", icon: Droplets },
  { key: "games", label: "Área de jogos", icon: Gamepad2 },
];

const BY_KEY = new Map(AMENITIES.map((a) => [a.key, a]));
const BY_LABEL = new Map(
  AMENITIES.map((a) => [a.label.toLowerCase(), a]),
);

function resolveAmenity(raw: string): AmenityDef {
  const k = raw.toLowerCase().trim();
  return (
    BY_KEY.get(k) ??
    BY_LABEL.get(k) ??
    { key: raw, label: raw, icon: Check }
  );
}

export function AmenitiesList({ items }: { items: string[] }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        Nenhuma comodidade informada.
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((raw) => {
        const a = resolveAmenity(raw);
        const Icon = a.icon;
        return (
          <li
            key={raw}
            className="flex items-center gap-2 text-sm text-text-secondary"
          >
            <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
            {a.label}
          </li>
        );
      })}
    </ul>
  );
}