export function Pagination({
  page,
  totalPages,
  onPage,
  total,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  total?: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      {typeof total === "number" && (
        <span>
          Page {page} of {totalPages}
          {total ? ` · ${total} total` : ""}
        </span>
      )}
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
