"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ToastKind = "success" | "error" | "info" | "warn";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  push: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let counter = 0;

/**
 * ToastProvider — đặt 1 lần ở layout, rồi dùng `useToast()` ở mọi component con.
 * Auto-dismiss sau 3.5s. Click vào để dismiss sớm.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++counter;
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 3500);
  }, []);

  const value: ToastContextValue = {
    push,
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
    warn: (m) => push("warn", m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {items.map((t) => (
          <Toast
            key={t.id}
            item={t}
            onDismiss={() => setItems((prev) => prev.filter((i) => i.id !== t.id))}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  // Animate enter (opacity + translate). Mount với class "opacity-0 translate-x-2",
  // sau 1 frame chuyển về visible.
  const [show, setShow] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setShow(true)); return () => cancelAnimationFrame(t); }, []);

  const kindClasses: Record<ToastKind, string> = {
    success: "bg-green-50 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200",
    error: "bg-red-50 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200",
    info: "bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200",
    warn: "bg-amber-50 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200",
  };
  const icon: Record<ToastKind, string> = { success: "✓", error: "✕", info: "ℹ", warn: "⚠" };

  return (
    <button
      type="button"
      onClick={onDismiss}
      className={`text-left text-sm border rounded-lg px-3 py-2 shadow-lg backdrop-blur transition-all duration-200 cursor-pointer hover:shadow-xl ${kindClasses[item.kind]} ${show ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"}`}
    >
      <span className="font-bold mr-1.5">{icon[item.kind]}</span>
      <span className="whitespace-pre-wrap break-words">{item.message}</span>
    </button>
  );
}

/** Hook tiện dụng — gọi `useToast().success("Đã lưu")`. Phải nằm trong ToastProvider. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback an toàn — nếu chưa có provider thì log ra console thay vì crash.
    return {
      push: (_, m) => console.log("[toast]", m),
      success: (m) => console.log("[toast.success]", m),
      error: (m) => console.error("[toast.error]", m),
      info: (m) => console.log("[toast.info]", m),
      warn: (m) => console.warn("[toast.warn]", m),
    };
  }
  return ctx;
}
