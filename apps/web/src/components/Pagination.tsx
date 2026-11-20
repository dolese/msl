import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, pageSize, total, noun, onPage }: {
  page: number; pageSize: number; total: number; noun: string; onPage: (p: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="pagination">
      <span>Showing <strong>{from}–{to}</strong> of <strong>{total.toLocaleString()}</strong> {noun}</span>
      <div className="pager">
        <button className="icon-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
        <button className="icon-btn" disabled={to >= total} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
      </div>
    </div>
  );
}
