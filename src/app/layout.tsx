import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import ChatButton from "@/components/ChatButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://v-affiliate.vn";

/**
 * Site-wide metadata. Áp dụng cho mọi trang trừ khi page override.
 *
 * `metadataBase` là gốc cho mọi đường dẫn tương đối trong open graph/twitter card —
 * cần thiết khi crawler resolve `image` thành full URL.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "V-Affiliate — Hoàn 50% hoa hồng Shopee",
    template: "%s | V-Affiliate",
  },
  description: "Tạo link Shopee → mua sắm như bình thường → tự động hoàn 50% hoa hồng vào ví. Mời bạn bè để nâng tier lên 55%.",
  keywords: ["v-affiliate", "shopee affiliate", "hoàn tiền", "cashback", "hoa hồng shopee", "mua hàng hoàn tiền"],
  authors: [{ name: "V-Affiliate Team" }],
  applicationName: "V-Affiliate",
  generator: "Next.js",
  referrer: "strict-origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: SITE_URL,
    siteName: "V-Affiliate",
    title: "V-Affiliate — Hoàn 50% hoa hồng Shopee",
    description: "Tạo link Shopee → mua sắm → tự động hoàn 50% hoa hồng vào ví.",
  },
  twitter: {
    card: "summary_large_image",
    title: "V-Affiliate — Hoàn 50% hoa hồng Shopee",
    description: "Tạo link Shopee → mua sắm → tự động hoàn 50% hoa hồng vào ví.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  // Cho phép app render edge-to-edge trên iOS PWA / Android.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        {/*
         * Script chống FOUC: áp class `dark` lên <html> trước khi React hydrate.
         * Đặt ở /public/theme-init.js (file static) + dùng `next/script`
         * strategy="beforeInteractive" → Next chèn ra ngoài React tree, không
         * gây hydration mismatch (lỗi hay gặp khi inline trong <head>).
         */}
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <ThemeToggle />
        <ToastProvider>
          {children}
        </ToastProvider>
        <ChatButton />
      </body>
    </html>
  );
}
