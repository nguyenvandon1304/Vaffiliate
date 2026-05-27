"use client";

import { ReactNode } from "react";

export interface OrderCardData {
  id: number;
  order_code: string;
  store: string;
  amount: number;
  cashback: number;
  status: string;
  created_at: string;
}

interface OrderCardProps {
  order: OrderCardData;
}

/** Map status DB → step index trong timeline 4 bước. */
function getStepIndex(status: string): number {
  // 0: Mua hàng, 1: Ghi nhận, 2: Đối soát, 3: Hoàn tiền
  if (status === "Đã hủy" || status === "Đã huỷ") return -1;
  if (status === "Đã hoàn tiền") return 3;
  if (status === "Đang xử lý") return 2;
  if (status === "Chờ xác nhận") return 1;
  return 0;
}

const STEPS = [
  { label: "Mua", icon: "🛍️" },
  { label: "Ghi nhận", icon: "📝" },
  { label: "Đối soát", icon: "🔍" },
  { label: "Hoàn", icon: "💰" },
];

/** Format date DD/MM/YYYY. */
function formatVNDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/**
 * Tính ngày dự kiến hoàn tiền: created_at + ~14 ngày (avg Shopee cashback period).
 */
function estimateCashbackDate(createdAt: string): Date {
  const start = new Date(createdAt);
  start.setDate(start.getDate() + 14);
  return start;
}

/** Status meta: label + color theme. */
function getStatusMeta(status: string): { label: string; bg: string; text: string; ring: string } {
  if (status === "Đã hoàn tiền") {
    return {
      label: "Đã hoàn tiền",
      bg: "bg-emerald-100 dark:bg-emerald-500/15",
      text: "text-emerald-700 dark:text-emerald-400",
      ring: "ring-emerald-300 dark:ring-emerald-500/40",
    };
  }
  if (status === "Đã hủy" || status === "Đã huỷ") {
    return {
      label: "Đã huỷ",
      bg: "bg-rose-100 dark:bg-rose-500/15",
      text: "text-rose-700 dark:text-rose-400",
      ring: "ring-rose-300 dark:ring-rose-500/40",
    };
  }
  if (status === "Đang xử lý") {
    return {
      label: "Đang xử lý",
      bg: "bg-amber-100 dark:bg-amber-500/15",
      text: "text-amber-700 dark:text-amber-400",
      ring: "ring-amber-300 dark:ring-amber-500/40",
    };
  }
  if (status === "Chờ xác nhận") {
    return {
      label: "Chờ xác nhận",
      bg: "bg-blue-100 dark:bg-blue-500/15",
      text: "text-blue-700 dark:text-blue-400",
      ring: "ring-blue-300 dark:ring-blue-500/40",
    };
  }
  return {
    label: status,
    bg: "bg-gray-100 dark:bg-zinc-800",
    text: "text-gray-700 dark:text-zinc-300",
    ring: "ring-gray-300 dark:ring-zinc-700",
  };
}

/** Format VND. */
function fmt(n: number): string {
  return n.toLocaleString("vi-VN");
}

interface TimelineProps {
  currentStep: number;
  cancelled: boolean;
}

