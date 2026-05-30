"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CaffiliateLogo } from "@/components/icons";
import { useConfetti } from "@/components/Confetti";
import { ThemeToggleButton } from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";
import { playWinSound, playLoseSound, playTickSound } from "@/lib/notification-sound";
import { SpinSkeleton } from "@/components/Skeleton";

interface Segment {
  index: number;
  amount: number;
  label: string;
  color: string;
}

interface Status {
  enabled: boolean;
  availableTokens: number;
  totalEarned: number;
  totalSpins: number;
  totalWon: number;
  completedOrders: number;
  activeReferrals: number;
  ordersPerToken: number;
  referralsPerToken: number;
  ordersTowardsNext: number;
  referralsTowardsNext: number;
}

function formatVND(n: number) {
  return (n || 0).toLocaleString("vi-VN") + "đ";
}

export default function SpinPage() {
  const router = useRouter();
  const toast = useToast();
  const { fire: fireConfetti, confettiNode } = useConfetti();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [resultLabel, setResultLabel] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const tickIntervalRef = useRef<number | null>(null);

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
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const refetchStatus = async () => {
    const r = await fetch("/api/spin");
    const d = await r.json();
    if (d.success) setStatus(d.status);
  };

  const handleSpin = async () => {
    if (spinning || !status?.availableTokens) return;
    setSpinning(true);
    setResultLabel(null);

    // Tick sound: chạy mỗi 80ms trong lúc quay (4s)
    if (tickIntervalRef.current !== null) clearInterval(tickIntervalRef.current);
    let tickCount = 0;
    tickIntervalRef.current = window.setInterval(() => {
      // Slow down ticks gradually — first 30 fast, then progressively slower
      tickCount++;
      if (tickCount < 30 || tickCount % 2 === 0) {
        playTickSound();
      }
    }, 100);

    try {
      const res = await fetch("/api/spin", { method: "POST" });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Không thể quay");
        setSpinning(false);
        if (tickIntervalRef.current !== null) clearInterval(tickIntervalRef.current);
        return;
      }

      const segDeg = 360 / segments.length;
      const target = data.segmentIndex * segDeg;
      const fullSpins = 5;
      const newRotation = rotation + fullSpins * 360 + (360 - target);
      setRotation(newRotation);

      setTimeout(() => {
        setResultLabel(data.label);
        if (tickIntervalRef.current !== null) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
        if (data.amount > 0) {
          fireConfetti();
          playWinSound();
          toast.success(`🎉 Trúng ${formatVND(data.amount)}!`);
        } else {
          playLoseSound();
          toast.info(`${data.label}. Lượt sau may mắn hơn nhé!`);
        }
        setSpinning(false);
        void refetchStatus();
      }, 4000);
    } catch {
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
      setSpinning(false);
      if (tickIntervalRef.current !== null) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (tickIntervalRef.current !== null) clearInterval(tickIntervalRef.current);
    };
  }, []);

  if (loading) {
    return <SpinSkeleton />;
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
      {confettiNode}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-orange-200/30 blur-3xl dark:bg-orange-900/20" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-pink-200/30 blur-3xl dark:bg-pink-900/20" />
      </div>

      <SpinHeader router={router} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-orange-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
            Vòng Quay May Mắn
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">
            Mua đơn + mời bạn để nhận lượt quay
          </p>
        </div>

        {/* Token counter — nổi bật giữa */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-3xl p-5 shadow-md shadow-orange-500/15 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider opacity-80 mb-1">Lượt quay đang có</div>
              <div className="text-5xl font-extrabold leading-none">
                {status.availableTokens}
              </div>
            </div>
            <div className="text-right text-xs space-y-0.5 opacity-90">
              <div>Đã earn: {status.totalEarned}</div>
              <div>Đã quay: {status.totalSpins}</div>
              <div>Tổng nhận: {formatVND(status.totalWon)}</div>
            </div>
          </div>
        </div>

        {/* Progress bars — hiển thị tiến độ tới lượt quay tiếp theo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ProgressCard
            icon="🛒"
            label="Đơn hoàn tiền"
            current={status.ordersTowardsNext}
            target={status.ordersPerToken}
            description={`${status.ordersPerToken} đơn = 1 lượt quay`}
            totalCount={status.completedOrders}
            color="from-orange-400 to-orange-500"
          />
          <ProgressCard
            icon="🤝"
            label="Bạn mời active"
            current={status.referralsTowardsNext}
            target={status.referralsPerToken}
            description={`${status.referralsPerToken} bạn = 1 lượt quay`}
            totalCount={status.activeReferrals}
            color="from-pink-400 to-fuchsia-500"
          />
        </div>

        {/* Wheel */}
        <div className="relative flex justify-center pt-4 pb-2">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
            <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[28px] border-t-red-500 drop-shadow-lg" />
          </div>

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
                  const startAngle = seg.index * segDeg - 90 - segDeg / 2;
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
          {status.availableTokens > 0 ? (
            <button
              onClick={handleSpin}
              disabled={spinning}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 via-pink-500 to-fuchsia-500 hover:from-orange-600 hover:via-pink-600 hover:to-fuchsia-600 text-white font-bold px-10 py-3.5 rounded-full shadow-lg shadow-orange-500/40 transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="text-xl">🎰</span>
              <span>{spinning ? "Đang quay..." : `QUAY NGAY (còn ${status.availableTokens} lượt)`}</span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="inline-block bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 px-6 py-3 rounded-full text-sm font-semibold">
                ⏳ Hết lượt quay
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                Mua thêm <strong className="text-orange-600">{status.ordersPerToken - status.ordersTowardsNext} đơn</strong> hoặc mời thêm <strong className="text-pink-600">{status.referralsPerToken - status.referralsTowardsNext} bạn</strong> để nhận lượt mới
              </p>
              <div className="flex gap-2 justify-center pt-2">
                <button
                  onClick={() => router.push("/dashboard/cashback")}
                  className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Mua hàng
                </button>
                <button
                  onClick={() => router.push("/dashboard/referral")}
                  className="text-xs font-semibold bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Mời bạn
                </button>
              </div>
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
            <span>📜</span> Cách nhận lượt quay
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="text-orange-500 mt-0.5">🛒</span>
              <span>
                Mỗi <strong className="text-orange-600">{status.ordersPerToken} đơn hoàn tiền</strong> = <strong>1 lượt quay</strong>
                <br />
                <span className="text-xs text-gray-400">Chỉ tính đơn có status &quot;Đã hoàn tiền&quot;</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-pink-500 mt-0.5">🤝</span>
              <span>
                Mỗi <strong className="text-pink-600">{status.referralsPerToken} bạn mời active</strong> = <strong>1 lượt quay</strong>
                <br />
                <span className="text-xs text-gray-400">Bạn được mời phải có ít nhất 1 đơn hoàn tiền</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 mt-0.5">💰</span>
              <span>Tiền thưởng cộng <strong>thẳng vào ví</strong>, có thể rút như cashback</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-fuchsia-500 mt-0.5">🎁</span>
              <span>Có cơ hội trúng <strong>50.000đ jackpot</strong> với xác suất 5%</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}

function ProgressCard({
  icon,
  label,
  current,
  target,
  description,
  totalCount,
  color,
}: {
  icon: string;
  label: string;
  current: number;
  target: number;
  description: string;
  totalCount: number;
  color: string;
}) {
  const percent = Math.min(100, (current / target) * 100);
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs text-gray-500 dark:text-zinc-500 flex items-center gap-1.5">
            <span className="text-base">{icon}</span>
            <span>{label}</span>
          </div>
          <div className="text-2xl font-bold text-gray-800 dark:text-zinc-100 mt-0.5">
            {current}<span className="text-base text-gray-400 dark:text-zinc-600">/{target}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-zinc-500">Tổng</div>
          <div className="text-lg font-bold text-gray-700 dark:text-zinc-200">{totalCount}</div>
        </div>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 dark:text-zinc-500">{description}</p>
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
