"use client";

import { useRef, useCallback, type ReactNode } from "react";

interface Tilt3DProps {
  children: ReactNode;
  className?: string;
  /** Độ nghiêng tối đa (deg). Mặc định 7 — tinh tế, không lòe loẹt. */
  max?: number;
  /** Độ nâng (px) khi hover. */
  lift?: number;
  /** Bật hiệu ứng bóng sáng (glare) chạy theo con trỏ. */
  glare?: boolean;
}

/**
 * Tilt3D — wrapper tạo hiệu ứng thẻ 3D nghiêng theo con trỏ chuột.
 *
 * - Dùng perspective + rotateX/rotateY, biên độ nhỏ (~7°) để "xịn" mà không gắt.
 * - Tôn trọng prefers-reduced-motion: nếu user tắt motion → không nghiêng.
 * - Trên touch (mobile) pointer kiểu "touch" → bỏ qua tilt (tránh giật khi cuộn),
 *   chỉ giữ hiệu ứng nâng nhẹ qua CSS active.
 * - Transform áp trực tiếp qua ref (không setState) → mượt, không re-render.
 */
export function Tilt3D({ children, className = "", max = 7, lift = 6, glare = false }: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (prefersReduced) return;
      // Chỉ tilt với chuột/bút — touch bỏ qua để không nhiễu khi cuộn.
      if (e.pointerType === "touch") return;
      const el = ref.current;
      if (!el) return;
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width; // 0..1
        const py = (e.clientY - rect.top) / rect.height; // 0..1
        const rotX = (0.5 - py) * max * 2;
        const rotY = (px - 0.5) * max * 2;
        el.style.transform = `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-${lift}px)`;
        if (glare && glareRef.current) {
          glareRef.current.style.opacity = "1";
          glareRef.current.style.background = `radial-gradient(circle at ${(px * 100).toFixed(0)}% ${(py * 100).toFixed(0)}%, rgba(255,255,255,0.35), transparent 60%)`;
        }
      });
    },
    [max, lift, glare, prefersReduced],
  );

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0px)";
    if (glare && glareRef.current) glareRef.current.style.opacity = "0";
  }, [glare]);

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`tilt-3d ${className}`}
      style={{ transformStyle: "preserve-3d", willChange: "transform" }}
    >
      {children}
      {glare && (
        <div
          ref={glareRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 mix-blend-overlay"
        />
      )}
    </div>
  );
}
