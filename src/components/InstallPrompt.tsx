"use client";

import { useState } from "react";
import { SmartphoneIcon } from "@/components/icons";

export function InstallPrompt() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 px-3 sm:px-6 pointer-events-none"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0) + 0.75rem)" }}
    >
      <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl shadow-gray-200/80 dark:shadow-black/40 border border-gray-100 dark:border-zinc-800 p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
        <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 bg-orange-100 dark:bg-orange-500/15 rounded-xl flex items-center justify-center">
          <SmartphoneIcon className="text-orange-500 w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] sm:text-sm font-bold text-gray-900 dark:text-zinc-100 leading-tight">
            Ứng dụng di động
          </h4>
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400 leading-snug truncate">
            Sắp ra mắt — đăng ký qua Fanpage
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <span
            aria-disabled="true"
            title="Sắp ra mắt"
            className="bg-orange-200 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg cursor-not-allowed select-none whitespace-nowrap"
          >
            Coming soon
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-300 hover:text-gray-500 dark:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1"
            aria-label="Đóng"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
