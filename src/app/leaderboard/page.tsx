import Link from "next/link";
import type { Metadata } from "next";
import { getDb, getPublicStats } from "@/lib/db";

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://vaffiliate.vn";

export const metadata: Metadata = {
  title: "Bảng xếp hạng — Top user V-Affiliate",
  description: "Top user nhận cashback nhiều nhất, top người mời bạn bè tích cực nhất tại V-Affiliate.",
  alternates: { canonical: `${SITE_URL}/leaderboard` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/leaderboard`,
    siteName: "V-Affiliate",
    title: "🏆 Bảng xếp hạng V-Affiliate",
    description: "Top user nhận cashback và top người mời nhiều nhất tháng này.",
  },
  robots: { index: true, follow: true },
};

// Revalidate every hour — leaderboard không cần realtime
export const revalidate = 3600;

interface CashbackEntry {
  rank: number;
  display_name: string;
  total_orders: number;
  total_cashback: number;
}

interface ReferrerEntry {
  rank: number;
  display_name: string;
  total_referrals: number;
}

/**
 * Mask name privacy — chỉ hiện chữ đầu + dấu chấm.
 * Vd. "Nguyen Van A" → "Nguyen V*** A***"
 */
function maskName(name: string): string {
  if (!name) return "Ẩn danh";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0) + "***";
  return parts
    .map((p, i) => (i === 0 ? p : p.charAt(0) + "***"))
    .join(" ");
}

async function getCashbackLeaderboard(): Promise<CashbackEntry[]> {
  const database = await getDb();
  const rows = await database.all(
    `SELECT u.display_name, u.username,
       COUNT(o.id)::int AS total_orders,
       COALESCE(SUM(o.cashback), 0)::int AS total_cashback
     FROM users u
     LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'Đã hoàn tiền'
       AND o.created_at >= date_trunc('month', NOW())
     WHERE u.role = 'user' AND u.is_active = 1
     GROUP BY u.id
     HAVING COALESCE(SUM(o.cashback), 0) > 0
     ORDER BY total_cashback DESC
     LIMIT 10`,
    [],
  );
  return rows.map((r, i) => ({
    rank: i + 1,
    display_name: maskName(String(r.display_name || r.username || "")),
    total_orders: Number(r.total_orders),
    total_cashback: Number(r.total_cashback),
  }));
}

async function getReferrerLeaderboard(): Promise<ReferrerEntry[]> {
  const database = await getDb();
  const rows = await database.all(
    `SELECT u.display_name, u.username,
       COUNT(r.id)::int AS total_refs
     FROM users u
     INNER JOIN referrals r ON r.referrer_user_id = u.id AND r.bonus_credited = 1
     WHERE u.role = 'user' AND u.is_active = 1
     GROUP BY u.id
     HAVING COUNT(r.id) > 0
     ORDER BY total_refs DESC
     LIMIT 10`,
    [],
  );
  return rows.map((r, i) => ({
    rank: i + 1,
    display_name: maskName(String(r.display_name || r.username || "")),
    total_referrals: Number(r.total_refs),
  }));
}

const RANK_BADGE: Record<number, { bg: string; medal: string }> = {
  1: { bg: "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-amber-500/40", medal: "🥇" },
  2: { bg: "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-md", medal: "🥈" },
  3: { bg: "bg-gradient-to-br from-amber-700 to-orange-800 text-white shadow-md", medal: "🥉" },
};

function fmt(n: number): string {
  return n.toLocaleString("vi-VN");
}

/**
 * Public leaderboard page — không cần auth, ai cũng vào được.
 * Mục tiêu:
 *  - Social proof cho user mới khi đến từ link giới thiệu
 *  - Gamification cho user hiện tại (thấy mình ở rank nào)
 *  - SEO traffic free
 *
 * Privacy: tên user được mask thành "Nguyen V*** A***" để bảo vệ thông tin.
 */
export default async function LeaderboardPage() {
  const [cashback, referrers, stats] = await Promise.all([
    getCashbackLeaderboard().catch(() => []),
    getReferrerLeaderboard().catch(() => []),
    getPublicStats().catch(() => ({ totalUsers: 0, totalCashback: 0, totalOrders: 0 })),
  ]);

  const fmtBig = (n: number): string => {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " tỷ";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + " triệu";
    if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
    return String(n);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-orange-50 via-amber-50/30 to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-orange-200/30 blur-3xl dark:bg-orange-900/15" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-amber-200/25 blur-3xl dark:bg-amber-900/10" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Brand bar */}
        <Link href="/" className="inline-flex items-center gap-2.5 mb-6 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-orange-500/30">
            V
          </div>
          <div>
            <p className="text-base font-black text-gray-800 dark:text-zinc-100">
              V-Affiliate
            </p>
            <p className="text-[10px] text-gray-500 dark:text-zinc-400">
              Hoàn 50% hoa hồng Shopee
            </p>
          </div>
        </Link>

        {/* Hero */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-full text-xs font-bold text-orange-700 dark:text-orange-300">
            <span>🏆</span>
            <span>BẢNG XẾP HẠNG · Cập nhật theo tháng</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">
              Top user
            </span>{" "}
            <span className="text-gray-800 dark:text-zinc-100">V-Affiliate</span>
          </h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mt-3 max-w-md mx-auto">
            Những người mua sắm thông minh nhất và mời nhiều bạn nhất tháng này. Bạn có muốn vào top?
          </p>
        </header>

        {/* Public stats */}
        {stats.totalUsers >= 10 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <div className="rounded-2xl border border-orange-200/60 dark:border-orange-500/20 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md p-4 text-center">
              <p className="text-xl sm:text-2xl font-black text-orange-600 dark:text-orange-400 tabular-nums">
                🔥 {fmtBig(stats.totalUsers)}+
              </p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium mt-1">
                user đã tham gia
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md p-4 text-center">
              <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                💚 {fmtBig(stats.totalCashback)}đ
              </p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium mt-1">
                đã hoàn cho user
              </p>
            </div>
            <div className="rounded-2xl border border-blue-200/60 dark:border-blue-500/20 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md p-4 text-center col-span-2 sm:col-span-1">
              <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                📦 {fmtBig(stats.totalOrders)}+
              </p>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium mt-1">
                đơn hoàn thành
              </p>
            </div>
          </div>
        )}

        {/* 2 leaderboard columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          {/* Cashback leaderboard */}
          <section className="rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-200/70 dark:border-zinc-700 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                <h2 className="text-base font-black">
                  Top hoàn tiền tháng này
                </h2>
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">
                Người mua sắm tiết kiệm nhất
              </p>
            </div>

            {cashback.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400 dark:text-zinc-500">
                Chưa có dữ liệu tháng này
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
                {cashback.map((entry) => {
                  const badge = RANK_BADGE[entry.rank];
                  return (
                    <li key={entry.rank} className="flex items-center gap-3 px-5 py-3">
                      <div
                        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-black ${
                          badge ? badge.bg : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                        }`}
                      >
                        {badge ? badge.medal : entry.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-zinc-100 truncate">
                          {entry.display_name}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-500">
                          {entry.total_orders} đơn hoàn thành
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent tabular-nums">
                          +{fmt(entry.total_cashback)}đ
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Referrer leaderboard */}
          <section className="rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-gray-200/70 dark:border-zinc-700 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-4 text-white">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤝</span>
                <h2 className="text-base font-black">
                  Top giới thiệu mọi thời đại
                </h2>
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">
                Người mời bạn bè tích cực nhất
              </p>
            </div>

            {referrers.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400 dark:text-zinc-500">
                Chưa có dữ liệu — bạn có thể là người đầu tiên!
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
                {referrers.map((entry) => {
                  const badge = RANK_BADGE[entry.rank];
                  return (
                    <li key={entry.rank} className="flex items-center gap-3 px-5 py-3">
                      <div
                        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-black ${
                          badge ? badge.bg : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
                        }`}
                      >
                        {badge ? badge.medal : entry.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-zinc-100 truncate">
                          {entry.display_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-rose-600 dark:text-rose-400 tabular-nums">
                          {entry.total_referrals} bạn
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Bottom CTA */}
        <section className="rounded-3xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 shadow-xl shadow-orange-500/30 text-white p-6 sm:p-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-black mb-2">
            Bạn cũng muốn vào top?
          </h2>
          <p className="text-sm sm:text-base opacity-95 mb-5 max-w-md mx-auto">
            Tham gia V-Affiliate ngay — nhận hoàn tiền 50% mỗi đơn Shopee và mời bạn bè để lên hạng.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-white hover:bg-orange-50 text-orange-600 font-black px-6 py-3 rounded-2xl shadow-lg transition-all hover:scale-105"
          >
            Tham gia ngay
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </section>

        {/* Footer */}
        <p className="text-[10px] text-gray-400 dark:text-zinc-500 text-center mt-8">
          Tên user được ẩn 1 phần để bảo vệ thông tin · Cập nhật mỗi giờ · Top hoàn tiền theo tháng hiện tại
        </p>
      </div>
    </main>
  );
}
