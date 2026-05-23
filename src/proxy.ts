import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (Next.js 16) — chạy trước mọi request ở Edge runtime.
 *
 * Mục đích:
 *   1. Giới hạn body size cho mutation request (tránh DoS bằng payload lớn).
 *   2. Origin check sơ bộ cho mutation request (CSRF defence-in-depth).
 *   3. Thêm request ID để tracing.
 *
 * Lưu ý: proxy chạy ở Edge runtime → không dùng được node:sqlite hay nodemailer.
 * Authn/authz vẫn đặt ở route handler vì cần đụng DB.
 *
 * Origin check ở đây chỉ chặn các CSRF rõ ràng (cross-origin POST/etc).
 * Authn fine-grained vẫn được requireUser/requireAdmin xử lý.
 *
 * (Renamed from `middleware` per Next 16 file convention.)
 */

const MAX_JSON_BODY = 256 * 1024; // 256 KB — đủ cho mọi form/CSV preview, chặn DoS.
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(request: NextRequest) {
  const { method, nextUrl, headers } = request;

  // 1. Body size guard cho mutation (chỉ khi có Content-Length).
  if (MUTATION_METHODS.has(method)) {
    const len = headers.get("content-length");
    if (len && Number(len) > MAX_JSON_BODY) {
      return NextResponse.json(
        { success: false, error: "Payload quá lớn" },
        { status: 413 },
      );
    }
  }

  // 2. Origin check cho mutation API (CSRF defence-in-depth).
  // Loại trừ login route đầu tiên (chưa có cookie session) → không lấy gì được.
  if (MUTATION_METHODS.has(method) && nextUrl.pathname.startsWith("/api/")) {
    const origin = headers.get("origin");
    const referer = headers.get("referer");
    const expectedHost = nextUrl.host;
    const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);

    let ok = true;
    if (origin) {
      try {
        const o = new URL(origin);
        ok = o.host === expectedHost || allowed.includes(origin);
      } catch { ok = false; }
    } else if (referer) {
      try {
        const r = new URL(referer);
        ok = r.host === expectedHost || allowed.includes(`${r.protocol}//${r.host}`);
      } catch { ok = false; }
    }
    // Không có cả Origin lẫn Referer → có thể là server-side fetch / mobile app —
    // pass tiếp, requireUser/requireAdmin sẽ check cookie.

    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request bị chặn" },
        { status: 403 },
      );
    }
  }

  // 3. Request ID — dùng cho structured logging, dễ trace 1 request qua nhiều log.
  const reqId = headers.get("x-request-id") || crypto.randomUUID();
  const response = NextResponse.next();
  response.headers.set("x-request-id", reqId);
  return response;
}

export const config = {
  // Áp dụng cho mọi route trừ asset Next.js + favicon. Middleware ở Edge → cực nhanh.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|webmanifest)$).*)",
  ],
};
