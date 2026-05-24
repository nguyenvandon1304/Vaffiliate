import type { MetadataRoute } from "next";

/**
 * PWA manifest — cho phép user "Add to Home Screen" trên mobile.
 * Icons sinh từ public/seo/icon.svg qua scripts/generate-icons.mjs
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "V-Affiliate — Hoàn 50% hoa hồng Shopee",
    short_name: "V-Affiliate",
    description: "Tạo link Shopee → mua sắm → tự động hoàn 50% hoa hồng vào ví.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f97316",
    orientation: "portrait",
    lang: "vi",
    icons: [
      {
        src: "/seo/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/seo/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/seo/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
