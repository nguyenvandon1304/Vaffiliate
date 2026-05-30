"use client";

import { useRouter } from "next/navigation";

interface GettingStartedProps {
  /** Số đơn đã tạo (để tick bước "mua sắm qua link"). */
  totalOrders: number;
  /** Số đơn đã hoàn tiền (để tick bước "tiền về ví"). */
  completedOrders: number;
  /** Tổng đã rút (để tick bước "rút tiền"). */
  totalWithdrawn: number;
}

type Step = {
  key: string;
  emoji: string;
  title: string;
  desc: string;
  done: boolean;
  cta?: { label: string; href: string };
};

/**
 * Card "hành trình ngày đầu" — hướng dẫn người dùng mới 3 bước để nhận đồng đầu tiên.
 * Chỉ hiển thị khi user chưa hoàn tất 1 vòng (chưa rút tiền lần nào) — totalWithdrawn === 0.
 * Tiến độ tự tick theo phễu thật: lấy link → mua qua link → tiền về ví → rút.
 */
export function GettingStarted({ totalOrders, completedOrders, totalWithdrawn }: GettingStartedProps) {
  const router = useRouter();

  const steps: Step[] = [
    {
      key: "link",
      emoji: "🔗",
      title: "Lấy link hoàn tiền",
      desc: "Dán link sản phẩm Shopee để nhận link hoàn tiền của riêng bạn.",
      done: totalOrders > 0,
      cta: { label: "Lấy link ngay", href: "/dashboard/cashback" },
    },
    {
      key: "shop",
      emoji: "🛒",
      title: "Mua sắm qua link",
      desc: "Mua như bình thường — giá không đổi, đơn được ghi nhận tự động.",
      done: totalOrders > 0,
    },
    {
      key: "wallet",
      emoji: "💰",
      title: "Tiền về ví → Rút",
      desc: "Shopee xác nhận (7-15 ngày) → tiền vào ví, rút từ 50.000đ.",
      done: completedOrders > 0 || totalWithdrawn > 0,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  // Bước hiện tại = bước chưa hoàn thành đầu tiên.
  const currentIdx = steps.findIndex((s) => !s.done);
  const progressPct = Math.round((doneCount / steps.length) * 100);

  return (
    <section className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:via-zinc-900 dark:to-amber-950/30 border border-orange-100 dark:border-orange-500/25 shadow-sm dark:shadow-lg dark:shadow-orange-950/30">
      <div className="pointer-events-none absolute -top-12 -right-12 w-44 h-44 rounded-full bg-orange-200/30 dark:bg-orange-500/15 blur-3xl" />

      <div className="relative p-5 sm:p-6">
        {/* Header + progress */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span>🚀</span> Bắt đầu kiếm tiền hoàn
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {doneCount === steps.length
                ? "Tuyệt vời! Bạn đã đi hết hành trình 🎉"
                : "3 bước đơn giản để nhận đồng hoàn tiền đầu tiên."}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-lg font-black bg-gradient-to-br from-orange-600 to-amber-500 dark:from-orange-300 dark:to-amber-200 bg-clip-text text-transparent tabular-nums">
              {doneCount}/{steps.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-orange-100 dark:bg-white/10 overflow-hidden mb-5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-700"
            style={{ width: `${Math.max(4, progressPct)}%` }}
          />
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {steps.map((step, idx) => {
            const isCurrent = idx === currentIdx;
            return (
              <div
                key={step.key}
                className={`relative rounded-xl border p-4 transition-all ${
                  step.done
                    ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10"
                    : isCurrent
                      ? "border-orange-300 dark:border-orange-500/50 bg-white dark:bg-white/[0.06] ring-2 ring-orange-200/60 dark:ring-orange-500/20"
                      : "border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03]"
                }`}
              >
                {/* Step number / check */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      step.done
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                          ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm"
                          : "bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {step.done ? "✓" : idx + 1}
                  </span>
                  <span className="text-lg">{step.emoji}</span>
                </div>

                <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{step.title}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-0.5">{step.desc}</p>

                {/* CTA chỉ ở bước hiện tại nếu có */}
                {isCurrent && step.cta && (
                  <button
                    onClick={() => router.push(step.cta!.href)}
                    className="mt-3 inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition-all hover:scale-105"
                  >
                    {step.cta.label}
                    <span>→</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
