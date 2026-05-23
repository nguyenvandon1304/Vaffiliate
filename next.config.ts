import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content Security Policy.
 *
 * Cho phép:
 *   - 'self' default
 *   - script: 'self' + Cloudflare Turnstile (challenges.cloudflare.com)
 *     + 'unsafe-inline' cho theme-init script (đã extract ra /public/theme-init.js
 *       nhưng next/script vẫn có thể inject inline cho Hot Reload ở dev — chỉ bật ở dev)
 *   - frame: Turnstile iframe
 *   - connect: Turnstile siteverify (từ server) + self
 *   - img: 'self' + data: + https: (ảnh sản phẩm Shopee từ CDN)
 *   - style: 'self' + 'unsafe-inline' (Tailwind inject runtime + Next/Inter font)
 *   - font: 'self' + data: + Google Fonts CDN
 *
 * Production siết chặt hơn dev (không cho 'unsafe-eval').
 */
function buildCSP(): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'", // Next dùng cho hydration script + một số inline cho theme
      "https://challenges.cloudflare.com",
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "connect-src": ["'self'", "https://challenges.cloudflare.com"],
    "frame-src": ["'self'", "https://challenges.cloudflare.com"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
  };
  if (!isProd) {
    // Dev cần unsafe-eval cho Turbopack HMR.
    directives["script-src"].push("'unsafe-eval'");
  } else {
    // Force HTTPS upgrade cho tất cả request mixed-content.
    directives["upgrade-insecure-requests"] = [];
  }
  return Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");
}

const securityHeaders = [
  // Chống MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Hạn chế thông tin Referer
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Chống clickjacking — thêm cả X-Frame-Options (legacy) + frame-ancestors trong CSP
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Tắt các API trình duyệt nhạy cảm mà app không dùng
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()" },
  // Cross-Origin Opener Policy — cô lập browsing context, chống XS-Leak
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Cross-Origin Resource Policy — chỉ same-origin được fetch resource
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // CSP — defense-in-depth chống XSS
  { key: "Content-Security-Policy", value: buildCSP() },
  // Force HTTPS khi đã ở production
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  // Vercel serverless — KHÔNG dùng standalone (chỉ cho Docker/VPS).
  // output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // postgres-js phải giữ ngoài bundle (dùng Node Buffer + net APIs).
  serverExternalPackages: ["postgres"],
  // React strict mode: phát hiện side-effect bất thường ở dev.
  reactStrictMode: true,
  // Production source maps tắt để giảm size build.
  productionBrowserSourceMaps: false,
  // Compress response (Next mặc định đã bật, khai báo cho rõ).
  compress: true,
  // Loại bỏ powered-by header.
  poweredByHeader: false,
  // Body size limit cho server actions / route handler — chặn DoS payload.
  // Middleware đã limit 256KB, đây là lớp 2 từ Next.
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
