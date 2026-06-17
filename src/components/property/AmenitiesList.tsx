import { Check } from "lucide-react";

export type AmenityListItem = {
  slug: string;
  label: string;
  category: string;
};

export function AmenitiesList({ items }: { items: AmenityListItem[] }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-text-muted">Nenhuma comodidade informada.</p>
    );
  }

  // Group by category preserving incoming order
  const groups: { category: string; items: AmenityListItem[] }[] = [];
  const idx = new Map<string, number>();
  for (const it of items) {
    const key = it.category || "Outros";
    if (!idx.has(key)) {
      idx.set(key, groups.length);
      groups.push({ category: key, items: [] });
    }
    groups[idx.get(key)!].items.push(it);
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.category}>
          <h3 className="mb-2 text-sm font-semibold text-text-primary">
            {g.category}
          </h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {g.items.map((a) => (
              <li
                key={a.slug}
                className="flex items-center gap-2 text-sm text-text-secondary"
              >
                <Check
                  className="h-4 w-4 text-primary"
                  strokeWidth={1.75}
                />
                {a.label}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}