export function DetailPageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="aspect-[16/9] w-full animate-pulse rounded-[14px] bg-[#E2E1DD]" />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="h-7 w-2/3 animate-pulse rounded bg-[#E2E1DD]" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-[#E2E1DD]" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-[#E2E1DD]" />
          <div className="mt-6 space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-[#E2E1DD]" />
            <div className="h-4 w-full animate-pulse rounded bg-[#E2E1DD]" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-[#E2E1DD]" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-[#E2E1DD]" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-64 w-full animate-pulse rounded-[14px] bg-[#E2E1DD]" />
          <div className="h-72 w-full animate-pulse rounded-[14px] bg-[#E2E1DD]" />
        </div>
      </div>
    </div>
  );
}

export default DetailPageSkeleton;