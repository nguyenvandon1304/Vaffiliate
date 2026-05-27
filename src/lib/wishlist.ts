/**
 * Wishlist + price tracking.
 *
 * User paste link Shopee → save vào DB với giá hiện tại.
 * Mỗi lần user mở trang wishlist:
 *   - Items có last_checked_at > 6h → re-check giá qua GoAffiliate API
 *   - Nếu giá giảm > 5% so với lowest_price → notification "🔥 Giảm giá!"
 *
 * Lazy check (không cron) — phù hợp Render free tier không có scheduled job.
 * GitHub Actions có thể bổ sung cron mỗi 12h ping endpoint /api/wishlist/refresh
 * để check ngay cả khi user không mở app (đặt sau, không bắt buộc).
 */

import { getDb, createNotification } from "@/lib/db";

const GOAFFILIATE_URL = "https://goaffiliate.online/api/check-commission";
const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6h
const PRICE_DROP_NOTIFY_PERCENT = 5;            // giảm ≥ 5% so với lowest → notify

export interface WishlistItem {
  id: number;
  user_id: number;
  shop_id: string;
  item_id: string;
  product_name: string;
  product_image: string | null;
  product_link: string;
  affiliate_link: string | null;
  initial_price: number;
  current_price: number;
  lowest_price: number;
  commission_rate: string | null;
  last_checked_at: string;
  created_at: string;
  /** Computed: % thay đổi so với initial_price. Âm = giảm giá. */
  priceChangePercent: number;
  /** Computed: stale = cần re-check khi user mở trang. */
  stale: boolean;
}

/* ─────────────── Helpers ─────────────── */

/** Trích shopId/itemId từ URL Shopee (giống logic trong /api/affiliate). */
export function extractShopeeIds(url: string): { shopId: string; itemId: string } | null {
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

/** Parse giá VN format "₫172.000" → 172000. */
function parsePrice(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₫đ,.\s]/g, "");
  return Number(cleaned) || 0;
}

interface ProductInfo {
  name: string;
  image: string;
  price: number;
  commissionRate: string;
  productLink: string;
}

/**
 * Gọi GoAffiliate /api/check-commission để lấy info sản phẩm + giá hiện tại.
 * Trả null nếu API fail (timeout, key invalid, sản phẩm hết) — caller giữ data cũ.
 */
