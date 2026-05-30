/**
 * CSV export helper — convert array of objects to CSV string.
 *
 * Format: Excel-friendly với BOM UTF-8 + comma separator.
 * Strings có ',' '"' '\n' tự động escape với double quotes.
 *
 * Usage trong API:
 *   const csv = toCSV(rows, [
 *     { key: "id", label: "ID" },
 *     { key: "username", label: "Tên đăng nhập" },
 *   ]);
 *   return new Response(csv, {
 *     headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="users.csv"` },
 *   });
 */

interface Column<T> {
  key: keyof T | string;
  label: string;
  /** Custom formatter — transform value trước khi serialize. */
  format?: (value: unknown, row: T) => string | number | null | undefined;
}

function escapeField(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // CSV formula injection guard: nếu field bắt đầu bằng = + - @ (hoặc tab/CR) thì
  // Excel/Sheets có thể thực thi như công thức (=HYPERLINK, =cmd...). Prefix dấu
  // nháy đơn để vô hiệu hoá — dữ liệu hiển thị nguyên vẹn nhưng không bị thực thi.
  if (/^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  // Escape khi có comma, quote, newline.
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function toCSV<T>(rows: readonly T[], columns: Column<T>[]): string {
  // BOM UTF-8 — Excel sẽ tự detect encoding đúng cho tiếng Việt
  const BOM = "\uFEFF";
  const header = columns.map((c) => escapeField(c.label)).join(",");
  const dataLines = rows.map((row) =>
    columns
      .map((c) => {
        const raw = (row as Record<string, unknown>)[c.key as string];
        const formatted = c.format ? c.format(raw, row) : raw;
        return escapeField(formatted);
      })
      .join(","),
  );
  return BOM + [header, ...dataLines].join("\n");
}

/** Format ISO date → "DD/MM/YYYY HH:mm" cho Excel-friendly. */
export function formatCSVDate(iso: unknown): string {
  if (!iso) return "";
  const d = iso instanceof Date ? iso : new Date(String(iso));
  if (isNaN(d.getTime())) return String(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Build CSV download response với Content-Disposition. */
export function csvResponse(csvContent: string, filename: string): Response {
  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
