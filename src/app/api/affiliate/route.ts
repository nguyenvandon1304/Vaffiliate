import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb, createNotification, getCashbackRateForUser, calcCashback, createShortLink } from "@/lib/db";
import { grantBadge } from "@/lib/achievements";

const GOAFFILIATE_CHECK_COMMISSION_URL = "https://goaffiliate.online/api/check-commission";
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const SHOPEE_AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID || "17330180328";
const GOAFFILIATE_API_KEY = process.env.GOAFFILIATE_API_KEY || "";

// ═══ Trích xuất shopId/itemId từ URL Shopee ═══
function extractShopeeIds(url: string): { shopId: string; itemId: string } | null {
  const m1 = url.match(/i\.(\d+)\.(\d+)/);
  if (m1) return { shopId: m1[1], itemId: m1[2] };
  const m2 = url.match(/shopee\.vn\/[^/]+\/(\d+)\/(\d+)/);
  if (m2) return { shopId: m2[1], itemId: m2[2] };
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const s = u.searchParams.get("shopid");
    const i = u.searchParams.get("itemid");
    if (s && i) return { shopId: s, itemId: i };
  } catch { /* ignore */ }
  return null;
}

// ═══ Resolve short URL → full URL ═══
async function resolveShortUrl(url: string): Promise<string> {
  if (!url.includes("s.shopee.vn") && !url.includes("shope.ee") && !url.includes("shp.ee")) return url;
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": BROWSER_UA },
    });
    return res.url || url;
  } catch {
    try {
      const res = await fetch(url, {
        redirect: "manual",
        headers: { "User-Agent": BROWSER_UA },
      });
      return res.headers.get("location") || url;
    } catch {
      return url;
    }
  }
}

// ═══ Parse giá từ chuỗi "₫172.000" → number 172000 ═══
function parsePrice(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₫đ,.\s]/g, "");
  return Number(cleaned) || 0;
}

// ═══ Gọi GoAffiliate /api/check-commission (endpoint chính thức trả phí) ═══
// Docs: https://goaffiliate.online/dashboard → Tài liệu → Kiểm tra Hoa hồng
interface GoAffProductInfo {
  itemId: number;
  shopId: number;
  name: string;
  image: string;
  price: string;
  commission: string;
  commissionRate: string;
}

async function fetchProductInfo(productUrl: string): Promise<GoAffProductInfo | null> {
  // Không có key → không gọi (tránh lãng phí + tránh dùng endpoint scrape).
  if (!GOAFFILIATE_API_KEY) {
    console.warn("[GoAffiliate] GOAFFILIATE_API_KEY chưa set — skip lookup");
    return null;
  }

  try {
    const res = await fetch(GOAFFILIATE_CHECK_COMMISSION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": GOAFFILIATE_API_KEY,
        "Accept": "application/json",
      },
      body: JSON.stringify({ originalLink: productUrl }),
    });

    if (!res.ok) {
      console.error(`[GoAffiliate] check-commission ${res.status}: ${await res.text().catch(() => "")}`);
      return null;
    }

    const data = await res.json();
    // Linh hoạt với schema — họ có thể trả `productInfo` hoặc đặt thẳng các field
    // ngoài level (`name`, `image`, `commissionRate`...). Bóc cả 2 dạng.
    const info = data.productInfo ?? data.data ?? data;
    if (info && (info.name || info.itemId)) {
      return info as GoAffProductInfo;
    }
    return null;
  } catch (e) {
    console.error("[GoAffiliate] check-commission error:", e);
    return null;
  }
}

// ═══ Tạo Shopee affiliate link với tracking ID + user sub_id ═══
function buildAffiliateLink(shopId: string, itemId: string, userId?: number): string {
  const params = new URLSearchParams({
    mmp_pid: `an_${SHOPEE_AFFILIATE_ID}`,
    utm_source: `an_${SHOPEE_AFFILIATE_ID}`,
    utm_medium: "affiliates",
    utm_campaign: "caffiliate",
    utm_content: userId ? `uid_${userId}` : "-",
  });
  if (userId) params.set("sub_id", `uid_${userId}`);
  return `https://shopee.vn/product-i.${shopId}.${itemId}?${params.toString()}`;
}