async function fetchProductInfo(productUrl: string): Promise<ProductInfo | null> {
  const apiKey = process.env.GOAFFILIATE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(GOAFFILIATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "Accept": "application/json",
      },
      body: JSON.stringify({ originalLink: productUrl }),
      signal: AbortSignal.timeout(8000), // 8s — wishlist không gấp
    });
    if (!res.ok) return null;

    const data = await res.json();
    const info = data.productInfo ?? data.data ?? data;
    if (!info?.name) return null;

    return {
      name: info.name,
      image: info.image ?? "",
      price: typeof info.price === "string" ? parsePrice(info.price) : Number(info.price ?? 0),
      commissionRate: info.commissionRate ?? "",
      productLink: info.productLink ?? productUrl,
    };
  } catch (e) {
    console.warn("[Wishlist] GoAffiliate fetch failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/* ─────────────── Public API ─────────────── */

export interface AddWishlistResult {
  success: boolean;
  error?: string;
  item?: WishlistItem;
}

/**
 * Add 1 sản phẩm vào wishlist của user. Idempotent:
 *   - Nếu (user, shop, item) đã tồn tại → return existing (không tạo trùng)
 *   - Nếu URL không phải Shopee hợp lệ → error
 *   - Nếu API GoAffiliate down → vẫn lưu với name = "Đang cập nhật..."
 */
export async function addToWishlist(userId: number, productUrl: string): Promise<AddWishlistResult> {
  const cleanUrl = (productUrl || "").trim();
  if (!cleanUrl) return { success: false, error: "Vui lòng nhập link sản phẩm" };

  const ids = extractShopeeIds(cleanUrl);
  if (!ids) {
    return { success: false, error: "Link không phải sản phẩm Shopee hợp lệ" };
  }

  const db = await getDb();

  // Check trùng
  const existing = await db.get(
    "SELECT * FROM wishlist WHERE user_id = ? AND shop_id = ? AND item_id = ?",
    [userId, ids.shopId, ids.itemId],
  );
  if (existing) {
    return { success: false, error: "Sản phẩm đã có trong wishlist" };
  }

  // Lookup info qua GoAffiliate
  const cleanProductUrl = `https://shopee.vn/product-i.${ids.shopId}.${ids.itemId}`;
  const info = await fetchProductInfo(cleanProductUrl);

  const productName = info?.name || "Đang cập nhật...";
  const productImage = info?.image ?? null;
  const price = info?.price ?? 0;
  const commissionRate = info?.commissionRate ?? null;

  await db.run(
    `INSERT INTO wishlist
       (user_id, shop_id, item_id, product_name, product_image, product_link,
        initial_price, current_price, lowest_price, commission_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, ids.shopId, ids.itemId, productName, productImage, cleanProductUrl,
     price, price, price, commissionRate],
  );

  const row = await db.get(
    "SELECT * FROM wishlist WHERE user_id = ? AND shop_id = ? AND item_id = ?",
    [userId, ids.shopId, ids.itemId],
  );
  if (!row) return { success: false, error: "Không thể lưu vào wishlist" };

  return { success: true, item: rowToItem(row) };
}

export async function removeFromWishlist(
  userId: number,
  itemId: number,
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  const r = await db.run(
    "DELETE FROM wishlist WHERE id = ? AND user_id = ?",
    [itemId, userId],
  );
  if (r.changes === 0) {
    return { success: false, error: "Sản phẩm không tồn tại" };
  }
  return { success: true };
}

/**
 * Lấy wishlist của user — kèm flag `stale` cho UI biết item nào cần re-check.
 */
export async function getUserWishlist(userId: number): Promise<WishlistItem[]> {
  const db = await getDb();
  const rows = await db.all(
    "SELECT * FROM wishlist WHERE user_id = ? ORDER BY created_at DESC",
    [userId],
  );
  return rows.map(rowToItem);
}

/**
 * Re-check giá tất cả item stale (last_checked > 6h) của user.
 *
 * Lazy check — chỉ chạy khi user mở trang wishlist (qua API call).
 * Notify nếu giá giảm ≥ 5% so với lowest_price.
 *
 * Trả số item đã update.
 */
export async function refreshStaleItems(userId: number): Promise<{ updated: number; dropped: number }> {
  const db = await getDb();
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();

  const stale = await db.all(
    "SELECT * FROM wishlist WHERE user_id = ? AND last_checked_at < ?",
    [userId, cutoff],
  );

  let updated = 0;
  let dropped = 0;

  // Sequential (không parallel) — tránh hit GoAffiliate quota nhanh.
  for (const row of stale) {
    const productLink = row.product_link as string;
    const info = await fetchProductInfo(productLink);
    if (!info) {
      // Vẫn update last_checked_at để không retry liên tục.
      await db.run(
        "UPDATE wishlist SET last_checked_at = NOW() WHERE id = ?",
        [Number(row.id)],
      );
      continue;
    }

    const newPrice = info.price;
    const oldPrice = Number(row.current_price);
    const lowestPrice = Number(row.lowest_price);
    const newLowest = newPrice > 0 && (lowestPrice === 0 || newPrice < lowestPrice) ? newPrice : lowestPrice;

    await db.run(
      `UPDATE wishlist
       SET product_name = ?, product_image = ?, current_price = ?, lowest_price = ?,
           commission_rate = ?, last_checked_at = NOW()
       WHERE id = ?`,
      [info.name, info.image, newPrice, newLowest, info.commissionRate, Number(row.id)],
    );
    updated++;

    // Notify nếu giảm giá ≥ 5% so với mức thấp nhất từng thấy.
    if (newPrice > 0 && lowestPrice > 0 && newPrice < oldPrice) {
      const dropPercent = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
      if (dropPercent >= PRICE_DROP_NOTIFY_PERCENT) {
        await createNotification(
          userId,
          `🔥 Săn ngay! Giảm sâu ${dropPercent}%`,
          `"${info.name}" vừa giảm từ ${oldPrice.toLocaleString("vi-VN")}đ xuống còn ${newPrice.toLocaleString("vi-VN")}đ! Mở wishlist mua ngay qua link V-Affiliate để vừa hời, vừa được hoàn tiền — cơ hội không thường có đâu nhé! ⚡`,
          "wishlist",
        );
        dropped++;
      }
    }
  }

  return { updated, dropped };
}

function rowToItem(row: Record<string, unknown>): WishlistItem {
  const initial = Number(row.initial_price);
  const current = Number(row.current_price);
  const checked = row.last_checked_at instanceof Date
    ? row.last_checked_at.toISOString()
    : (row.last_checked_at as string);
  const created = row.created_at instanceof Date
    ? row.created_at.toISOString()
    : (row.created_at as string);

  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    shop_id: row.shop_id as string,
    item_id: row.item_id as string,
    product_name: row.product_name as string,
    product_image: (row.product_image as string | null) ?? null,
    product_link: row.product_link as string,
    affiliate_link: (row.affiliate_link as string | null) ?? null,
    initial_price: initial,
    current_price: current,
    lowest_price: Number(row.lowest_price),
    commission_rate: (row.commission_rate as string | null) ?? null,
    last_checked_at: checked,
    created_at: created,
    priceChangePercent: initial > 0 ? Math.round(((current - initial) / initial) * 100) : 0,
    stale: Date.now() - new Date(checked).getTime() > STALE_THRESHOLD_MS,
  };
}
