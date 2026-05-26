import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { resolveShortLink, getDb } from "@/lib/db";

interface Ctx { params: Promise<{ code: string }>; }

/**
 * Short link page - splash + redirect.
 *
 * Vấn đề trước: redirect 302 ngay → Facebook scraper nhận ra "redirector" + 
 * domain mới + target là Shopee affiliate → flag là spam/cloaking → KHÔNG
 * auto-link (link bị đen trong comment).
 *
 * Giải pháp đúng (pattern bit.ly / lnk.bio):
 *   1. Page trả HTML đầy đủ với Open Graph metadata (FB scraper crawl được).
 *   2. Meta refresh + JS redirect sau 800ms cho user thật.
 *   3. FB tin domain "có nội dung thật" → auto-link xanh + render preview card.
 */

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://vaffiliate.vn";

// Lookup cả target_url + product_name (nếu có) để build OG title đẹp.
async function lookupShortLink(code: string): Promise<{
  targetUrl: string | null;
  productName: string | null;
  productImage: string | null;
}> {
  if (!code || !/^[a-zA-Z0-9]{4,16}$/.test(code)) {
    return { targetUrl: null, productName: null, productImage: null };
  }
  const database = await getDb();
  // JOIN với affiliate_links để lấy product_name (cùng user_id + shop_id + item_id).
  const row = await database.get(
    `SELECT s.target_url, s.shop_id, s.item_id,
       (SELECT product_name FROM affiliate_links a
        WHERE a.shop_id = s.shop_id AND a.item_id = s.item_id
        ORDER BY a.id DESC LIMIT 1) AS product_name
     FROM short_links s WHERE s.code = ?`,
    [code],
  );
  if (!row?.target_url) return { targetUrl: null, productName: null, productImage: null };
  return {
    targetUrl: String(row.target_url),
    productName: row.product_name ? String(row.product_name) : null,
    productImage: null,
  };
}

export async function generateMetadata({ params }: Ctx): Promise<Metadata> {
  const { code } = await params;
  const info = await lookupShortLink(code);

  const title = info.productName
    ? `${info.productName.slice(0, 80)} — Hoàn tiền 50% qua V-Affiliate`
    : "Hoàn tiền 50% Shopee — V-Affiliate";
  const description = info.productName
    ? `Mua "${info.productName.slice(0, 100)}" qua V-Affiliate để nhận hoàn tiền 50% hoa hồng vào ví. Bấm link để chuyển sang Shopee.`
    : "Bấm link để mua sản phẩm Shopee và nhận hoàn tiền 50% hoa hồng vào ví V-Affiliate.";

  return {
    title,
    description,
    // Cho phép FB/Google index trang short link để FB scraper crawl được OG.
    robots: { index: false, follow: true },
    other: {
      // fb:app_id optional — set qua env nếu user đã tạo Facebook App. Không bắt buộc.
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
          url: `${SITE_URL}/seo/icon-512.png`,
          width: 512,
          height: 512,
          alt: "V-Affiliate",
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [`${SITE_URL}/seo/icon-512.png`],
    },
  };
}

/**
 * Phát hiện social bot crawler (FB / Twitter / Discord / Telegram / Zalo / Slack).
 * Bot → KHÔNG redirect → đọc OG metadata + render preview card V-Affiliate.
 * User thật → splash 800ms rồi auto redirect sang Shopee.
 *
 * Quan trọng: nếu không phân biệt bot vs user, FB scraper sẽ FOLLOW redirect
 * sang Shopee → preview hiển thị Shopee thay vì brand V-Affiliate.
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

export default async function ShortLinkPage({ params }: Ctx) {
  const { code } = await params;
  const target = await resolveShortLink(code);

  // Detect bot từ user-agent — bot sẽ thấy preview V-Affiliate, không redirect.
  const headersList = await headers();
  const ua = headersList.get("user-agent");
  const isBot = isBotUserAgent(ua);

  // Code không tồn tại → trang 404 nhỏ với link về trang chủ.
  if (!target) {
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

  // HTML escape target URL trước khi nhúng vào meta refresh + JS.
  // Không dùng dangerouslySetInnerHTML — Next escape sẵn cho text/attribute.
  // Splash page với 2 tầng redirect:
  //   1. <meta http-equiv="refresh"> — fallback nếu JS bị tắt
  //   2. <script> window.location.replace() — chạy ngay sau hydrate (~50ms)
  //
  // BOT (FB/Twitter/Zalo crawler) → bỏ qua redirect → chỉ render HTML có
  // OG metadata để build preview card.
  const includeRedirect = !isBot;
  return (
    <>
      {includeRedirect && (
        <meta httpEquiv="refresh" content={`1; url=${target}`} />
      )}      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-orange-50 via-white to-orange-50 px-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white text-3xl font-bold">V</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800 mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">V-Affiliate</span>
          </h1>
          <p className="text-sm text-gray-600 mb-1">Đang chuyển bạn sang Shopee...</p>
          <p className="text-xs text-gray-400 mb-6">Hoàn 50% hoa hồng vào ví của bạn</p>

          <div className="flex items-center justify-center gap-2 text-orange-500 mb-6">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>

          <a
            href={target}
            className="inline-block text-xs text-gray-400 hover:text-orange-500 underline transition"
          >
            Bấm vào đây nếu không tự chuyển
          </a>
        </div>
      </div>

      {/* JS redirect — chạy ngay sau hydrate. Bot sẽ không chạy JS → đọc được OG metadata. */}
      {includeRedirect && (
        <script
          dangerouslySetInnerHTML={{
            __html: `setTimeout(function(){window.location.replace(${JSON.stringify(target)});},800);`,
          }}
        />
      )}
    </>
  );
}

// Mark route runtime để bypass cache — mỗi click count độc lập.
export const dynamic = "force-dynamic";
