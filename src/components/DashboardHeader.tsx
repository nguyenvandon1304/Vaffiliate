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
import { UserAvatar } from "@/components/UserAvatar";

interface HeaderUser {
  username: string;
  email: string;
  display_name: string | null;
  avatar: string | null;
}

export function DashboardHeader() {
  const router = useRouter();
  const { info: tierInfo } = useTierInfo();

  const [user, setUser] = useState<HeaderUser | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d?.success && d.user) setUser(d.user); })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, []);

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

  return (
    <header
      className="glass-sm sticky top-0 z-30 border-b border-black/5 dark:border-white/10"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
        {/* Left: logo + divider + nav */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/dashboard")}
            className="cursor-pointer shrink-0 transition-transform hover:scale-105 active:scale-95"
            title="Về trang chủ"
          >
            <CaffiliateLogo />
          </button>
          <div className="h-5 w-px bg-black/10 dark:bg-white/10 shrink-0 hidden sm:block" />
          <div className="hidden sm:block shrink-0">
            <DashboardNavIcons />
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <StreakBadge />
          <CommandBarTrigger
            onClick={() => {
              const evt = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true });
              window.dispatchEvent(evt);
            }}
          />
          <div className="hidden sm:block">
            <TierPill
              info={tierInfo}
              onClick={() => router.push("/dashboard")}
            />
          </div>
          <div className="w-px h-4 bg-black/10 dark:bg-white/10 hidden sm:block" />
          <ThemeToggleButton />
          <NotificationBell />

          {/* User avatar / dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown((v) => !v)}
              className="flex items-center gap-2 hover:opacity-80 transition-all duration-200 active:scale-95 rounded-full p-0.5 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <UserAvatar
                avatar={user?.avatar}
                name={user?.display_name || user?.username}
                size={34}
                fontSize={13}
              />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#18181b] rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/50 border border-black/5 dark:border-white/10 py-2 z-50 animate-fade-in-up">
                {/* User info header */}
                <div className="flex items-center gap-3 px-4 pt-1 pb-3 border-b border-black/5 dark:border-white/5">
                  <UserAvatar
                    avatar={user?.avatar}
                    name={user?.display_name || user?.username}
                    size={42}
                    fontSize={16}
                    className="shrink-0 ring-2 ring-orange-500/20"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate">
                      {user?.display_name || user?.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-500 truncate">{user?.email}</p>
                  </div>
                  {/* Online indicator */}
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
                </div>

                {/* Menu items */}
                <div className="pt-2 px-2 space-y-0.5">
                  <button
                    onClick={() => { setShowDropdown(false); router.push("/dashboard?view=profile"); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    </div>
                    Hồ sơ cá nhân
                  </button>
                  <button
                    onClick={() => { setShowDropdown(false); router.push("/dashboard?view=bank"); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" x2="23" y1="10" y2="10" /></svg>
                    </div>
                    Tài chính
                  </button>
                  <button
                    onClick={() => { setShowDropdown(false); router.push("/dashboard/security"); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    </div>
                    Bảo mật
                  </button>

                  <div className="border-t border-black/5 dark:border-white/5 my-1" />

                  <button
                    onClick={() => { setShowDropdown(false); handleLogout(); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-500 dark:text-zinc-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-500/20 transition-colors">
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" x2="9" y1="12" y2="12" />
                      </svg>
                    </div>
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
