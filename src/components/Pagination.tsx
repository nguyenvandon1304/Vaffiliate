"use client";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/**
 * Pagination compact: « 1 … 4 5 6 … 12 ». Render tối đa 7 nút trang
 * cộng prev/next. Tự ẩn khi total ≤ pageSize.
 */
export function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const pages = pageRange(page, totalPages);

  return (
    <div className="flex items-center justify-between gap-2 mt-4 text-sm">
      <span className="text-gray-500 dark:text-gray-400">
        Trang <b className="text-gray-700 dark:text-gray-200">{page}</b> / {totalPages}
        <span className="hidden sm:inline"> · {total.toLocaleString("vi-VN")} kết quả</span>
      </span>
      <div className="flex items-center gap-1">
        <NavBtn disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹</NavBtn>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-2 text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-8 h-8 px-2 rounded-md font-medium transition-colors ${
                p === page
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <NavBtn disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>›</NavBtn>
      </div>
    </div>
  );
}

function NavBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="min-w-8 h-8 px-2 rounded-md font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}

function pageRange(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) out.push("…");
  for (let p = left; p <= right; p++) out.push(p);
  if (right < total - 1) out.push("…");
  out.push(total);
  return out;
}
