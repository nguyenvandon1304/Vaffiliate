/**
 * Helpers validate URL Shopee — allowlist hostname để CHỐNG SSRF.
 *
 * Lý do: trước đây code dùng `url.includes("shopee.vn")` → path/query có thể
 * chứa "shopee.vn" để lừa qua (vd `https://attacker.internal/?x=shopee.vn`),
 * kết hợp `redirect: follow` → server có thể bị ép fetch địa chỉ nội bộ.
 * Dùng `new URL()` + so khớp hostname chính xác để loại bỏ rủi ro này.
 */

/** Hostname Shopee hợp lệ (sản phẩm + short link). */
export const SHOPEE_HOSTS = new Set([
  "shopee.vn",
  "www.shopee.vn",
  "s.shopee.vn",
  "shope.ee",
  "shp.ee",
]);

/** Hostname short-link cần resolve. */
export const SHOPEE_SHORT_HOSTS = new Set(["s.shopee.vn", "shope.ee", "shp.ee"]);

/** Lấy hostname (lowercase) từ URL; null nếu không parse được. */
export function getHost(url: string): string | null {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** True nếu URL trỏ tới đúng một hostname Shopee hợp lệ. */
export function isShopeeHost(url: string): boolean {
  const h = getHost(url);
  return !!h && SHOPEE_HOSTS.has(h);
}

/** True nếu URL là short-link Shopee cần resolve. */
export function isShopeeShortHost(url: string): boolean {
  const h = getHost(url);
  return !!h && SHOPEE_SHORT_HOSTS.has(h);
}

/**
 * Trích URL Shopee đầu tiên từ một đoạn text bất kỳ.
 *
 * Lý do: trên Android, nút "Chia sẻ" của app Shopee copy CẢ đoạn mô tả kèm link
 * (vd "Quạt mini... https://s.shopee.vn/abc xem ngay!"). Khi đó `new URL(text)`
 * sẽ văng lỗi → user bị báo "Chỉ hỗ trợ link từ Shopee" dù link hợp lệ.
 *
 * Hàm này quét text, tìm chuỗi http(s)://... trỏ tới đúng host Shopee và trả về
 * link sạch đó. Trả null nếu không tìm thấy link Shopee nào.
 */
export function extractShopeeUrl(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  // Nếu cả chuỗi đã là 1 URL Shopee hợp lệ (có scheme) → trả luôn (giữ query).
  if (/^https?:\/\//i.test(trimmed) && isShopeeHost(trimmed) && !/\s/.test(trimmed)) {
    return trimmed;
  }

  // Quét mọi cụm http(s)://... trong text, chọn cụm đầu tiên là host Shopee.
  const matches = trimmed.match(/https?:\/\/[^\s"'<>]+/gi);
  if (matches) {
    for (const m of matches) {
      // Bỏ dấu câu dính cuối (., ,, ), …) thường gặp khi copy từ text.
      const cleaned = m.replace(/[).,;!?]+$/, "");
      if (isShopeeHost(cleaned)) return cleaned;
    }
  }

  // Trường hợp không có "http" (vd dán "s.shopee.vn/abc") — thêm scheme rồi check.
  const hostMatch = trimmed.match(/(?:www\.|s\.)?(?:shopee\.vn|shope\.ee|shp\.ee)\/[^\s"'<>]+/i);
  if (hostMatch) {
    const candidate = `https://${hostMatch[0].replace(/[).,;!?]+$/, "")}`;
    if (isShopeeHost(candidate)) return candidate;
  }

  return null;
}
