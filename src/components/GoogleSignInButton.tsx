"use client";

import { useEffect, useState } from "react";

/**
 * Nút "Tiếp tục với Google" — redirect tới /api/auth/google/start.
 *
 * Tự ẩn nếu Google chưa được config (env GOOGLE_CLIENT_ID rỗng).
 *
 * Props:
 * - mode: "login" | "register" — đổi label cho phù hợp ngữ cảnh
 * - next: path redirect sau login (default /dashboard)
 * - ref: username người giới thiệu (cho user đến từ link giới thiệu)
 */
export function GoogleSignInButton({
  mode = "login",
  next = "/dashboard",
  refUsername,
}: {
  mode?: "login" | "register";
  next?: string;
  refUsername?: string;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/providers", { cache: "force-cache" })
      .then((r) => r.json())
      .then((d) => setEnabled(!!d?.google))
      .catch(() => setEnabled(false));
  }, []);

  // Đang check → ẩn để tránh flash button rồi mất
  if (enabled === null) {
    return (
      <div className="w-full h-11 rounded-lg bg-gray-50 dark:bg-zinc-800/40 animate-pulse" />
    );
  }
  if (!enabled) return null;

  const handleClick = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (next) params.set("next", next);
    if (refUsername) params.set("ref", refUsername);
    window.location.href = `/api/auth/google/start?${params}`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="group w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-zinc-100 hover:border-orange-300 hover:shadow-md hover:shadow-orange-500/10 dark:hover:border-orange-500/40 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
      aria-label={mode === "register" ? "Đăng ký với Google" : "Đăng nhập với Google"}
    >
      <GoogleIcon />
      <span>
        {loading
          ? "Đang chuyển đến Google..."
          : mode === "register"
          ? "Đăng ký nhanh với Google"
          : "Tiếp tục với Google"}
      </span>
    </button>
  );
}

/** Logo Google chính thức màu — SVG inline để khỏi tải thêm asset. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

/** Divider "hoặc" giữa Google và form email — dùng kèm ngay phía dưới Google button. */
export function AuthDivider({ label = "hoặc" }: { label?: string }) {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-200 dark:border-zinc-700" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-white dark:bg-zinc-900 px-3 text-[11px] uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-semibold">
          {label}
        </span>
      </div>
    </div>
  );
}
