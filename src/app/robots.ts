import type { MetadataRoute } from "next";

/**
 * robots.txt — chặn bot index các trang nội bộ (admin, api, các page có session).
 *
 * `BASE_URL` từ env, fallback v-affiliate.vn để build OK ngay cả khi quên set.
 * Sitemap trỏ về cùng host để Google biết file sitemap ở đâu.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://v-affiliate.vn";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/admin",
          "/admin/",
          "/dashboard",
          "/dashboard/",
          "/api/",
          "/reset-password",
          "/verify-email",
          "/r/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
