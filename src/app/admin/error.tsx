"use client";

import { useEffect } from "react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Admin error boundary — catch errors trong /admin/* tree.
 */
export default function AdminError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[AdminError]", error.message, error.digest);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-black text-gray-800 dark:text-white mb-2">
          Lỗi admin panel
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
          Có lỗi xảy ra. Kiểm tra log Render hoặc DB connection.
        </p>
        {error.digest && (
          <p className="text-[11px] text-gray-400 font-mono mb-6">
            Mã: {error.digest}
          </p>
        )}
        <p className="text-xs text-red-600 dark:text-red-400 font-mono mb-6 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          {error.message}
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-lg transition-colors"
          >
            🔄 Thử lại
          </button>
          <a
            href="/admin"
            className="text-sm font-semibold text-gray-600 hover:text-orange-500 dark:text-gray-400 transition-colors"
          >
            Về admin
          </a>
        </div>
      </div>
    </main>
  );
}
