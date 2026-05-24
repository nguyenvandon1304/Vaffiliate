"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
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

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: Date.now() + i,
    angle: Math.random() * 360,
    distance: 30 + Math.random() * 40,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 100,
  }));
}

/** Hook quản lý animation toggle. */
function useToggleAnimation() {
  const [isDark, setIsDark] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Init dark state từ DOM (đã được set bởi /theme-init.js trước hydrate)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time DOM read after hydrate
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    if (animating) return;
    const nextIsDark = !document.documentElement.classList.contains("dark");
    const next: "light" | "dark" = nextIsDark ? "dark" : "light";
    applyTheme(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    setIsDark(nextIsDark);
    setAnimating(true);
    setParticles(makeParticles(12));
    // Tắt animation sau 700ms — match CSS transition-duration
    window.setTimeout(() => {
      setAnimating(false);
      setParticles([]);
    }, 700);
  };

  return { isDark, animating, particles, toggle };
}

/**
 * Inline icon: mặt trời / mặt trăng quay khi đổi theme + particle effect.
 */
function ThemeIcon({ isDark, animating }: { isDark: boolean; animating: boolean }) {
  return (
    <span
      className="relative inline-flex items-center justify-center w-5 h-5"
      aria-hidden
    >
      {/* Sun icon — hiện khi dark mode (để chuyển về light) */}
      <svg
        viewBox="0 0 24 24"
        className={`absolute inset-0 w-5 h-5 transition-all duration-500 ease-out ${
          isDark
            ? "opacity-100 rotate-0 scale-100 text-amber-300"
            : "opacity-0 -rotate-90 scale-50 text-amber-300"
        } ${animating ? "drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]" : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      {/* Moon icon — hiện khi light mode (để chuyển sang dark) */}
      <svg
        viewBox="0 0 24 24"
        className={`absolute inset-0 w-5 h-5 transition-all duration-500 ease-out ${
          isDark
            ? "opacity-0 rotate-90 scale-50 text-indigo-500"
            : "opacity-100 rotate-0 scale-100 text-indigo-500"
        } ${animating ? "drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]" : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </span>
  );
}

/** Particle burst — sparkle effect khi đổi theme. */
function ParticleBurst({ particles, isDark }: { particles: Particle[]; isDark: boolean }) {
  if (particles.length === 0) return null;
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {particles.map((p) => {
        const x = Math.cos((p.angle * Math.PI) / 180) * p.distance;
        const y = Math.sin((p.angle * Math.PI) / 180) * p.distance;
        return (
          <span
            key={p.id}
            className={`absolute rounded-full animate-theme-particle ${
              isDark ? "bg-amber-300" : "bg-indigo-400"
            }`}
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: "50%",
              top: "50%",
              animationDelay: `${p.delay}ms`,
              // CSS variable cho keyframe đọc
              ["--tx" as string]: `${x}px`,
              ["--ty" as string]: `${y}px`,
            } as React.CSSProperties}
          />
        );
      })}
    </span>
  );
}

/**
 * Nút toggle theme inline — chỉ hiện ở mobile (≤ md), đặt cạnh chuông trong header.
 * Trên desktop ẩn để dùng `ThemeToggle` floating top-right như cũ.
 */
export function ThemeToggleButton({ className = "" }: { className?: string }) {
  useSystemThemeSync();
  const { isDark, animating, particles, toggle } = useToggleAnimation();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Chuyển chế độ sáng / tối"
      title={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      className={`md:hidden relative w-9 h-9 rounded-full overflow-visible flex items-center justify-center transition-all duration-300 ${
        animating
          ? "scale-110 bg-gradient-to-br from-amber-100 to-indigo-100 dark:from-indigo-900/50 dark:to-amber-900/50"
          : "hover:bg-gray-100 dark:hover:bg-zinc-800"
      } ${className}`}
    >
      <ThemeIcon isDark={isDark} animating={animating} />
      <ParticleBurst particles={particles} isDark={isDark} />
    </button>
  );
}

/**
 * Floating toggle góc trên-phải. Trên mobile (≤ md) ẩn để dùng inline button trong
 * header thay thế (tránh trùng + tránh che nội dung). Trên desktop hiện như cũ.
 */
export function ThemeToggle() {
  useSystemThemeSync();
  const { isDark, animating, particles, toggle } = useToggleAnimation();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Chuyển chế độ sáng / tối"
      title={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      className={`hidden md:inline-flex fixed top-4 right-4 sm:top-6 sm:right-6 z-50 h-10 w-10 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-md backdrop-blur transition-all duration-300 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        animating ? "scale-110 shadow-lg" : ""
      }`}
    >
      <ThemeIcon isDark={isDark} animating={animating} />
      <ParticleBurst particles={particles} isDark={isDark} />
    </button>
  );
}
