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
