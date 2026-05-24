"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CaffiliateLogo } from "@/components/icons";
import { Modal } from "@/components/Modal";
import { QrCode } from "@/components/QrCode";
import { ThemeToggleButton } from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";

interface Stats {
  totalReferred: number;
  bonusCredited: number;
  totalBonus: number;
  recent: Array<{
    id: number;
    referee_user_id: number;
    referee_username: string;
    referee_display_name: string | null;
    bonus_credited: number;
    created_at: string;
  }>;
}

interface RateInfo {
  ratePercent: number;
  activeReferrals: number;
  milestone: number;
  basePercent: number;
  bonusPercent: number;
  reachedMilestone: boolean;
  tierCode?: string;
  tierName?: string;
  tierIcon?: string;
}

interface TierData {
  code: string;
  name: string;
  icon: string;
  color: string;
  minOrders: number;
  minReferrals: number;
  cashbackPercent: number;
}

interface TierInfo {
  current: TierData;
  next: TierData | null;
  ordersCount: number;
  referralsCount: number;
  progressPercent: number;
  ordersToNext: number;
  referralsToNext: number;
  cashbackPercent: number;
}

interface User { id: number; username: string; display_name: string | null; }

interface Badge {
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earned: boolean;
  earned_at: string | null;
}

function formatVND(n: number) { return (n || 0).toLocaleString("vi-VN") + "đ"; }
function formatDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function ReferralPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [rate, setRate] = useState<RateInfo | null>(null);
  const [tier, setTier] = useState<TierInfo | null>(null);
  const [allTiers, setAllTiers] = useState<TierData[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/referrals").then(r => r.json()),
      fetch("/api/achievements?sync=1").then(r => r.json()),
      fetch("/api/tier").then(r => r.json()),
    ]).then(([me, ref, ach, tierRes]) => {
      if (!me.success) { router.push("/"); return; }
      setUser(me.user);
      if (ref.success) { setStats(ref.stats); setRate(ref.rate); }
      if (ach.success) setBadges(ach.badges);
      if (tierRes.success) {
        setTier(tierRes.info);
        setAllTiers(tierRes.tiers);
      }
      setLoading(false);
    });
  }, [router]);

  // Build short link giới thiệu — /r/<username>. Domain runtime để dev cũng đúng.
  const refLink = user
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/r/${encodeURIComponent(user.username)}`
    : "";

  const copyLink = async () => {
    if (!refLink) return;
    try {
      await navigator.clipboard.writeText(refLink);
      toast.success("Đã sao chép link giới thiệu");
    } catch {
      toast.error("Không sao chép được. Hãy chọn và copy thủ công.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/30 via-gray-50 to-gray-50 dark:from-zinc-950 dark:via-zinc-950 dark:to-black relative overflow-hidden">
      {/* Background decoration — vòng tròn mờ kiểu mockup */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-10 left-1/4 w-32 h-32 rounded-full border-2 border-orange-200/40 dark:border-orange-900/20" />
        <div className="absolute top-32 right-10 w-20 h-20 rounded-full border-2 border-orange-200/40 dark:border-orange-900/20" />
        <div className="absolute top-20 right-1/3 text-2xl text-orange-200/40 dark:text-orange-900/20">★</div>
      </div>

      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-200/60 dark:border-zinc-800 sticky top-0 z-30">
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 dark:text-zinc-500">
          <button onClick={() => router.push("/dashboard")} className="flex items-center gap-1 hover:text-orange-500 transition-colors">
            <span>🏠</span>
            <span>Trang chủ</span>
          </button>
          <span className="text-gray-300">›</span>
          <span className="text-gray-700 dark:text-zinc-200 font-semibold">Giới Thiệu</span>
        </nav>

        {/* Hero — gradient cam */}
        <section className="relative bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-3xl shadow-xl shadow-orange-500/30 p-6 sm:p-8 overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-4 right-4 w-32 h-32 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 -translate-x-1/3 translate-y-1/3" />
          <div className="absolute bottom-4 right-12 w-3 h-3 rounded-full bg-white/30" />
          <div className="absolute top-12 left-8 w-2 h-2 rounded-full bg-white/30" />

          <div className="relative text-center">
            <p className="text-xs font-bold tracking-[0.2em] text-white/90 uppercase">Tổng thưởng đã nhận</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="text-5xl font-black text-white">{(stats?.totalBonus ?? 0).toLocaleString("vi-VN")}</span>
              <span className="text-3xl">💰</span>
            </div>

            {/* Pills */}
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              <Pill icon="💎" label={`Đang nhận ${rate?.ratePercent ?? 50}%`} />
              <Pill icon="📅" label="365 ngày" />
              <Pill icon="👥" label={`${stats?.bonusCredited ?? 0}/${rate?.milestone ?? 50} bạn active`} />
            </div>

            {/* Link box */}
            <div className="mt-5 bg-white rounded-full px-5 py-3 flex items-center justify-center shadow-md">
              <code className="text-xs sm:text-sm font-mono text-gray-700 truncate">
                {refLink || "—"}
              </code>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={copyLink}
                className="flex items-center gap-2 bg-white hover:bg-orange-50 text-orange-600 text-sm font-bold px-6 py-2.5 rounded-xl shadow-md transition-all hover:scale-105"
              >
                <CopyIcon className="w-4 h-4" />
                <span>Sao Chép</span>
              </button>
              <button
                onClick={() => setShowQr(true)}
                className="flex items-center gap-2 bg-white hover:bg-orange-50 text-orange-600 text-sm font-bold px-6 py-2.5 rounded-xl shadow-md transition-all hover:scale-105"
              >
                <QrIcon className="w-4 h-4" />
                <span>Mã QR</span>
              </button>
            </div>
          </div>
        </section>

        {/* Tier system — hiện current tier + progress đến tier kế + bảng so sánh */}
        {tier && (
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-5 space-y-4">
            {/* Header: current tier + cashback rate */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 flex items-center justify-center text-3xl shadow-lg shadow-orange-500/30">
                {tier.current.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-sm text-gray-500 dark:text-zinc-400">Tier hiện tại</p>
                  <span className="text-base font-bold text-gray-800 dark:text-zinc-100">{tier.current.name}</span>
                </div>
                <p className="text-2xl font-extrabold bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
                  Hoàn {tier.cashbackPercent}% mỗi đơn
                </p>
              </div>
            </div>

            {/* Progress đến tier tiếp theo */}
            {tier.next ? (
              <div>
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="text-gray-500 dark:text-zinc-400">
                    Tiến độ lên <strong className="text-gray-800 dark:text-zinc-100">{tier.next.icon} {tier.next.name}</strong>
                  </span>
                  <span className="font-bold text-orange-600 dark:text-orange-400">{tier.progressPercent}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 via-rose-400 to-fuchsia-500 rounded-full transition-all"
                    style={{ width: `${tier.progressPercent}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="bg-orange-50 dark:bg-orange-500/10 rounded-lg p-2">
                    <div className="text-gray-500 dark:text-zinc-400">🛒 Đơn hoàn tiền</div>
                    <div className="font-bold text-gray-800 dark:text-zinc-100 mt-0.5">
                      {tier.ordersCount} <span className="text-gray-400 dark:text-zinc-500 font-normal">/ {tier.next.minOrders}</span>
                    </div>
                    {tier.ordersToNext > 0 && (
                      <div className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5">
                        Còn {tier.ordersToNext} đơn
                      </div>
                    )}
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-500/10 rounded-lg p-2">
                    <div className="text-gray-500 dark:text-zinc-400">🤝 Bạn mời active</div>
                    <div className="font-bold text-gray-800 dark:text-zinc-100 mt-0.5">
                      {tier.referralsCount} <span className="text-gray-400 dark:text-zinc-500 font-normal">/ {tier.next.minReferrals}</span>
                    </div>
                    {tier.referralsToNext > 0 && (
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                        Còn {tier.referralsToNext} bạn
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-2 text-center">
                  💡 Đạt 1 trong 2 mốc trên là lên tier mới
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-violet-100 to-fuchsia-100 dark:from-violet-500/15 dark:to-fuchsia-500/15 rounded-xl p-4 text-center">
                <p className="text-sm font-bold text-violet-700 dark:text-violet-300">
                  💎 Bạn đã đạt tier cao nhất!
                </p>
                <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                  Hoàn {tier.cashbackPercent}% mãi mãi
                </p>
              </div>
            )}

            {/* Bảng so sánh tất cả tiers */}
            {allTiers.length > 0 && (
              <details className="group">
                <summary className="text-xs font-semibold text-gray-500 dark:text-zinc-400 cursor-pointer hover:text-orange-500 select-none">
                  Xem bảng tier đầy đủ ▾
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-zinc-800">
                        <th className="text-left py-2 font-medium text-gray-400 dark:text-zinc-500">Tier</th>
                        <th className="text-right py-2 font-medium text-gray-400 dark:text-zinc-500">Đơn HT</th>
                        <th className="text-right py-2 font-medium text-gray-400 dark:text-zinc-500">Bạn mời</th>
                        <th className="text-right py-2 font-medium text-gray-400 dark:text-zinc-500">Cashback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTiers.map((t) => {
                        const isCurrent = t.code === tier.current.code;
                        return (
                          <tr
                            key={t.code}
                            className={`border-b border-gray-50 dark:border-zinc-800/50 last:border-0 ${
                              isCurrent ? "bg-orange-50 dark:bg-orange-500/10 font-semibold" : ""
                            }`}
                          >
                            <td className="py-2">
                              <span className="mr-1.5">{t.icon}</span>
                              {t.name}
                              {isCurrent && <span className="ml-1.5 text-[9px] uppercase tracking-wider text-orange-600 dark:text-orange-400">Hiện tại</span>}
                            </td>
                            <td className="text-right py-2 text-gray-600 dark:text-zinc-300">{t.minOrders}+</td>
                            <td className="text-right py-2 text-gray-600 dark:text-zinc-300">{t.minReferrals}+</td>
                            <td className="text-right py-2 font-bold text-orange-600 dark:text-orange-400">{t.cashbackPercent}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </section>
        )}

        {/* Thể lệ chương trình */}
        <section>
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-800 dark:text-zinc-100 mb-3 px-1">
            <span className="text-xl">✨</span>
            <span>Thể Lệ Chương Trình</span>
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm divide-y divide-gray-50 dark:divide-zinc-800">
            <RuleItem
              icon={<GiftIcon className="w-5 h-5 text-orange-500" />}
              title={
                allTiers.length > 0
                  ? `Hệ thống ${allTiers.length} cấp bậc — Cashback từ ${allTiers[0]?.cashbackPercent ?? 50}% đến ${allTiers[allTiers.length - 1]?.cashbackPercent ?? 58}%`
                  : "Hệ thống cấp bậc — Cashback tăng theo tier"
              }
              desc={
                allTiers.length > 0
                  ? `Mỗi tier có ngưỡng đơn hàng + bạn mời riêng. Đạt 1 trong 2 ngưỡng là tự động lên tier mới, cashback tăng vĩnh viễn cho mọi đơn từ đó. Vd: ${allTiers[1]?.icon ?? "🥈"} ${allTiers[1]?.name ?? "Silver"} = ${allTiers[1]?.minOrders ?? 50} đơn HT hoặc ${allTiers[1]?.minReferrals ?? 25} bạn mời active → ${allTiers[1]?.cashbackPercent ?? 53}%.`
                  : "Mời bạn bè + mua hàng để lên tier cao hơn, hưởng cashback nhiều hơn."
              }
            />
            <RuleItem
              icon={<ShieldIcon className="w-5 h-5 text-green-500" />}
              title="Người được mời vẫn nhận đủ 100% điểm mua sắm"
              desc="Bạn bè bạn không bị mất gì, điểm mua sắm vẫn được ghi nhận như bình thường."
            />
            <RuleItem
              icon={<CalendarIcon className="w-5 h-5 text-amber-500" />}
              title="Áp dụng trong 365 ngày"
              desc="Kể từ khi người được mời đăng ký tài khoản."
            />
            <RuleItem
              icon={<LinkIcon className="w-5 h-5 text-pink-500" />}
              title="Chỉ áp dụng qua link mời"
              desc="Bạn bè phải đăng ký qua đúng link mời ở trên để được tính vào số bạn active của bạn."
            />
          </div>
        </section>

        {/* Lịch sử thưởng */}
        <section>
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-800 dark:text-zinc-100 mb-3 px-1">
            <span className="text-xl">🕒</span>
            <span>Lịch Sử Thưởng</span>
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
            {stats && stats.recent.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 dark:text-zinc-400 border-b border-gray-100 dark:border-zinc-800">
                      <th className="px-4 py-3 font-medium">Người được mời</th>
                      <th className="px-4 py-3 font-medium text-center">Trạng thái</th>
                      <th className="px-4 py-3 font-medium text-right">Ngày đăng ký</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 dark:border-zinc-800/50 last:border-0">
                        <td className="px-4 py-3 text-gray-800 dark:text-zinc-200">
                          <p className="font-medium">{r.referee_username}</p>
                          {r.referee_display_name && (
                            <p className="text-xs text-gray-500 dark:text-zinc-500">{r.referee_display_name}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.bonus_credited ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                              ✓ Đã thưởng
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                              Chờ kích hoạt
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-zinc-500">{formatDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                  <InboxIcon className="w-7 h-7 text-gray-400 dark:text-zinc-500" />
                </div>
                <p className="text-sm text-gray-500 dark:text-zinc-400">Chưa có dữ liệu giới thiệu</p>
              </div>
            )}
            {stats && stats.totalBonus > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 dark:border-zinc-800 bg-orange-50/40 dark:bg-orange-900/10 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-zinc-400">Tổng thưởng đã nhận</span>
                <span className="font-bold text-orange-600 dark:text-orange-400">{formatVND(stats.totalBonus)}</span>
              </div>
            )}
          </div>
        </section>

        {/* Thành tích / Achievements */}
        <section>
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-800 dark:text-zinc-100 mb-3 px-1">
            <span className="text-xl">🏅</span>
            <span>Thành Tích</span>
            <span className="ml-auto text-xs font-medium text-gray-500 dark:text-zinc-400">
              {badges.filter((b) => b.earned).length} / {badges.length}
            </span>
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {badges.map((b) => (
                <div
                  key={b.code}
                  title={b.earned ? `${b.name} — ${b.description}` : `🔒 ${b.name}: ${b.description}`}
                  className={`relative aspect-square rounded-xl flex flex-col items-center justify-center p-2 transition-all ${
                    b.earned
                      ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/15 dark:to-orange-500/10 border-2 border-amber-200 dark:border-amber-500/30 shadow-sm hover:shadow-md hover:scale-105 cursor-help"
                      : "bg-gray-50 dark:bg-zinc-800/40 border border-dashed border-gray-200 dark:border-zinc-700 grayscale opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="text-3xl mb-1">{b.earned ? b.icon : "🔒"}</div>
                  <div className="text-[10px] font-bold text-center text-gray-700 dark:text-zinc-200 leading-tight">
                    {b.name}
                  </div>
                  {b.earned && b.earned_at && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-500 mt-4 text-center">
              💡 Hoàn thành các thử thách để mở khoá huy hiệu mới
            </p>
          </div>
        </section>
      </main>

      {/* QR Modal */}
      <Modal open={showQr} onClose={() => setShowQr(false)} title="Mã QR giới thiệu" size="sm">
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">
            Quét mã để mở trang đăng ký V-Affiliate kèm link giới thiệu.
          </p>
          {refLink && (
            <div className="inline-block p-4 bg-white rounded-xl border border-gray-200">
              <QrCode data={refLink} size={240} alt="QR code link giới thiệu" />
            </div>
          )}
          <p className="mt-3 text-xs text-gray-500 dark:text-zinc-500 break-all font-mono">{refLink}</p>
          <button
            onClick={copyLink}
            className="mt-4 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            <CopyIcon className="w-4 h-4" /> Sao chép link
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ─────────────── UI bits ─────────────── */

function Pill({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-xs font-semibold px-3 py-1 rounded-full">
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  );
}

function RuleItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 p-4">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-100">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* ─────────────── Inline icons (stroke-based, theme-aware) ─────────────── */

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function QrIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <line x1="14" y1="14" x2="14" y2="14.01" />
      <line x1="17" y1="14" x2="21" y2="14" />
      <line x1="14" y1="17" x2="14" y2="21" />
      <line x1="17" y1="17" x2="21" y2="17" />
      <line x1="17" y1="21" x2="21" y2="21" />
      <line x1="21" y1="17" x2="21" y2="21" />
    </svg>
  );
}

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
