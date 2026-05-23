"use client";

import { useEffect } from "react";
import { MoonIcon, SunIcon } from "@/components/icons";

const STORAGE_KEY = "theme";

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  const next: "light" | "dark" = isDark ? "light" : "dark";
  applyTheme(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // localStorage có thể bị chặn, bỏ qua
  }
}

/** Theo dõi system theme — chỉ áp khi user chưa chọn thủ công. */
function useSystemThemeSync() {
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
      applyTheme(event.matches ? "dark" : "light");
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
}

/**
 * Nút toggle theme inline — chỉ hiện ở mobile (≤ md), đặt cạnh chuông trong header.
 * Trên desktop ẩn để dùng `ThemeToggle` floating top-right như cũ.
 */
export function ThemeToggleButton({ className = "" }: { className?: string }) {
  useSystemThemeSync();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Chuyển chế độ sáng / tối"
      title="Chuyển chế độ sáng / tối"
      className={`md:hidden relative w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors ${className}`}
    >
      <MoonIcon className="block h-5 w-5 text-gray-500 dark:text-zinc-400 dark:hidden" />
      <SunIcon className="hidden h-5 w-5 text-gray-500 dark:text-zinc-400 dark:block" />
    </button>
  );
}

/**
 * Floating toggle góc trên-phải. Trên mobile (≤ md) ẩn để dùng inline button trong
 * header thay thế (tránh trùng + tránh che nội dung). Trên desktop hiện như cũ.
 */
export function ThemeToggle() {
  useSystemThemeSync();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Chuyển chế độ sáng / tối"
      title="Chuyển chế độ sáng / tối"
      className="hidden md:inline-flex fixed top-4 right-4 sm:top-6 sm:right-6 z-50 h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-md backdrop-blur transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <MoonIcon className="block h-5 w-5 dark:hidden" />
      <SunIcon className="hidden h-5 w-5 dark:block" />
    </button>
  );
}
