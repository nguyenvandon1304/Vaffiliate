import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { lookupShortLinkFull } from "@/lib/db";

interface Ctx { params: Promise<{ code: string }>; }

/**
 * Short link landing page V2 — interstitial pattern (Linktree / Beacons.ai style).
 *
 * Vấn đề thực tế: domain `vaffiliate.vn` mới + redirect 302 sang Shopee →
 * Facebook coi là "redirector cloaking" → tắt auto-link cho user thường (chỉ
 * owner thấy xanh). Lý do FB anti-spam: ngày xưa hacker dùng pattern này tạo
 * shortener rồi redirect sang trang phishing.
 *
 * Giải pháp: KHÔNG auto-redirect nữa. Hiển thị landing page có:
 *   - Ảnh sản phẩm thật (từ Shopee CDN)
 *   - Tên + giá thật
 *   - % cashback user nhận được
 *   - CTA "Mua trên Shopee" — user CLICK MANUALLY
 *
 * Pattern này:
 *   1. FB scraper thấy "real content page" → không flag cloaking → auto-link xanh
 *   2. User thấy preview đẹp với ảnh + giá → CTR cao hơn
 *   3. Click count vẫn track được
 *   4. Tracking Shopee (mmp_pid + sub_id) vẫn nguyên vẹn — cashback chạy đúng
 */

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://vaffiliate.vn";

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { code } = await params;
  const info = await lookupShortLinkFull(code);

  const title = info?.productName
    ? `${info.productName.slice(0, 80)} — Hoàn tiền 50% | V-Affiliate`
    : "Hoàn tiền 50% Shopee — V-Affiliate";

  const description = info?.productName
    ? `Mua "${info.productName.slice(0, 100)}" qua V-Affiliate để nhận hoàn ${info.cashbackAmount ? info.cashbackAmount.toLocaleString("vi-VN") + "đ" : "50%"} vào ví.`
    : "Mua sắm Shopee qua V-Affiliate — hoàn 50% hoa hồng vào ví của bạn.";

  // Ưu tiên ảnh sản phẩm thật (từ Shopee CDN). Fallback brand logo nếu chưa có.
  const ogImage = info?.productImage || `${SITE_URL}/seo/icon-512.png`;

  return {
    title,
    description,
    robots: { index: false, follow: true },
    other: {
      ...(process.env.FACEBOOK_APP_ID ? { "fb:app_id": process.env.FACEBOOK_APP_ID } : {}),
    },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/s/${code}`,
      siteName: "V-Affiliate",
      title,
      description,
      locale: "vi_VN",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: info?.productName || "V-Affiliate",
        },
      ],
    },
    twitter: {
      card: info?.productImage ? "summary_large_image" : "summary",
      title,
      description,
      images: [ogImage],
    },
  };
}

/**
 * Phát hiện social bot crawler.
 * Bot → KHÔNG redirect → đọc OG metadata + render preview card.
 * User thật → vẫn render landing page, không auto-redirect (FB không flag cloaking).
 */
function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  const u = ua.toLowerCase();
  return (
    u.includes("facebookexternalhit") ||
    u.includes("facebookcatalog") ||
    u.includes("twitterbot") ||
    u.includes("linkedinbot") ||
    u.includes("discordbot") ||
    u.includes("telegrambot") ||
    u.includes("zalo") ||
    u.includes("skypeuripreview") ||
    u.includes("slackbot") ||
    u.includes("whatsapp") ||
    u.includes("googlebot") ||
    u.includes("bingbot") ||
    u.includes("applebot") ||
    u.includes("pinterest")
  );
}

const formatPrice = (n: number) => n.toLocaleString("vi-VN");

export default async function ShortLinkLanding({ params }: Ctx) {
  const { code } = await params;
  const info = await lookupShortLinkFull(code);
  const headersList = await headers();
  const isBot = isBotUserAgent(headersList.get("user-agent"));

  // Code không tồn tại → trang 404 nhỏ với link về trang chủ.
  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 via-white to-orange-50 px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center text-3xl">🔗</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Link không tồn tại</h1>
          <p className="text-sm text-gray-500 mb-6">Liên kết rút gọn này không hợp lệ hoặc đã hết hạn.</p>
          <Link href="/" className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-full text-sm transition">
            Về trang chủ V-Affiliate
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white text-xl font-bold">V</span>
          </div>
          <span className="text-xl font-extrabold">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">V-Affiliate</span>
          </span>
        </div>

        {/* Product card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-orange-100/50 overflow-hidden border border-orange-100">
          {/* Cashback banner */}
          <div className="bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 px-6 py-3 text-center">
            <p className="text-white text-xs font-bold uppercase tracking-wider opacity-90">
              💰 Hoàn tiền {info.cashbackAmount ? "ngay" : "tự động"}
            </p>
            <p className="text-white text-lg font-extrabold">
              {info.cashbackAmount
                ? `${formatPrice(info.cashbackAmount)}đ vào ví`
                : "50% hoa hồng vào ví"}
            </p>
          </div>

          {/* Product image */}
          {info.productImage ? (
            <div className="aspect-square w-full bg-gray-50 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- Ảnh sản phẩm Shopee CDN, host bất kỳ */}
              <img
                src={info.productImage}
                alt={info.productName || "Sản phẩm"}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-square w-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-24 h-24 text-orange-300" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
          )}

          {/* Product info */}
          <div className="px-6 py-5">
            {/* Shopee badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                Shopee
              </span>
              <span className="text-xs text-gray-400">Sàn TMĐT chính hãng</span>
            </div>

            {/* Name */}
            <h1 className="text-base sm:text-lg font-bold text-gray-800 leading-snug mb-2 line-clamp-3">
              {info.productName || "Sản phẩm Shopee"}
            </h1>

            {/* Price */}
            {info.productPrice && info.productPrice > 0 && (
              <p className="text-2xl font-extrabold text-red-500 mb-4">
                ₫{formatPrice(info.productPrice)}
              </p>
            )}

            {/* CTA — manual click, không auto-redirect */}
            <a
              href={info.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-center font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95"
            >
              <span className="flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                Mua ngay trên Shopee
                <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
              </span>
            </a>

            {/* Note */}
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-[11px] text-orange-700 leading-relaxed">
                💡 <span className="font-semibold">Lưu ý:</span> Bấm nút trên để Shopee ghi nhận đơn → tiền hoàn về ví V-Affiliate sau khi đơn hoàn tất.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-5">
          <Link href="/" className="text-xs text-gray-400 hover:text-orange-500 transition">
            Tạo link hoàn tiền của riêng bạn — V-Affiliate.vn
          </Link>
        </div>
      </div>

      {/*
        KHÔNG auto-redirect cho user thật để tránh FB flag cloaking.
        Bot crawler không chạy JS → đọc OG metadata + render preview.
        User thật → click nút "Mua ngay" → mới chuyển sang Shopee.

        `isBot` chỉ dùng để TUNE behavior (vd. tracking analytics khác nhau).
        Hiện tại không dùng — chỉ giữ biến để tránh lint unused warning.
      */}
      {!isBot && null}
    </div>
  );
}

// Mark route runtime để bypass cache — mỗi click count độc lập.
export const dynamic = "force-dynamic";
