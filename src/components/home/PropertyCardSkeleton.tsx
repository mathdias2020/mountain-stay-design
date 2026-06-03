export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-surface">
      <div className="aspect-[4/3] w-full animate-pulse bg-[#E2E1DD]" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-[#E2E1DD]" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-[#E2E1DD]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[#E2E1DD]" />
        <div className="h-9 w-full animate-pulse rounded bg-[#E2E1DD]" />
      </div>
    </div>
  );
}

export default PropertyCardSkeleton;