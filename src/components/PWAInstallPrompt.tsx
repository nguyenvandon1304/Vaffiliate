"use client";

import { useEffect, useState } from "react";

/**
 * PWA install prompt — hiện banner ở dưới màn hình mobile mời user "Cài
 * V-Affiliate vào Home Screen". Tự handle 2 case:
 *
 * 1. Android Chrome / Edge: lắng `beforeinstallprompt` event → bấm "Cài ngay"
 *    sẽ mở native install dialog của browser.
 * 2. iOS Safari: không có event này, hiện hướng dẫn manual "Bấm Share → Add to
 *    Home Screen".
 *
 * Logic ẩn:
 * - Đã cài rồi (display-mode: standalone) → không hiện
 * - User đã từ chối → ẩn 30 ngày qua localStorage timestamp
 * - User đã cài → ẩn vĩnh viễn
 */

const DISMISS_KEY = "pwa_install_dismissed_at";
const INSTALLED_KEY = "pwa_installed";
const DISMISS_DAYS = 30;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari uses navigator.standalone
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !("MSStream" in window);
}

function wasDismissedRecently(): boolean {
  try {
    const ts = window.localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    const days = (Date.now() - Number(ts)) / (1000 * 60 * 60 * 24);
    return days < DISMISS_DAYS;
  } catch { return false; }
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // Đã cài rồi → bỏ qua
    if (isStandalone()) {
      try { window.localStorage.setItem(INSTALLED_KEY, "1"); } catch { /* ignore */ }
      return;
    }
    // User đã cài trước đây
    try {
      if (window.localStorage.getItem(INSTALLED_KEY)) return;
    } catch { /* ignore */ }
    // User đã dismiss gần đây → ẩn
    if (wasDismissedRecently()) return;

    // iOS không trigger beforeinstallprompt → hiện manual help banner sau 5s
    if (isIOS()) {
      const id = window.setTimeout(() => setShowIosHelp(true), 5000);
      return () => window.clearTimeout(id);
    }

    // Android / Desktop Chrome: nghe sự kiện
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    const onInstalled = () => {
      try { window.localStorage.setItem(INSTALLED_KEY, "1"); } catch { /* ignore */ }
      setShowBanner(false);
      setShowIosHelp(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        try { window.localStorage.setItem(INSTALLED_KEY, "1"); } catch { /* ignore */ }
      } else {
        try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setClosing(true);
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    window.setTimeout(() => {
      setShowBanner(false);
      setShowIosHelp(false);
    }, 200);
  };

  // Chrome / Android prompt
  if (showBanner && deferredPrompt) {
    return (
      <div
        className={`fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[90] transition-all duration-300 ${
          closing ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4 flex items-center gap-3">
          <div className="text-3xl shrink-0">📲</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white">Cài V-Affiliate vào Home Screen</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Mở app nhanh, không cần qua trình duyệt
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDismiss}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2"
            >
              Để sau
            </button>
            <button
              onClick={handleInstall}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
              Cài ngay
            </button>
          </div>
        </div>
      </div>
    );
  }

  // iOS hướng dẫn manual
  if (showIosHelp) {
    return (
      <div
        className={`fixed bottom-20 left-4 right-4 z-[90] transition-all duration-300 ${
          closing ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-3xl shrink-0">📲</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Cài V-Affiliate vào màn hình chính</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
                Bấm nút <span className="inline-flex items-center mx-0.5 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-mono text-[11px]">
                  <svg className="w-3 h-3 mr-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  Share
                </span> ở thanh dưới Safari → chọn <strong>&quot;Add to Home Screen&quot;</strong>.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none px-1 shrink-0"
              aria-label="Đóng"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
