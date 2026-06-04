export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-[#E2E1DD]" />
      {Array.from({ length: 4 }).map((_, s) => (
        <div key={s} className="space-y-3 rounded-[14px] bg-white p-6"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div className="h-5 w-40 animate-pulse rounded bg-[#E2E1DD]" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="h-10 w-full animate-pulse rounded bg-[#E2E1DD]" />
            <div className="h-10 w-full animate-pulse rounded bg-[#E2E1DD]" />
            <div className="h-10 w-full animate-pulse rounded bg-[#E2E1DD]" />
            <div className="h-10 w-full animate-pulse rounded bg-[#E2E1DD]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default FormSkeleton;