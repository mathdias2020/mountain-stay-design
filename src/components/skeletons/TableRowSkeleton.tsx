export function TableRowSkeleton({
  rows = 5,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <div className="h-4 w-full animate-pulse rounded bg-[#E2E1DD]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default TableRowSkeleton;