/** Status timeline horizontal — 4 dots với connecting line. */
function StatusTimeline({ currentStep, cancelled }: TimelineProps) {
  if (cancelled) {
    return (
      <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
        <span className="text-base">✕</span>
        <span className="font-semibold">Đơn hàng đã bị huỷ</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between relative">
      {/* Background connecting line */}
      <div className="absolute top-3 left-3 right-3 h-0.5 bg-gray-200 dark:bg-zinc-700" />
      {/* Filled progress line */}
      <div
        className="absolute top-3 left-3 h-0.5 bg-gradient-to-r from-orange-400 to-amber-500 transition-all duration-700"
        style={{ width: currentStep > 0 ? `calc(${(currentStep / (STEPS.length - 1)) * 100}% - 24px)` : "0" }}
      />

      {STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        const isFuture = i > currentStep;
        return (
          <div key={i} className="relative z-10 flex flex-col items-center gap-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border-2 ${
                isDone
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : isActive
                  ? "bg-gradient-to-br from-orange-500 to-amber-500 border-orange-500 text-white shadow-lg shadow-orange-500/40 scale-110"
                  : "bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-600 text-gray-400 dark:text-zinc-500"
              }`}
            >
              {isDone ? (
                <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2.5 6.5 5 9 9.5 3.5" />
                </svg>
              ) : isActive ? (
                <span className="relative flex">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                </span>
              ) : (
                String(i + 1)
              )}
            </div>
            <span className={`text-[9px] font-medium whitespace-nowrap ${
              isFuture ? "text-gray-400 dark:text-zinc-500" : "text-gray-700 dark:text-zinc-300"
            }`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Order card design — replace bảng table cũ với card UI hấp dẫn:
 *  - Top row: Mã đơn + Status badge
 *  - Store name + product (nếu có) bold
 *  - Timeline 4 chấm với pulse dot ở step hiện tại
 *  - Bottom: Giá đơn (gray) + Cashback (orange gradient)
 *  - Estimated date "Dự kiến hoàn: DD/MM" (chỉ pending)
 */
export function OrderCard({ order }: OrderCardProps) {
  const stepIdx = getStepIndex(order.status);
  const cancelled = stepIdx === -1;
  const completed = stepIdx === 3;
  const meta = getStatusMeta(order.status);
  const created = new Date(order.created_at);
  const eta = estimateCashbackDate(order.created_at);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilEta = Math.max(0, Math.ceil((eta.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div
      className={`relative rounded-2xl border bg-white dark:bg-zinc-900/60 backdrop-blur-sm p-4 sm:p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 ${
        completed
          ? "border-emerald-200/60 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/[0.04]"
          : cancelled
          ? "border-rose-200/60 dark:border-rose-500/20 bg-rose-50/30 dark:bg-rose-500/[0.04]"
          : "border-gray-100 dark:border-zinc-800"
      }`}
    >
      {/* Top row: Mã đơn + Status */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
            #{order.order_code}
          </p>
          <p className="text-sm font-bold text-gray-800 dark:text-zinc-100 truncate mt-0.5">
            {order.store}
          </p>
        </div>
        <span className={`shrink-0 inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full ring-1 ${meta.bg} ${meta.text} ${meta.ring}`}>
          {meta.label}
        </span>
      </div>

      {/* Amount + Cashback */}
      <div className="flex items-baseline gap-3 mb-4">
        <div>
          <p className="text-[10px] font-medium text-gray-400 dark:text-zinc-500">Giá trị</p>
          <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300 tabular-nums">
            {fmt(order.amount)}đ
          </p>
        </div>
        <div className="border-l border-gray-200 dark:border-zinc-700 pl-3">
          <p className="text-[10px] font-medium text-gray-400 dark:text-zinc-500">Hoàn tiền</p>
          <p className={`text-base font-black tabular-nums ${
            completed ? "text-emerald-600 dark:text-emerald-400" : "bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent"
          }`}>
            +{fmt(order.cashback)}đ
          </p>
        </div>
      </div>

      {/* Status timeline */}
      <div className="px-1 py-1">
        <StatusTimeline currentStep={stepIdx} cancelled={cancelled} />
      </div>

      {/* Bottom row: Date info */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
        <span className="text-gray-400 dark:text-zinc-500">
          Đặt lúc <span className="font-semibold text-gray-600 dark:text-zinc-300">{formatVNDate(created)}</span>
        </span>
        {!cancelled && !completed && (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
            <span>⏳</span>
            Dự kiến hoàn: {formatVNDate(eta)}
            {daysUntilEta > 0 && <span className="opacity-70">(còn ~{daysUntilEta} ngày)</span>}
          </span>
        )}
        {completed && (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <span>✓</span>
            Đã cộng vào ví
          </span>
        )}
      </div>
    </div>
  );
}

interface OrderListProps {
  orders: OrderCardData[];
  /** Optional empty state — nếu không có orders. */
  emptyState?: ReactNode;
}

/** Wrapper hiển thị danh sách card. */
export function OrderList({ orders, emptyState }: OrderListProps) {
  if (orders.length === 0) return <>{emptyState}</>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} />
      ))}
    </div>
  );
}
