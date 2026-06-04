"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CaffiliateLogo } from "@/components/icons";
import { DashboardNavIcons } from "@/components/DashboardNavIcons";
import { StreakBadge } from "@/components/StreakBadge";
import { CommandBarTrigger } from "@/components/CommandBar";
import { TierPill, useTierInfo } from "@/components/TierDisplay";
import { ThemeToggleButton } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";

interface HeaderUser {
  username: string;
  email: string;
  display_name: string | null;
}

/**
 * Header đầy đủ dùng chung cho các sub-page dashboard (`/dashboard/cashback`,
 * `/dashboard/help`, `/dashboard/referral`...). Mục tiêu: header các trang con
 * GIỐNG HỆT trang chính `/dashboard` để user không bị "nhảy" giao diện —
 * có streak, command bar, tier pill, theme toggle, chuông thông báo, avatar/tên.
 *
 * Component tự fetch user + tier (self-contained) nên trang con chỉ cần render
 * <DashboardHeader /> mà không phải truyền props.
 */
export function DashboardHeader() {
  const router = useRouter();
  const { info: tierInfo } = useTierInfo();

  const [user, setUser] = useState<HeaderUser | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user info (tên + email cho avatar/dropdown).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d?.success && d.user) setUser(d.user); })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, []);

  // Đóng dropdown khi click ra ngoài.
  useEffect(() => {
    if (!showDropdown) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showDropdown]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const initial = (user?.display_name || user?.username || "U").charAt(0).toUpperCase();

  return (
    <header
      className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-30"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => router.push("/dashboard")}
            className="cursor-pointer shrink-0"
            title="Về trang chủ"
          >
            <CaffiliateLogo />
          </button>
          <div className="h-6 w-px bg-gray-200 dark:bg-zinc-700 shrink-0 hidden sm:block" />
          {/* Nav icons — hiện trên tablet trở lên, mobile có bottom nav */}
          <div className="hidden sm:block shrink-0">
            <DashboardNavIcons />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          {/* Streak badge — chỉ hiện khi user có streak đang chạy */}
          <StreakBadge />
          {/* Command bar trigger — dispatch Ctrl+K cho hook ở DashboardShell bắt */}
          <CommandBarTrigger
            onClick={() => {
              const evt = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true });
              window.dispatchEvent(evt);
            }}
          />
          {/* Tier pill — click để về dashboard xem chi tiết hạng */}
          <div className="hidden sm:block">
            <TierPill
              info={tierInfo}
              onClick={() => router.push("/dashboard")}
            />
          </div>
          <ThemeToggleButton />
          <NotificationBell />

          {/* User dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown((v) => !v)}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="hidden sm:block text-sm text-gray-600 dark:text-zinc-300 font-medium">
                {user?.display_name || user?.username || "..."}
              </span>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-orange-500/30">
                {initial}
              </div>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-100 dark:border-zinc-800 py-3 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-3 px-4 pb-3 border-b border-gray-100 dark:border-zinc-800">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-orange-500/30 shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-zinc-100 truncate">{user?.display_name || user?.username}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">{user?.email}</p>
                  </div>
                </div>

                <div className="pt-2 px-2 space-y-0.5">
                  <button
                    onClick={() => { setShowDropdown(false); router.push("/dashboard?view=profile"); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Hồ sơ
                  </button>
                  <button
                    onClick={() => { setShowDropdown(false); router.push("/dashboard?view=bank"); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" x2="23" y1="10" y2="10" />
                    </svg>
                    Tài chính
                  </button>
                  <button
                    onClick={() => { setShowDropdown(false); router.push("/dashboard/security"); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    Bảo mật
                  </button>
                  <div className="border-t border-gray-100 dark:border-zinc-800 my-1" />
                  <button
                    onClick={() => { setShowDropdown(false); handleLogout(); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-400 dark:text-zinc-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" x2="9" y1="12" y2="12" />
                    </svg>
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
