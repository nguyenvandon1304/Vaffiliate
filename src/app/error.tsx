"use client";

import Link from "next/link";
import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global error boundary cho Next.js App Router. Catch mọi lỗi server/client
 * không được handle, hiển thị trang fallback đẹp + nút reset.
 *
 * Chỉ log digest (server-side ID), không leak stacktrace cho user.
 */
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[GlobalError]", error.message, error.digest);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-red-50 via-orange-50 to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-zinc-100 mb-2">
          Đã xảy ra sự cố
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-2 leading-relaxed">
          Hệ thống đang gặp một lỗi không mong muốn. Vui lòng thử lại sau ít phút.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 dark:text-zinc-500 font-mono mb-6">
            Mã sự cố: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            Thử lại
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}
