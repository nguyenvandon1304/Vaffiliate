"use client";

import { useState } from "react";
import { SmartphoneIcon } from "@/components/icons";

export function InstallPrompt() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 sm:p-6">
      <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl shadow-gray-200/80 dark:shadow-black/40 border border-gray-100 dark:border-zinc-800 p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex-shrink-0 w-10 h-10 bg-orange-100 dark:bg-orange-500/15 rounded-xl flex items-center justify-center">
          <SmartphoneIcon className="text-orange-500 w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100 mb-0.5">
            Ứng dụng di động
          </h4>
          <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
            Sắp ra mắt — đăng ký nhận thông báo qua Fanpage
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            aria-disabled="true"
            title="Sắp ra mắt"
            className="bg-orange-200 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 text-xs font-semibold px-4 py-2 rounded-lg cursor-not-allowed select-none"
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
