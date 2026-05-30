"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserTierInfo } from "@/lib/tier";
import { Tilt3D } from "@/components/Tilt3D";

interface StreakInfo {
  currentStreak: number;
  nextMilestone: number | null;
  nextBonus: number;
}

interface SpinStatus {
  availableTokens: number;
  completedOrders: number;
  ordersPerToken: number;
  ordersTowardsNext: number;
}

interface JourneyStripProps {
  /** Tier info — truyền từ dashboard (useTierInfo) để khỏi fetch lại. */
  tierInfo: UserTierInfo | null;
}

/**
 * Dải "Hành trình thăng hạng" — gắn kết 3 hệ thống rời rạc (streak / tier / spin)
 * thành 1 mạch kể chuyện: đăng nhập đều → mua sắm & mời bạn → lên hạng & quay thưởng.
 *
 * 3 node nối nhau bằng đường dẫn, mỗi node tóm tắt 1 chặng + có hành động.
 * Tier nhận qua props; streak + spin tự fetch.
 */
export function JourneyStrip({ tierInfo }: JourneyStripProps) {
  const router = useRouter();
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [spin, setSpin] = useState<SpinStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/streak").then((r) => r.json()).catch(() => null),
      fetch("/api/spin").then((r) => r.json()).catch(() => null),
    ]).then(([streakRes, spinRes]) => {
      if (cancelled) return;
      if (streakRes?.info) setStreak(streakRes.info);
      if (spinRes?.status) setSpin(spinRes.status);
    });
    return () => { cancelled = true; };
  }, []);

  const cashbackPercent = tierInfo?.cashbackPercent ?? tierInfo?.current.cashbackPercent ?? 50;
  const tierIcon = tierInfo?.current.icon ?? "🥉";
  const tierName = tierInfo?.current.name ?? "Bronze";
  const tierProgress = tierInfo?.next ? tierInfo.progressPercent : 100;
  const nextTier = tierInfo?.next ?? null;
  const cashbackDelta = nextTier ? nextTier.cashbackPercent - cashbackPercent : 0;

  // Spin progress tới lượt kế (theo đơn — nguồn chính & dễ hiểu nhất).
  const spinOrderPct = spin
    ? Math.round((spin.ordersTowardsNext / spin.ordersPerToken) * 100)
    : 0;
  const ordersToNextToken = spin
    ? spin.ordersPerToken - spin.ordersTowardsNext
    : 0;

  return (
    <Tilt3D max={4} lift={3} className="mb-6">
    <section className="vfa-card p-5 sm:p-6 overflow-hidden">
      {/* Header + mạch tóm tắt */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">🚀</span>
        <h2 className="vfa-section-title">Hành trình thăng hạng</h2>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
        Đăng nhập mỗi ngày → mua sắm &amp; mời bạn → lên hạng &amp; nhận lượt quay thưởng.
      </p>

      {/* 3 node nối nhau */}
      <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-0">
        {/* Đường nối ngang (desktop) */}
        <div className="hidden sm:block absolute top-[34px] left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-orange-300 via-amber-300 to-orange-300 dark:from-orange-500/40 dark:via-amber-500/40 dark:to-orange-500/40" />

        {/* Node 1 — Streak */}
        <JourneyNode
          emoji="🔥"
          ring="from-orange-500 to-amber-500"
          title="Chuỗi đăng nhập"
          big={streak ? `${streak.currentStreak} ngày` : "—"}
          sub={
            streak
              ? streak.nextMilestone
                ? `Còn ${streak.nextMilestone - streak.currentStreak} ngày → +${streak.nextBonus.toLocaleString("vi-VN")}đ`
                : "Đỉnh streak!"
              : "Đang tải…"
          }
        />

        {/* Node 2 — Tier */}
        <JourneyNode
          emoji={tierIcon}
          ring="from-amber-500 to-yellow-500"
          title={`Hạng ${tierName}`}
          big={`Hoàn ${cashbackPercent}%`}
          sub={
            nextTier
              ? `Lên ${nextTier.name} +${cashbackDelta}% mỗi đơn`
              : "Hạng cao nhất 🎉"
          }
          progress={nextTier ? tierProgress : undefined}
          onClick={() => router.push("/dashboard/referral")}
        />

        {/* Node 3 — Spin */}
        <JourneyNode
          emoji="🎰"
          ring="from-orange-500 to-rose-500"
          title="Vòng quay"
          big={spin ? `${spin.availableTokens} lượt` : "—"}
          sub={
            spin
              ? spin.availableTokens > 0
                ? "Bạn có lượt — quay ngay!"
                : `Còn ${ordersToNextToken} đơn → +1 lượt`
              : "Đang tải…"
          }
          progress={spin && spin.availableTokens === 0 ? spinOrderPct : undefined}
          onClick={() => router.push("/dashboard/spin")}
        />
      </div>
    </section>
    </Tilt3D>
  );
}

interface NodeProps {
  emoji: string;
  ring: string;
  title: string;
  big: string;
  sub: string;
  progress?: number;
  onClick?: () => void;
}

function JourneyNode({ emoji, ring, title, big, sub, progress, onClick }: NodeProps) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick!(); } } : undefined}
      className={`relative flex flex-col items-center text-center px-2 ${
        clickable ? "cursor-pointer group" : ""
      }`}
    >
      {/* Icon ring — lật 3D như đồng xu khi hover */}
      <div
        className={`relative z-10 w-[68px] h-[68px] rounded-full bg-gradient-to-br ${ring} flex items-center justify-center text-3xl text-white shadow-sm coin-3d-hover`}
      >
        {emoji}
      </div>

      <p className="mt-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {title}
      </p>
      <p className="mt-0.5 text-lg font-black bg-gradient-to-br from-orange-600 to-amber-500 dark:from-orange-300 dark:to-amber-200 bg-clip-text text-transparent tabular-nums">
        {big}
      </p>
      <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 leading-snug min-h-[28px]">
        {sub}
      </p>

      {/* Progress bar (optional) */}
      {progress !== undefined && (
        <div className="mt-1.5 w-full max-w-[140px] h-1.5 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-700"
            style={{ width: `${Math.max(4, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}
