import type { MetadataRoute } from "next";

/**
 * robots.txt — chặn bot index các trang nội bộ (admin, api, page nhạy cảm).
 *
 * Cho phép `/r/*` (referral landing) để bot Facebook / Zalo / Telegram
 * crawl OG meta tags khi user paste link giới thiệu — quan trọng cho viral.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://vaffiliate.vn";

  return {
    rules: [
      {
        userAgent: "*",
        // Cho phép landing + referral pages
        allow: ["/", "/r/"],
        disallow: [
          "/admin",
          "/admin/",
          "/dashboard",
          "/dashboard/",
          "/api/",
          // Reset/verify pages chứa token nhạy cảm — disallow để không lưu vào search results
          "/reset-password",
          "/verify-email",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
