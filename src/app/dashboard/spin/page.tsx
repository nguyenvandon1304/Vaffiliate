"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CaffiliateLogo } from "@/components/icons";
import { ThemeToggleButton } from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";

interface Segment {
  index: number;
  amount: number;
  label: string;
  color: string;
}

interface Status {
  canSpin: boolean;
  cooldownSeconds: number;
  lastSpinAt: string | null;
  totalSpins: number;
  totalWon: number;
  enabled: boolean;
}

function formatVND(n: number) {
  return (n || 0).toLocaleString("vi-VN") + "đ";
}

function formatCountdown(sec: number): string {
  if (sec <= 0) return "Sẵn sàng quay!";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function SpinPage() {
  const router = useRouter();
  const toast = useToast();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [resultLabel, setResultLabel] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement | null>(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/spin");
        const data = await res.json();
        if (cancelled) return;
        if (!data.success) {
          if (res.status === 401) router.push("/");
          return;
        }
        setSegments(data.segments);
        setStatus(data.status);
        setRemaining(data.status.cooldownSeconds);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  // Countdown ticker — giảm 1s mỗi giây cho đến 0.
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [remaining]);

  const handleSpin = async () => {
    if (spinning || !status?.canSpin) return;
    setSpinning(true);
    setResultLabel(null);

    try {
      const res = await fetch("/api/spin", { method: "POST" });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Không thể quay");
        setSpinning(false);
        return;
      }

      // Animate vòng quay đến đúng segment server đã chọn.
      // Mỗi segment chiếm 360/8 = 45deg. Index 0 đặt ở góc 12h (top).
      // Spin 5 vòng full + dừng ở góc target để có cảm giác quay đẹp.
      const segDeg = 360 / segments.length;
      const target = data.segmentIndex * segDeg;
      // wheel quay theo chiều kim đồng hồ → kim chỉ ngược lại.
      // Tính rotation mới = current + 5 vòng + (- target) — luôn lớn hơn current.
      const fullSpins = 5;
      const newRotation = rotation + fullSpins * 360 + (360 - target);
      setRotation(newRotation);

      // Đợi animation 4s xong mới hiện kết quả.
      setTimeout(() => {
        setResultLabel(data.label);
        if (data.amount > 0) {
          toast.success(`🎉 Trúng ${formatVND(data.amount)}!`);
        } else {
          toast.info(`${data.label}. Hẹn bạn ngày mai!`);
        }
        setSpinning(false);
        // Reload status để cập nhật cooldown
        fetch("/api/spin")
          .then((r) => r.json())
          .then((d) => {
            if (d.success) {
              setStatus(d.status);
              setRemaining(d.status.cooldownSeconds);
            }
          });
      }, 4000);
    } catch {
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
      setSpinning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!status?.enabled) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-gray-50 dark:from-zinc-950 dark:to-black">
        <SpinHeader router={router} />
        <main className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="text-6xl mb-4">🎰</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-zinc-100 mb-2">Vòng quay tạm khoá</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Tính năng đang được bảo trì. Quay lại sau nhé!
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-pink-50/50 to-gray-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-black relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-orange-200/30 blur-3xl dark:bg-orange-900/20" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-pink-200/30 blur-3xl dark:bg-pink-900/20" />
      </div>

      <SpinHeader router={router} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-orange-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
            Vòng Quay May Mắn
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">
            Mỗi ngày 1 lượt quay — bonus cộng thẳng vào ví
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 text-center shadow-sm">
            <div className="text-xs text-gray-500 dark:text-zinc-500 mb-1">Đã quay</div>
            <div className="text-2xl font-bold text-orange-500">{status?.totalSpins ?? 0}</div>
            <div className="text-xs text-gray-400 dark:text-zinc-600">lần</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 text-center shadow-sm">
            <div className="text-xs text-gray-500 dark:text-zinc-500 mb-1">Tổng nhận</div>
            <div className="text-2xl font-bold text-emerald-500">{formatVND(status?.totalWon ?? 0)}</div>
            <div className="text-xs text-gray-400 dark:text-zinc-600">cộng vào ví</div>
          </div>
        </div>

        {/* Wheel */}
        <div className="relative flex justify-center pt-4 pb-2">
          {/* Pointer (mũi tên trỏ xuống) */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
            <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[28px] border-t-red-500 drop-shadow-lg" />
          </div>

          {/* Wheel */}
          <div className="relative w-72 h-72 sm:w-80 sm:h-80">
            <div
              ref={wheelRef}
              className="absolute inset-0 rounded-full shadow-2xl shadow-orange-500/30"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.27, 0.99)" : "none",
              }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <defs>
                  {segments.map((seg) => {
                    const colors = seg.color.split(" ");
                    const fromMatch = colors[0]?.match(/from-(\w+)-(\d+)/);
                    const toMatch = colors[1]?.match(/to-(\w+)-(\d+)/);
                    return (
                      <linearGradient key={`grad-${seg.index}`} id={`grad-${seg.index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={colorTwToHex(fromMatch?.[1], fromMatch?.[2])} />
                        <stop offset="100%" stopColor={colorTwToHex(toMatch?.[1], toMatch?.[2])} />
                      </linearGradient>
                    );
                  })}
                </defs>
                {segments.map((seg) => {
                  const segDeg = 360 / segments.length;
                  const startAngle = seg.index * segDeg - 90 - segDeg / 2; // center 12h
                  const endAngle = startAngle + segDeg;
                  const path = describeSlice(100, 100, 95, startAngle, endAngle);
                  const labelAngle = startAngle + segDeg / 2;
                  const labelX = 100 + Math.cos((labelAngle * Math.PI) / 180) * 60;
                  const labelY = 100 + Math.sin((labelAngle * Math.PI) / 180) * 60;
                  return (
                    <g key={seg.index}>
                      <path d={path} fill={`url(#grad-${seg.index})`} stroke="white" strokeWidth="1.5" />
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill="white"
                        transform={`rotate(${labelAngle + 90}, ${labelX}, ${labelY})`}
                        style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.3)", strokeWidth: 0.5 }}
                      >
                        {seg.label}
                      </text>
                    </g>
                  );
                })}
                <circle cx="100" cy="100" r="12" fill="white" stroke="#fb923c" strokeWidth="3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Spin button */}
        <div className="text-center space-y-2">
          {status?.canSpin ? (
            <button
              onClick={handleSpin}
              disabled={spinning}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 via-pink-500 to-fuchsia-500 hover:from-orange-600 hover:via-pink-600 hover:to-fuchsia-600 text-white font-bold px-10 py-3.5 rounded-full shadow-lg shadow-orange-500/40 transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="text-xl">🎰</span>
              <span>{spinning ? "Đang quay..." : "QUAY NGAY"}</span>
            </button>
          ) : (
            <div className="inline-block bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 px-6 py-3 rounded-full text-sm font-semibold">
              ⏱ Quay tiếp sau: <span className="font-mono text-orange-500">{formatCountdown(remaining)}</span>
            </div>
          )}
          {resultLabel && !spinning && (
            <p className="text-base font-bold text-orange-600 dark:text-orange-400 animate-pulse">
              Kết quả: {resultLabel}
            </p>
          )}
        </div>

        {/* Rules */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-100 mb-3 flex items-center gap-2">
            <span>📜</span> Luật chơi
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>Mỗi tài khoản được quay <strong>1 lần / 24 giờ</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>Tiền thưởng cộng <strong>thẳng vào ví</strong>, có thể rút như cashback</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>Phần thưởng <strong>random</strong> server-side, công bằng cho mọi user</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">•</span>
              <span>Có cơ hội trúng <strong>50.000đ jackpot</strong> với xác suất 5%</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}

function SpinHeader({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-30">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <button onClick={() => router.push("/dashboard")} className="cursor-pointer" title="Về trang chủ">
          <CaffiliateLogo />
        </button>
        <div className="flex items-center gap-2">
          <ThemeToggleButton />
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 dark:text-zinc-400 font-medium transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Dashboard
          </button>
        </div>
      </div>
    </header>
  );
}

/* ─────────────── SVG helpers ─────────────── */

/** Pie slice path. */
function describeSlice(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArcFlag = endDeg - startDeg <= 180 ? "0" : "1";
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/** Convert tailwind color name + shade → hex (subset cần dùng). */
function colorTwToHex(name: string | undefined, shade: string | undefined): string {
  if (!name || !shade) return "#fb923c";
  const map: Record<string, Record<string, string>> = {
    amber: { "300": "#fcd34d", "400": "#fbbf24", "500": "#f59e0b" },
    orange: { "300": "#fdba74", "400": "#fb923c", "500": "#f97316" },
    rose: { "300": "#fda4af", "400": "#fb7185", "500": "#f43f5e" },
    pink: { "300": "#f9a8d4", "400": "#f472b6", "500": "#ec4899" },
    gray: { "300": "#d1d5db", "400": "#9ca3af", "500": "#6b7280" },
    emerald: { "300": "#6ee7b7", "400": "#34d399", "500": "#10b981" },
    slate: { "300": "#cbd5e1", "400": "#94a3b8", "500": "#64748b" },
    fuchsia: { "300": "#f0abfc", "400": "#e879f9", "500": "#d946ef" },
    purple: { "300": "#d8b4fe", "400": "#c084fc", "500": "#a855f7" },
  };
  return map[name]?.[shade] ?? "#fb923c";
}
