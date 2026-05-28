"use client";

import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Width preset. Default = "md" (28rem). */
  size?: "sm" | "md" | "lg" | "xl";
  /** Disable click outside to close. Default false. */
  disableBackdropClose?: boolean;
}

/**
 * Modal upgrade — backdrop blur, spring mount animation, larger close button.
 *  - ESC to close
 *  - Click backdrop to close (unless disabled)
 *  - Spring-like scale animation on mount
 *  - Backdrop blur-md (đẹp hơn opacity flat)
 *  - Body scroll lock
 */
export function Modal({ open, onClose, title, children, size = "md", disableBackdropClose = false }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Trigger mount animation in next frame
    const id = requestAnimationFrame(() => setMounted(true));

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(id);
      setMounted(false);
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }[size];

  return (
    <div
      className={`fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-4 pt-12 sm:pt-16 transition-all duration-200 ${
        mounted ? "bg-black/50 backdrop-blur-md opacity-100" : "bg-black/0 backdrop-blur-0 opacity-0"
      }`}
    >
      {/* Backdrop click — đóng modal */}
      <button
        type="button"
        aria-label="Đóng"
        onClick={() => { if (!disableBackdropClose) onClose(); }}
        className="absolute inset-0 cursor-default"
        tabIndex={-1}
      />
      {/* Modal panel */}
      <div
        className={`relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200/70 dark:border-zinc-700 w-full ${sizeClass} transition-all duration-300 ${
          mounted
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-2"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-zinc-800">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-200 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="Đóng"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
