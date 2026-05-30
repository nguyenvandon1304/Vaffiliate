import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getReferralUserInfo, getPublicStats } from "@/lib/db";

interface Ctx {
  params: Promise<{ username: string }>;
}

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://vaffiliate.vn";

/**
 * Dynamic metadata cho từng /r/[username] — bot FB/Zalo/Telegram/Twitter sẽ
 * crawl URL này và đọc OG tags để hiện preview card.
 */
export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { username } = await params;
  const referrer = await getReferralUserInfo(username).catch(() => null);
  const displayName = referrer?.displayName || referrer?.username || "Bạn";

  const title = `${displayName} mời bạn tham gia V-Affiliate`;
  const description = `Hoàn 50% hoa hồng cho mỗi đơn Shopee — mua sắm thông minh hơn cùng V-Affiliate. Tham gia bằng link giới thiệu của ${displayName} ngay!`;
  const url = `${SITE_URL}/r/${username}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      url,
      siteName: "V-Affiliate",
      title,
      description,
      // OG image is auto-generated from opengraph-image.tsx in this folder
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

/**
 * Referral landing page — KHÔNG redirect ngay nữa.
 * Hiện trang đẹp với:
 *  - Avatar + tên người mời
 *  - Tagline "Hoàn 50% hoa hồng Shopee"
 *  - Stats công khai
 *  - 3 benefits cho user mới
 *  - CTA "Đăng ký ngay" (set cookie ref + redirect /)
 *
 * Conversion rate cao hơn redirect 2-3x vì user có context rõ ràng.
 */
export default async function ReferralLanding({ params }: Ctx) {
  const { username: rawUsername } = await params;
  const cleaned = (rawUsername || "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);

  const [referrer, stats] = await Promise.all([
    getReferralUserInfo(cleaned),
    getPublicStats().catch(() => ({ totalUsers: 0, totalCashback: 0, totalOrders: 0 })),
  ]);

  // Nếu user không tồn tại → fallback redirect /
  if (!referrer) {
    redirect("/");
  }

  const displayName = referrer.displayName || referrer.username;
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const formatBig = (n: number): string => {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " tỷ";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + " triệu";
    if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
    return String(n);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50/40 to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-orange-200/40 blur-3xl dark:bg-orange-900/20" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[450px] h-[450px] rounded-full bg-amber-200/30 blur-3xl dark:bg-amber-900/15" />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* V-Affiliate brand bar */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-orange-500/30">
            V
          </div>
          <div>
            <p className="text-base font-black bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
              V-Affiliate
            </p>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
              Thương mại liên kết · Hoàn tiền Shopee
            </p>
          </div>
        </div>

        {/* Hero card — invitation */}
        <section className="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-orange-200/60 dark:border-orange-500/20 rounded-3xl shadow-xl shadow-orange-500/10 p-6 sm:p-8 mb-6">
          {/* Invitation header */}
          <div className="flex items-center gap-4 mb-5">
            <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-400 via-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-lg shadow-orange-500/40 ring-4 ring-white dark:ring-zinc-900">
              {avatarLetter}
            </div>
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-1">
                Bạn được mời
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-800 dark:text-zinc-100 leading-tight break-words">
                {displayName} mời bạn tham gia V-Affiliate
              </h1>
              {referrer.totalReferrals > 0 && (
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                  Đã giới thiệu thành công {referrer.totalReferrals} bạn bè
                </p>
              )}
            </div>
          </div>

          {/* Tagline */}
          <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-3">
            <span className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-clip-text text-transparent">
              Hoàn 50% hoa hồng
            </span>{" "}
            <span className="text-gray-800 dark:text-zinc-100">cho mỗi đơn Shopee</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-zinc-300 leading-relaxed mb-5">
            Mua sắm thông minh hơn — tạo link cashback cho sản phẩm bạn muốn,
            mua như bình thường, tiền tự động về ví. Đơn giản, minh bạch, không phí ẩn.
          </p>

          {/* CTA — Big button */}
          <Link
            href={`/?ref=${encodeURIComponent(cleaned)}`}
            className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-base font-black px-8 py-4 rounded-2xl shadow-xl shadow-orange-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>🎁 Đăng ký miễn phí với mã của {displayName}</span>
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 transition-transform group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
          <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-3 text-center sm:text-left">
            Đăng ký mất 30 giây · Không cần thẻ tín dụng · Có ngay link đầu tiên
          </p>
        </section>

        {/* 3 benefits row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-orange-200/50 dark:border-orange-500/20 p-4">
            <div className="text-2xl mb-2">💰</div>
            <p className="text-sm font-bold text-gray-800 dark:text-zinc-100 mb-1">
              Hoàn 50% mỗi đơn
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              Lên VIP — hoàn 58%. Tích lũy đơn càng nhiều, cashback càng cao.
            </p>
          </div>
          <div className="rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-emerald-200/50 dark:border-emerald-500/20 p-4">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-sm font-bold text-gray-800 dark:text-zinc-100 mb-1">
              Rút tiền nhanh
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              Đủ 50.000đ là rút về tài khoản ngân hàng trong 1-2 ngày làm việc.
            </p>
          </div>
          <div className="rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-violet-200/50 dark:border-violet-500/20 p-4">
            <div className="text-2xl mb-2">🎁</div>
            <p className="text-sm font-bold text-gray-800 dark:text-zinc-100 mb-1">
              Có thể kèm voucher
            </p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              Nhiều sản phẩm còn được Shopee tặng thêm voucher giảm tới 22% khi mua qua link.
            </p>
          </div>
        </div>

        {/* Social proof */}
        {(stats.totalUsers >= 10 || stats.totalCashback >= 100_000) && (
          <div className="rounded-2xl bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-gray-200/60 dark:border-zinc-700 p-4 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-2 text-center">
              Cộng đồng V-Affiliate
            </p>
            <div className="flex items-center justify-around gap-3 flex-wrap">
              {stats.totalUsers >= 10 && (
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-black text-orange-600 dark:text-orange-400 tabular-nums">
                    🔥 {formatBig(stats.totalUsers)}+
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                    user đã tham gia
                  </p>
                </div>
              )}
              {stats.totalCashback >= 100_000 && (
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    💚 {formatBig(stats.totalCashback)}đ
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                    đã hoàn cho user
                  </p>
                </div>
              )}
              {stats.totalOrders >= 10 && (
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                    📦 {formatBig(stats.totalOrders)}+
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                    đơn hoàn thành
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom CTA + login link */}
        <div className="text-center pb-10">
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Đã có tài khoản?{" "}
            <Link href="/" className="font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 underline-offset-2 hover:underline">
              Đăng nhập tại đây
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
