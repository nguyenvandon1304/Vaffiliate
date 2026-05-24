import type { MetadataRoute } from "next";

/** Sitemap tối giản — chỉ trang public là landing page hiện tại. */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://vaffiliate-app.onrender.com";
  const now = new Date();

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
