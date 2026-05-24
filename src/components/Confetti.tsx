"use client";

import { useEffect, useState } from "react";

/**
 * Confetti burst overlay — full-screen, fixed, pointer-events-none.
 * Tự cleanup sau 2.5s.
 *
 * Usage:
 *   const [show, setShow] = useState(false);
 *   ...
 *   {show && <Confetti onDone={() => setShow(false)} />}
 *
 * Hoặc trigger 1 lần qua hook `useConfetti()`:
 *   const { fire, ConfettiPortal } = useConfetti();
 *   <button onClick={fire}>Click</button>
 *   <ConfettiPortal />
 */
interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rot: number;
  size: number;
  color: string;
  delay: number;
  shape: "circle" | "square" | "rect";
}

const COLORS = [
  "#f97316", // orange
  "#fbbf24", // amber
  "#22c55e", // green
  "#3b82f6", // blue
  "#a855f7", // purple
  "#ec4899", // pink
  "#ef4444", // red
];

function makePieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 250;
    return {
      id: Date.now() * 1000 + i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - 50, // bias lên trên một chút
      rot: 360 + Math.random() * 720,
      size: 6 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 200,
      shape: (["circle", "square", "rect"] as const)[Math.floor(Math.random() * 3)],
    };
  });
}

export function Confetti({ count = 80, onDone }: { count?: number; onDone?: () => void }) {
  const [pieces] = useState(() => makePieces(count));

  useEffect(() => {
    const id = window.setTimeout(() => { onDone?.(); }, 2500);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden" aria-hidden>
      <div className="absolute left-1/2 top-1/2">
        {pieces.map((p) => {
          const radius = p.shape === "circle" ? "9999px" : p.shape === "rect" ? "1px" : "2px";
          const w = p.shape === "rect" ? p.size * 0.4 : p.size;
          const h = p.size;
          return (
            <span
              key={p.id}
              className="confetti-piece absolute"
              style={{
                width: `${w}px`,
                height: `${h}px`,
                backgroundColor: p.color,
                borderRadius: radius,
                left: 0,
                top: 0,
                animationDelay: `${p.delay}ms`,
                ["--confetti-x" as string]: `${p.x}px`,
                ["--confetti-y" as string]: `${p.y}px`,
                ["--confetti-rot" as string]: `${p.rot}deg`,
              } as React.CSSProperties}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Hook: trả về `fire()` function + `confettiNode` để render.
 * Bật confetti programmatically từ bất kỳ event handler nào.
 *
 * Usage:
 *   const { fire, confettiNode } = useConfetti();
 *   <button onClick={fire}>Click</button>
 *   {confettiNode}
 */
export function useConfetti() {
  const [active, setActive] = useState(false);

  const fire = () => setActive(true);

  const confettiNode = active ? <Confetti onDone={() => setActive(false)} /> : null;

  return { fire, confettiNode };
}
