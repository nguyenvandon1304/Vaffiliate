import { NextRequest, NextResponse } from "next/server";
import { getUserByToken, getDb, createNotification, getCashbackRateForUser, calcCashback } from "@/lib/db";
import { grantBadge } from "@/lib/achievements";
import { rateLimitAsync } from "@/lib/rate-limit";
import { isShopeeHost, isShopeeShortHost, extractShopeeUrl } from "@/lib/shopee-url";

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const SHOPEE_AFFILIATE_ID = process.env.SHOPEE_AFFILIATE_ID || "17330180328";

// ─── AffiPad API — HIỆN TẠI KHÔNG DÙNG ĐƯỢC ───
// AffiPad chỉ cấp quyền cho domain nguyenvandon.afp.ad, không dùng được với vaffiliate.vn
// → Build link thủ công theo format AffiPad chuẩn (xem buildAffiPadStyleLink bên dưới)
const AFFIPAD_API_KEY = "";

// ─── GoAffiliate API (fallback) ───
const GOAFFILIATE_CHECK_COMMISSION_URL = "https://www.goaffiliate.online/api/check-commission";
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

// ═══ Host allowlist — chống SSRF (dùng helper chung @/lib/shopee-url) ═══
// Chỉ chấp nhận đúng các hostname Shopee (không dùng .includes() vì path/query
// có thể chứa "shopee.vn" để lừa qua, vd https://attacker.com/?x=shopee.vn).

// ═══ Resolve short URL → full URL ═══
// An toàn SSRF: KHÔNG follow redirect tự động (redirect: manual) + validate host
// của Location trả về cũng phải là Shopee + có timeout. Tránh short-link 30x sang
// địa chỉ nội bộ (169.254.169.254, localhost...).
async function resolveShortUrl(url: string): Promise<string> {
  if (!isShopeeShortHost(url)) return url;
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(8000),
    });
    const location = res.headers.get("location");
    if (location) {
      // Location có thể là URL tương đối → resolve theo base Shopee.
      const abs = location.startsWith("http") ? location : new URL(location, url).toString();
      // Chỉ chấp nhận nếu redirect tới đúng host Shopee.
      return isShopeeHost(abs) ? abs : url;
    }
    return url;
  } catch {
    return url;
  }
}

// ═══ Parse giá từ chuỗi "₫172.000" → number 172000 ═══
function parsePrice(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₫đ,.\s]/g, "");
  return Number(cleaned) || 0;
}

// ═══ Build Shopee affiliate link với VOUCHER SOCIAL MEDIA ═══
//
// Shopee có hệ thống "Voucher Social" — khi user click link từ nguồn Facebook
// (thông qua affiliate redirect), Shopee sẽ tự động nhận diện và áp dụng voucher
// vào tài khoản của họ khi mua hàng.
//
// Flow 1: Redirect qua l.facebook.com (Shopee nhận diện nguồn FB tự nhiên)
//   https://l.facebook.com/l.php?u={encoded_shopee_url_with_fb_params}
//
// Flow 2: Dùng s.shopee.vn/an_redir với đúng params
//   https://s.shopee.vn/an_redir?url={encoded_shopee_url}&fbpid={aff_id}
//
// Thử Flow 1 trước (Q Facebook redirect) → fallback Flow 2
function buildAffiPadStyleLink(productUrl: string, userId?: number): string {
  const u = new URL(productUrl.includes("://") ? productUrl : `https://shopee.vn/${productUrl}`);
  
  // Channel type FB để Shopee nhận diện nguồn Social Media (Facebook)
  u.searchParams.set("channel_type", "fb");
  
  // Thêm params để track affiliate (cho hoa hồng)
  const affId = SHOPEE_AFFILIATE_ID;
  u.searchParams.set("mmp_pid", `an_${affId}`);
  u.searchParams.set("utm_source", `an_${affId}`);
  u.searchParams.set("utm_medium", "affiliates");
  u.searchParams.set("utm_campaign", "vaffiliate");
  
  // Track theo user để biết ai tạo link
  if (userId) {
    u.searchParams.set("utm_content", `uid_${userId}`);
    u.searchParams.set("sub_id", `uid_${userId}`);
  }
  
  const encodedUrl = encodeURIComponent(u.toString());
  
  // Flow 1: Facebook redirect - Shopee nhận nguồn FB tự nhiên
  return `https://l.facebook.com/l.php?u=${encodedUrl}&h=${affId}`;
}

