"use client";

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Dashboard error boundary — catch errors trong /dashboard/* tree.
 * Trải nghiệm tốt hơn page trắng: hiện friendly message + retry.
 */
export default function DashboardError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[DashboardError]", error.message, error.digest);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-orange-50 via-amber-50 to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-4">😅</div>
        <h1 className="text-2xl font-black text-gray-800 dark:text-zinc-100 mb-2">
          Đã xảy ra lỗi nho nhỏ
        </h1>
        <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed mb-6">
          Có lỗi khi tải dashboard. Hệ thống đã ghi nhận và sẽ kiểm tra. Bạn vui lòng thử lại nhé!
        </p>
        {error.digest && (
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono mb-6">
            Mã lỗi: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-orange-500/30 transition-all hover:scale-105"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Thử lại
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-orange-500 dark:text-zinc-300 transition-colors"
          >
            Về dashboard
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </div>
      </div>
    </main>
  );
}
