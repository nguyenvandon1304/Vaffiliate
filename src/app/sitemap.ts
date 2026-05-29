import type { MetadataRoute } from "next";

/**
 * Sitemap — chỉ liệt kê các trang public muốn Google index.
 *
 * KHÔNG đưa /reset-password, /verify-email vào — chúng chỉ truy cập qua link token,
 * disallow trong robots.txt → nếu list trong sitemap sẽ gây mâu thuẫn và
 * Search Console báo "Trang có lệnh chuyển hướng" / "Đã thu thập — chưa lập chỉ mục".
 *
 * Dashboard / admin / api: đã disallow trong robots.txt, không liệt kê ở đây.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://vaffiliate.vn";
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
  ];
}