// ═══ Gọi GoAffiliate /api/check-commission — lấy thông tin sản phẩm ═══
// Docs: https://goaffiliate.online/docs → Kiểm tra Hoa hồng
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

export async function POST(request: NextRequest) {
  try {
    const { productUrl } = await request.json();

    // Bắt buộc đăng nhập
    const token = request.cookies.get("session_token")?.value;
    const user = token ? await getUserByToken(token) : null;
    if (!user) {
      return NextResponse.json({ success: false, error: "Vui lòng đăng nhập để tạo link hoàn tiền", needLogin: true }, { status: 401 });
    }

    // Rate-limit theo user — mỗi lần gọi kích hoạt tới 3 fetch ngoài (resolve
    // short-link + product info + get-link) → chống spam/cost-amplification.
    // 30 link / 5 phút là thoải mái cho user thật, chặn được script lạm dụng.
    const rl = await rateLimitAsync(`affiliate:user:${user.id}`, { max: 30, windowMs: 5 * 60 * 1000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: `Bạn tạo link hơi nhanh. Vui lòng đợi ${rl.retryAfterSec}s rồi thử lại.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    if (!productUrl || typeof productUrl !== "string") {
      return NextResponse.json({ success: false, error: "Vui lòng nhập link sản phẩm" }, { status: 400 });
    }

    // Android: nút "Chia sẻ" của app Shopee copy CẢ đoạn text kèm link → trích
    // ra URL Shopee sạch trước khi validate (tránh báo lỗi oan cho user).
    const extracted = extractShopeeUrl(productUrl);
    if (!extracted) {
      return NextResponse.json({
        success: false,
        error: "Không tìm thấy link Shopee. Hãy dán link sản phẩm Shopee (vd https://s.shopee.vn/...).",
      }, { status: 400 });
    }

    // Validate host nghiêm ngặt (chống SSRF) thay vì .includes().
    if (!isShopeeHost(extracted)) {
      return NextResponse.json({ success: false, error: "Chỉ hỗ trợ link từ Shopee" }, { status: 400 });
    }

    // Resolve short URL nếu cần (đã có guard host + no-follow + timeout bên trong).
    // KHÔNG để bước này là điểm chết: nếu resolve fail (Android / Render bị chặn),
    // vẫn gọi GoAffiliate với link gốc — API tự resolve short link được (đã xác minh).
    let resolvedUrl = extracted.trim();
    if (isShopeeShortHost(resolvedUrl)) {
      resolvedUrl = await resolveShortUrl(resolvedUrl);
    }

    // Link để gọi GoAffiliate: nếu resolve ra full link tách được IDs thì dùng,
    // không thì truyền thẳng link gốc — GoAffiliate tự xử lý short link.
    const lookupUrl = extractShopeeIds(resolvedUrl) ? resolvedUrl : extracted.trim();

    // ─── Luồng xử lý: AffiPad-style link (ghép trực tiếp) → GoAffiliate (lấy info + link) ───
    // NOTE: AffiPad API không hoạt động với domain vaffiliate.vn (chỉ được cấp cho nguyenvandon.afp.ad)
    // → Luôn dùng buildAffiPadStyleLink + GoAffiliate fallback
    let info: GoAffProductInfo | null = null;
    let linkResult: { affiliateLink: string; shopeeLink: string; originalLink: string } | null = null;

    // GoAffiliate lấy thông tin sản phẩm
    info = await fetchProductInfo(lookupUrl);
    
    // Ghép link theo format AffiPad chuẩn
    linkResult = {
      affiliateLink: buildAffiPadStyleLink(lookupUrl, user?.id),
      shopeeLink: buildAffiPadStyleLink(lookupUrl, user?.id),
      originalLink: lookupUrl,
    };

    // ═══ Xác định shopId/itemId theo thứ tự ưu tiên ═══
    // 1) Từ link đã resolve (nếu là full link).
    // 2) Từ response check-commission của GoAffiliate (có sẵn shopId/itemId).
    // 3) Từ originalLink get-link trả về.
    // 4) Decode origin_link trong shopeeLink (an_redir?origin_link=...).
    let ids = extractShopeeIds(resolvedUrl);
    if (!ids && info?.shopId && info?.itemId) {
      ids = { shopId: String(info.shopId), itemId: String(info.itemId) };
    }
    if (!ids && linkResult?.originalLink) {
      ids = extractShopeeIds(linkResult.originalLink);
    }
    if (!ids && linkResult?.shopeeLink) {
      try {
        const u = new URL(linkResult.shopeeLink);
        const origin = u.searchParams.get("origin_link");
        if (origin) ids = extractShopeeIds(decodeURIComponent(origin));
      } catch { /* ignore */ }
    }

    // Chỉ báo lỗi khi KHÔNG có IDs VÀ cũng KHÔNG có link affiliate hợp lệ.
    // (Có shopeeLink là vẫn tạo được link hoàn tiền cho user dù thiếu IDs.)
    if (!ids && !linkResult?.shopeeLink) {
      return NextResponse.json({
        success: false,
        error: "Không thể nhận diện link sản phẩm. Vui lòng thử lại hoặc dán link sản phẩm khác.",
      }, { status: 400 });
    }

    // Tạo clean product URL — có IDs thì chuẩn hoá, không thì dùng link gốc.
    const cleanProductUrl = ids
      ? `https://shopee.vn/product-i.${ids.shopId}.${ids.itemId}`
      : (linkResult?.originalLink || extracted.trim());

    // Ưu tiên link từ GoAffiliate (có voucher Social Media) hoặc AffiPad-style.
    // Nếu linkResult rỗng → ghép tay.
    const affiliateLink = linkResult?.shopeeLink || buildAffiPadStyleLink(cleanProductUrl, user?.id);
    // Link rút gọn đẹp để hiển thị/share (nếu có).
    const shortLink = linkResult?.affiliateLink || affiliateLink;
    // AffiPad-style link luôn có channel_type=fb (voucher Facebook)
    const hasVoucher = true;

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

    const product = {
      name: info?.name || "Sản phẩm Shopee",
      image: info?.image || "",
      price: parsePrice(info?.price || "") || 0,
      originalPrice: 0,
      commission: commissionAmount,
      commissionRate: info?.commissionRate || "",
      cashback,
      cashbackRate, // % thực tế áp dụng cho user (50/53/55/58)
      tierCode,
      tierName,
      affiliateLink,
      shortLink,    // link rút gọn đẹp để share (goaffiliate.online/XXX)
      hasVoucher,   // true nếu link có nhúng voucher Social Media
      productUrl: cleanProductUrl,
      shopId: ids?.shopId ?? "",
      itemId: ids?.itemId ?? "",
      shop: "SHOPEE",
    };

    // Lưu lịch sử tạo link (nếu user đăng nhập). Bảng `affiliate_links`
    // đã được tạo sẵn trong `initSchema()` nên không cần CREATE TABLE ở đây.
    if (user) {
      try {
        const database = await getDb();
        database.run(
          "INSERT INTO affiliate_links (user_id, shop_id, item_id, product_name, product_price, commission, commission_rate, cashback, affiliate_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [user.id, ids?.shopId ?? "", ids?.itemId ?? "", product.name, product.price, product.commission, product.commissionRate, product.cashback, affiliateLink]
        );
        await createNotification(user.id, "✨ Link hoàn tiền đã sẵn sàng!", `Đã tạo link cho "${product.name}". Bấm nút "MUA NGAY" để mở Shopee — nhớ kiểm tra mục "Shopee Voucher" lúc thanh toán để được giảm thêm nếu có. Sau khi nhận hàng, ${product.cashback.toLocaleString("vi-VN")}đ (hoàn tiền ${cashbackRate}%) sẽ tự về ví. Mua sắm vui nhé! 🛍️`, "link");
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
