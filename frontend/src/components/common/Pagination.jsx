import React from "react";

/**
 * Simple page-number pagination bound to DRF's PageNumberPagination shape:
 * { count, total_pages, current_page, next, previous }
 */
export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.total_pages <= 1) return null;

  const pages = [];
  const total = meta.total_pages;
  const current = meta.current_page;
  const window = 1;

  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || (p >= current - window && p <= current + window)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <nav className="d-flex align-items-center justify-content-between mt-3 flex-wrap gap-2">
      <span className="text-muted small">
        {meta.count} total record{meta.count === 1 ? "" : "s"}
      </span>
      <ul className="pagination pagination-sm mb-0">
        <li className={`page-item ${!meta.previous ? "disabled" : ""}`}>
          <button className="page-link" onClick={() => onPageChange(current - 1)} disabled={!meta.previous}>
            Prev
          </button>
        </li>
        {pages.map((p, idx) =>
          p === "…" ? (
            <li key={`ellipsis-${idx}`} className="page-item disabled">
              <span className="page-link">…</span>
            </li>
          ) : (
            <li key={p} className={`page-item ${p === current ? "active" : ""}`}>
              <button className="page-link" onClick={() => onPageChange(p)}>
                {p}
              </button>
            </li>
          )
        )}
        <li className={`page-item ${!meta.next ? "disabled" : ""}`}>
          <button className="page-link" onClick={() => onPageChange(current + 1)} disabled={!meta.next}>
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}
