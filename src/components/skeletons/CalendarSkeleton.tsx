export function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className={i === 1 ? "hidden md:block" : ""}
          style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        >
          <div className="mb-3 h-5 w-32 animate-pulse rounded bg-[#E2E1DD]" />
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 42 }).map((_, k) => (
              <div key={k} className="aspect-square w-full animate-pulse rounded bg-[#E2E1DD]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default CalendarSkeleton;