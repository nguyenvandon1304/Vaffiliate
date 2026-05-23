import type { MetadataRoute } from "next";

/**
 * PWA manifest — cho phép user "Add to Home Screen" trên mobile.
 * Icons để trống — bạn nên thêm `public/seo/icon-192.png` và `icon-512.png` sau.
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
      // Các icon này nên thêm vào public/seo/. Để trống vẫn build OK.
      // {
      //   src: "/seo/icon-192.png",
      //   sizes: "192x192",
      //   type: "image/png",
      // },
      // {
      //   src: "/seo/icon-512.png",
      //   sizes: "512x512",
      //   type: "image/png",
      // },
    ],
  };
}
