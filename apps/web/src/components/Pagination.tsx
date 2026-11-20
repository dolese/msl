export function Pagination({ page, pageSize, total, noun, onPage }: {
  page: number; pageSize: number; total: number; noun: string; onPage: (p: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="pagination">
      <span className="muted small">{from}–{to} of {total} {noun}</span>
      <div className="row gap-sm">
        <button className="btn-icon" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">◀</button>
        <button className="btn-icon" disabled={to >= total} onClick={() => onPage(page + 1)} aria-label="Next page">▶</button>
      </div>
    </div>
  );
}