export async function POST(request: NextRequest) {
  try {
    const { productUrl } = await request.json();

    // Bắt buộc đăng nhập
    const token = request.cookies.get("session_token")?.value;
    const user = token ? await getUserByToken(token) : null;
    if (!user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập để tạo link hoàn tiền", needLogin: true }, { status: 401 });
    }

    if (!productUrl || typeof productUrl !== "string") {
      return NextResponse.json({ success: false, error: "Vui lòng nhập link sản phẩm" }, { status: 400 });
    }

    if (!productUrl.includes("shopee.vn") && !productUrl.includes("shope.ee") && !productUrl.includes("shp.ee")) {
      return NextResponse.json({ success: false, error: "Chỉ hỗ trợ link từ Shopee" }, { status: 400 });
    }

    // Resolve short URL nếu cần
    let resolvedUrl = productUrl.trim();
    if (resolvedUrl.includes("s.shopee.vn") || resolvedUrl.includes("shope.ee") || resolvedUrl.includes("shp.ee")) {
      resolvedUrl = await resolveShortUrl(resolvedUrl);
    }

    // Trích xuất IDs
    const ids = extractShopeeIds(resolvedUrl);
    if (!ids) {
      return NextResponse.json({
        success: false,
        error: "Không thể nhận diện link sản phẩm. Vui lòng thử link khác.",
      }, { status: 400 });
    }

    // Tạo clean product URL
    const cleanProductUrl = `https://shopee.vn/product-i.${ids.shopId}.${ids.itemId}`;

    // Lấy thông tin sản phẩm từ GoAffiliate
    const info = await fetchProductInfo(cleanProductUrl);

    // Tạo affiliate link trực tiếp với Shopee Affiliate ID + user tracking
    const affiliateLink = buildAffiliateLink(ids.shopId, ids.itemId, user?.id);

    // Cashback rate theo tier user (Bronze 50% / Silver 53% / Gold 55% / VIP 58%).
    // Nếu chưa login thì dùng tier Bronze (50%) làm fallback.
    let cashbackRate = 50;
    let tierCode = "bronze";
    let tierName = "Đồng";
    if (user) {
      const rateInfo = await getCashbackRateForUser(user.id);
      cashbackRate = rateInfo.ratePercent;
      tierCode = rateInfo.tierCode ?? "bronze";
      tierName = rateInfo.tierName ?? "Đồng";
    }
    const commissionAmount = parsePrice(info?.commission || "");
    const cashback = calcCashback(commissionAmount, cashbackRate);

    // Tạo SHORT LINK gọn để user copy ra Facebook/Zalo/Telegram.
    // Vấn đề: link Shopee dài 200+ ký tự → FB không auto-link (link đen).
    // Short link `https://vaffiliate.vn/s/xxxxxxxx` gọn + landing page có content
    // sản phẩm → FB tin domain hơn, tăng khả năng auto-link xanh.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://vaffiliate.vn";
    let shortLink = affiliateLink; // fallback: nếu sinh short fail thì vẫn trả link đầy đủ
    try {
      const code = await createShortLink({
        userId: user?.id ?? null,
        targetUrl: affiliateLink,
        shopId: ids.shopId,
        itemId: ids.itemId,
        productName: info?.name || undefined,
        productImage: info?.image || undefined,
        productPrice: parsePrice(info?.price || "") || undefined,
        cashbackAmount: cashback || undefined,
      });
      shortLink = `${baseUrl}/s/${code}`;
    } catch (e) {
      console.error("[Affiliate] Failed to create short link:", e);
    }

    const product = {
      name: info?.name || "Sản phẩm Shopee",
      image: info?.image || "",
      price: parsePrice(info?.price || ""),
      originalPrice: 0,
      commission: commissionAmount,
      commissionRate: info?.commissionRate || "",
      cashback,
      cashbackRate, // % thực tế áp dụng cho user (50/53/55/58)
      tierCode,
      tierName,
      affiliateLink,
      shortLink, // ← link gọn để copy/share trên FB (auto-link xanh)
      productUrl: cleanProductUrl,
      shopId: ids.shopId,
      itemId: ids.itemId,
      shop: "SHOPEE",
    };

    // Lưu lịch sử tạo link (nếu user đăng nhập). Bảng `affiliate_links`
    // đã được tạo sẵn trong `initSchema()` nên không cần CREATE TABLE ở đây.
    if (user) {
      try {
        const database = await getDb();
        database.run(
          "INSERT INTO affiliate_links (user_id, shop_id, item_id, product_name, product_price, commission, commission_rate, cashback, affiliate_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [user.id, ids.shopId, ids.itemId, product.name, product.price, product.commission, product.commissionRate, product.cashback, affiliateLink]
        );
        await createNotification(user.id, "Tạo link thành công", `Link hoàn tiền ${cashbackRate}% cho "${product.name}" đã được tạo. Cashback dự kiến: ${product.cashback.toLocaleString("vi-VN")}đ`, "link");
        // Grant badge "first_link" — idempotent, chỉ earn lần đầu.
        void grantBadge(user.id, "first_link");
      } catch (e) {
        console.error("[Affiliate] Failed to save link:", e);
      }
    }

    return NextResponse.json({ success: true, product, userId: user?.id || null });
  } catch (error) {
    console.error("Affiliate API error:", error);
    return NextResponse.json({ success: false, error: "Lỗi hệ thống. Vui lòng thử lại." }, { status: 500 });
  }
}
