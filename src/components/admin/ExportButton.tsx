"use client";

import { useState } from "react";

interface Props {
  /** API endpoint trả CSV (vd. /api/admin/export/users). */
  endpoint: string;
  /** Filename hiển thị trên download (optional, server cũng có thể set qua Content-Disposition). */
  filename?: string;
  /** Label trên button. */
  label?: string;
  /** Variant: "primary" (cam đầy) / "outline" (viền cam). */
  variant?: "primary" | "outline";
  /** Optional query string (?from=...&to=...). */
  query?: string;
}

/**
 * Export CSV button — fetch endpoint + trigger download.
 * Show loading state khi đang fetch, error toast nếu fail.
 */
export function ExportButton({
  endpoint,
  filename,
  label = "Xuất CSV",
  variant = "outline",
  query,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = query ? `${endpoint}?${query}` : endpoint;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        setError(`Lỗi ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      // Lấy filename từ Content-Disposition nếu có, fallback prop
      const cd = res.headers.get("Content-Disposition") || "";
      const match = /filename="([^"]+)"/i.exec(cd);
      a.download = match?.[1] || filename || "export.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải file");
    } finally {
      setLoading(false);
    }
  };

  const baseClass = "inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50";
  const variantClass = variant === "primary"
    ? "bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
    : "border border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 text-orange-700 dark:text-orange-300";

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className={`${baseClass} ${variantClass}`}
        title="Tải về file CSV (UTF-8, mở được bằng Excel)"
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        )}
        {loading ? "Đang xuất..." : label}
      </button>
      {error && <span className="text-[10px] text-red-500 mt-0.5">{error}</span>}
    </div>
  );
}
