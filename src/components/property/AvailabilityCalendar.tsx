import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Props {
  blockedSet: Set<string>;
}

function toKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function AvailabilityCalendar({ blockedSet }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isBlocked = (d: Date) => blockedSet.has(toKey(d));
  const isPast = (d: Date) => d < today;
  const isAvailable = (d: Date) => !isPast(d) && !isBlocked(d);

  return (
    <div className="rounded-[14px] border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">
        Disponibilidade
      </h3>
      <Calendar
        mode="single"
        numberOfMonths={2}
        defaultMonth={today}
        disabled={() => true}
        modifiers={{
          blocked: isBlocked,
          past: isPast,
          available: isAvailable,
        }}
        modifiersClassNames={{
          blocked:
            "bg-[#F8D7DA] text-[#6B1F1F] line-through rounded-md",
          available: "bg-[#D4EDDA] text-[#1A5C2A] rounded-md",
          past: "bg-[#F5F4F1] text-text-muted rounded-md",
        }}
        className={cn("p-0 pointer-events-auto")}
      />
      <div className="mt-4 flex items-center gap-4 text-xs text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#D4EDDA]" />
          Disponível
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#F8D7DA]" />
          Indisponível
        </span>
      </div>
    </div>
  );
}