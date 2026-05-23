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
}

interface User { id: number; username: string; display_name: string | null; }

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
  const [loading, setLoading] = useState(true);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/referrals").then(r => r.json()),
    ]).then(([me, ref]) => {
      if (!me.success) { router.push("/"); return; }
      setUser(me.user);
      if (ref.success) { setStats(ref.stats); setRate(ref.rate); }
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

        {/* Tier progress — chỉ hiện khi chưa đạt mốc, hoặc badge celebration khi đã đạt */}
        {rate && (
          <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm p-5">
            {rate.reachedMilestone ? (
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl shadow-md">
                  🏆
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800 dark:text-zinc-100">
                    Đã mở khoá tier {rate.ratePercent}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Bạn đã có {rate.activeReferrals} bạn bè active. Mọi đơn hoàn tiền giờ nhận {rate.basePercent}% + {rate.bonusPercent}% = <b className="text-orange-600 dark:text-orange-400">{rate.ratePercent}%</b>.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-zinc-100">
                      Tiến độ mở tier {rate.basePercent + rate.bonusPercent}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      Mời {rate.milestone} bạn bè có ít nhất 1 đơn hoàn tiền → cộng thêm {rate.bonusPercent}% vào tỷ lệ.
                    </p>
                  </div>
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                    {rate.activeReferrals}/{rate.milestone}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (rate.activeReferrals / rate.milestone) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">
                  Còn <b className="text-gray-600 dark:text-zinc-300">{Math.max(0, rate.milestone - rate.activeReferrals)}</b> bạn nữa để nâng từ {rate.basePercent}% lên {rate.basePercent + rate.bonusPercent}%.
                </p>
              </>
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
              title={`Mời ${rate?.milestone ?? 50} bạn bè active — Nâng tỷ lệ lên ${(rate?.basePercent ?? 50) + (rate?.bonusPercent ?? 5)}%`}
              desc={`Khi có ${rate?.milestone ?? 50} bạn bè bạn giới thiệu hoàn thành đơn hoàn tiền đầu tiên, tỷ lệ cashback của bạn sẽ tự động cộng thêm ${rate?.bonusPercent ?? 5}% (từ ${rate?.basePercent ?? 50}% lên ${(rate?.basePercent ?? 50) + (rate?.bonusPercent ?? 5)}%) áp dụng cho mọi đơn từ đó về sau.`}
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
