"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info" | "warn";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  /** Optional bold title above message. */
  title?: string;
  /** Optional action button. */
  action?: ToastAction;
  /** ms before auto-dismiss. Default 3500. */
  duration?: number;
}

interface ToastOptions {
  title?: string;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string, opts?: ToastOptions) => number;
  success: (message: string, opts?: ToastOptions) => number;
  error: (message: string, opts?: ToastOptions) => number;
  info: (message: string, opts?: ToastOptions) => number;
  warn: (message: string, opts?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

/** ToastProvider — đặt 1 lần ở layout, rồi dùng `useToast()` ở mọi component con. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string, opts?: ToastOptions): number => {
    const id = ++counter;
    setItems((prev) => [{ id, kind, message, title: opts?.title, action: opts?.action, duration: opts?.duration }, ...prev]);
    return id;
  }, []);

  const value: ToastContextValue = {
    push,
    success: (m, o) => push("success", m, o),
    error: (m, o) => push("error", m, o),
    info: (m, o) => push("info", m, o),
    warn: (m, o) => push("warn", m, o),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none"
        style={{
          paddingTop: "env(safe-area-inset-top, 0)",
          paddingRight: "max(1rem, env(safe-area-inset-right, 1rem))",
          paddingLeft: "max(1rem, env(safe-area-inset-left, 1rem))",
        }}
        aria-live="polite"
        aria-atomic="false"
      >
        {items.slice(0, 5).map((t) => (
          <Toast
            key={t.id}
            item={t}
            onDismiss={() => dismiss(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const KIND_THEME: Record<ToastKind, {
  bar: string;     // progress bar gradient
  iconBg: string;  // icon container bg
  iconColor: string;
  bg: string;
  border: string;
  text: string;
}> = {
  success: {
    bar: "from-emerald-400 to-emerald-500",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
    iconColor: "text-emerald-600 dark:text-emerald-300",
    bg: "bg-white dark:bg-zinc-900",
    border: "border-emerald-200/70 dark:border-emerald-500/30",
    text: "text-gray-800 dark:text-zinc-100",
  },
  error: {
    bar: "from-rose-400 to-rose-500",
    iconBg: "bg-rose-100 dark:bg-rose-500/20",
    iconColor: "text-rose-600 dark:text-rose-300",
    bg: "bg-white dark:bg-zinc-900",
    border: "border-rose-200/70 dark:border-rose-500/30",
    text: "text-gray-800 dark:text-zinc-100",
  },
  warn: {
    bar: "from-amber-400 to-amber-500",
    iconBg: "bg-amber-100 dark:bg-amber-500/20",
    iconColor: "text-amber-600 dark:text-amber-300",
    bg: "bg-white dark:bg-zinc-900",
    border: "border-amber-200/70 dark:border-amber-500/30",
    text: "text-gray-800 dark:text-zinc-100",
  },
  info: {
    bar: "from-orange-400 to-amber-500",
    iconBg: "bg-orange-100 dark:bg-orange-500/20",
    iconColor: "text-orange-600 dark:text-orange-300",
    bg: "bg-white dark:bg-zinc-900",
    border: "border-orange-200/70 dark:border-orange-500/30",
    text: "text-gray-800 dark:text-zinc-100",
  },
};

function ToastIcon({ kind, className = "" }: { kind: ToastKind; className?: string }) {
  // SVG icons — Heroicons-like.
  const props = { className: `w-5 h-5 ${className}`, fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "success":
      return <svg viewBox="0 0 24 24" {...props}><polyline points="20 6 9 17 4 12" /></svg>;
    case "error":
      return <svg viewBox="0 0 24 24" {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
    case "warn":
      return <svg viewBox="0 0 24 24" {...props}><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>;
    case "info":
      return <svg viewBox="0 0 24 24" {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
  }
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const theme = KIND_THEME[item.kind];
  const duration = item.duration ?? 4000;
  const [show, setShow] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const remainingRef = useRef(duration);
  const lastTickRef = useRef(0);
  const dismissedRef = useRef(false);

  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setShow(false);
    window.setTimeout(onDismiss, 200);
  }, [onDismiss]);

  // Mount animation + init last tick.
  useEffect(() => {
    lastTickRef.current = performance.now();
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Progress timer + auto-dismiss
  useEffect(() => {
    let raf = 0;
    const loop = (now: number) => {
      const dt = now - lastTickRef.current;
      lastTickRef.current = now;
      if (!paused && !dismissedRef.current) {
        remainingRef.current = Math.max(0, remainingRef.current - dt);
        const pct = (remainingRef.current / duration) * 100;
        setProgress(pct);
        if (remainingRef.current <= 0) {
          handleDismiss();
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paused, duration, handleDismiss]);

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-xl border ${theme.bg} ${theme.border} ${theme.text} shadow-lg shadow-black/5 dark:shadow-black/30 backdrop-blur-md transition-all duration-200 ${
        show ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
      }`}
    >
      <div className="flex items-start gap-3 p-3 pr-2">
        {/* Icon circle */}
        <div className={`shrink-0 w-9 h-9 rounded-full ${theme.iconBg} flex items-center justify-center`}>
          <ToastIcon kind={item.kind} className={theme.iconColor} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {item.title && (
            <p className="text-sm font-bold leading-snug mb-0.5">{item.title}</p>
          )}
          <p className="text-sm leading-snug whitespace-pre-wrap break-words">
            {item.message}
          </p>
          {item.action && (
            <button
              type="button"
              onClick={() => { item.action!.onClick(); handleDismiss(); }}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
            >
              {item.action.label}
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>

        {/* Dismiss X button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Đóng"
          className="shrink-0 w-6 h-6 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Progress bar bottom */}
      <div className="absolute bottom-0 inset-x-0 h-0.5 bg-gray-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${theme.bar} transition-[width] duration-100 linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/** Hook tiện dụng — gọi `useToast().success("Đã lưu")`. Phải nằm trong ToastProvider. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback an toàn — nếu lỡ dùng ngoài Provider thì no-op thay vì crash.
    // Chỉ log warning 1 lần ở dev để dev biết đã quên wrap Provider; production im lặng.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Toast] useToast() được gọi ngoài <ToastProvider> — toast sẽ không hiển thị.");
    }
    const noop = (id: number) => id;
    return {
      push: () => 0,
      success: () => 0,
      error: () => 0,
      info: () => 0,
      warn: () => 0,
      dismiss: noop,
    };
  }
  return ctx;
}
