"use client";

import { useEffect, useState } from "react";

interface PublicActivityItem {
  id: string;
  type: "order_complete" | "withdrawal_approved";
  maskedName: string;
  amount: number;
  createdAt: string;
}

interface TrustStats {
  completedOrders: number;
  totalCashbackPaid: number;
  totalWithdrawn: number;
  withdrawalsApproved: number;
}

/** "x phút/giờ/ngày trước" — gọn, tiếng Việt. */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  return `${months} tháng trước`;
}

function formatVND(n: number): string {
  return n.toLocaleString("vi-VN") + "đ";
}

/**
 * Dải tín hiệu tin cậy — 3 cam kết CÓ THẬT (xác minh trong code):
 *   - Phí rút 0đ (createWithdrawRequest không trừ phí).
 *   - Bảo mật: PIN rút tiền + 2FA.
 *   - Minh bạch: rút tối thiểu 50.000đ, cần 1 đơn hoàn tiền.
 *
 * Kèm feed hoạt động THẬT (ẩn danh) — chỉ hiển thị khi DB có dữ liệu thật.
 * Không bao giờ bịa số liệu khi rỗng.
 */
export function TrustSignals() {
  const [feed, setFeed] = useState<PublicActivityItem[]>([]);
  const [stats, setStats] = useState<TrustStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trust-feed")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.feed) setFeed(data.feed);
        if (data?.stats) setStats(data.stats);
      })
      .catch(() => {/* im lặng — chỉ là tín hiệu phụ */});
    return () => { cancelled = true; };
  }, []);

  const hasFeed = feed.length > 0;
  const hasPaidStats = stats && (stats.totalWithdrawn > 0 || stats.totalCashbackPaid > 0);

  return (
    <section className="vfa-card mb-6 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🛡️</span>
        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">An tâm cùng V-Affiliate</h2>
      </div>

      {/* 3 cam kết thật */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-emerald-100 dark:border-emerald-500/25 bg-emerald-50/60 dark:bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-black shrink-0">0đ</span>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Phí rút 0đ</p>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            Rút bao nhiêu nhận đúng bấy nhiêu — không trừ phí, không phí ẩn.
          </p>
        </div>

        <div className="rounded-xl border border-blue-100 dark:border-blue-500/25 bg-blue-50/60 dark:bg-blue-500/10 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-base shrink-0">🔒</span>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Bảo mật nhiều lớp</p>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            Rút tiền cần mật khẩu rút riêng (PIN) và hỗ trợ xác thực 2 lớp (2FA).
          </p>
        </div>

        <div className="rounded-xl border border-orange-100 dark:border-orange-500/25 bg-orange-50/60 dark:bg-orange-500/10 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-base shrink-0">✓</span>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Minh bạch, rõ ràng</p>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            Rút từ 50.000đ. Mọi khoản cộng/trừ ví đều có lịch sử chi tiết để bạn đối soát.
          </p>
        </div>
      </div>

      {/* Tổng đã chi trả thật (chỉ hiện khi > 0) */}
      {hasPaidStats && (
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/10 px-4 py-3">
          {stats!.totalWithdrawn > 0 && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black tabular-nums bg-gradient-to-br from-orange-600 to-amber-500 dark:from-orange-300 dark:to-amber-200 bg-clip-text text-transparent">
                {formatVND(stats!.totalWithdrawn)}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">đã rút về tài khoản</span>
            </div>
          )}
          {stats!.completedOrders > 0 && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black tabular-nums text-gray-800 dark:text-gray-100">
                {stats!.completedOrders.toLocaleString("vi-VN")}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">đơn đã hoàn tiền</span>
            </div>
          )}
        </div>
      )}

      {/* Feed hoạt động thật — chỉ hiện khi có dữ liệu */}
      {hasFeed && (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
            Hoạt động gần đây
          </p>
          <div className="space-y-1.5">
            {feed.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg bg-gray-50/70 dark:bg-white/[0.04] px-3 py-2"
              >
                <span className="text-base shrink-0">
                  {item.type === "withdrawal_approved" ? "💸" : "🛍️"}
                </span>
                <p className="text-xs text-gray-600 dark:text-gray-300 flex-1 min-w-0 truncate">
                  <b className="text-gray-800 dark:text-gray-100">{item.maskedName}</b>{" "}
                  {item.type === "withdrawal_approved" ? "vừa rút" : "vừa nhận hoàn"}{" "}
                  <b className="text-emerald-600 dark:text-emerald-400">{formatVND(item.amount)}</b>
                </p>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                  {timeAgo(item.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
