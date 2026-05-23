"use client";

import { useState } from "react";

export default function ChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-2"
         style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {/* Popup chọn người liên hệ */}
      {open && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-200 dark:border-zinc-800 p-3 w-64 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <p className="text-xs text-gray-400 dark:text-zinc-500 font-semibold uppercase tracking-wider mb-2 px-1">Liên hệ hỗ trợ</p>
          <a
            href="https://m.me/DonXeOm"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor"><path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.907 1.432 5.503 3.667 7.2V22l3.406-1.87c.908.252 1.87.388 2.927.388 5.523 0 10-4.145 10-9.243S17.523 2 12 2zm1.105 12.459l-2.547-2.716-4.97 2.716 5.467-5.8 2.61 2.716 4.907-2.716-5.467 5.8z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">Nguyễn Văn Đôn</p>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500">Hỗ trợ chung</p>
            </div>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-300 dark:text-zinc-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </a>
          <a
            href="https://m.me/HNQ.QuyDubai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor"><path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.907 1.432 5.503 3.667 7.2V22l3.406-1.87c.908.252 1.87.388 2.927.388 5.523 0 10-4.145 10-9.243S17.523 2 12 2zm1.105 12.459l-2.547-2.716-4.97 2.716 5.467-5.8 2.61 2.716 4.907-2.716-5.467 5.8z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-100">Huỳnh Ngọc Quý</p>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500">Tư vấn đối tác</p>
            </div>
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-300 dark:text-zinc-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </a>
        </div>
      )}

      {/* Nút chat */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          open
            ? "bg-gray-600 hover:bg-gray-700 rotate-45"
            : "bg-orange-500 hover:bg-orange-600"
        }`}
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        )}
      </button>
    </div>
  );
}
