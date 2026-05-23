/**
 * CSRF / origin check cho mutating requests.
 *
 * sameSite=lax cookie đã chặn được hầu hết CSRF cross-origin classic, nhưng:
 *   - Một số trình duyệt cũ và iframe legacy có thể bỏ qua.
 *   - Nếu sau này thêm reverse-proxy / dev tunnel với same-site nhầm, sẽ kẹt.
 *
 * Kiểm tra Origin/Referer header so với host của request — phương pháp standard
 * (xem OWASP CSRF Prevention Cheat Sheet, "Verifying Origin With Standard Headers").
 *
 * Áp dụng cho POST/PUT/PATCH/DELETE qua hàm `assertSameOrigin`. GET không cần.
 */

/**
 * Trả về `true` nếu request đến từ cùng origin (hoặc whitelist).
 * Cho phép pass nếu cả 2 header đều thiếu (vd. server-side fetch nội bộ chỉ có cookie).
 */
export function isSameOrigin(request: Request, allowedOrigins?: string[]): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Build danh sách allowed: host của request + ALLOWED_ORIGINS env + override
  const url = new URL(request.url);
  const expected = new Set<string>();
  expected.add(`${url.protocol}//${url.host}`);
  if (process.env.ALLOWED_ORIGINS) {
    for (const o of process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)) {
      expected.add(o);
    }
  }
  if (allowedOrigins) {
    for (const o of allowedOrigins) expected.add(o);
  }

  // Có Origin → so trực tiếp.
  if (origin) {
    return expected.has(origin);
  }
  // Không có Origin (một số trình duyệt cũ) → fallback sang Referer.
  if (referer) {
    try {
      const ref = new URL(referer);
      return expected.has(`${ref.protocol}//${ref.host}`);
    } catch {
      return false;
    }
  }
  // Không có cả Origin lẫn Referer → khả năng cao là server-side fetch / curl.
  // Cho phép pass — sẽ vẫn cần cookie hợp lệ để đi qua requireUser.
  return true;
}

/**
 * Helper dùng trong API route. Nếu origin không khớp → trả Response 403 luôn.
 *   const denied = assertSameOrigin(request);
 *   if (denied) return denied;
 */
export function assertSameOrigin(request: Request): Response | null {
  if (isSameOrigin(request)) return null;
  return new Response(
    JSON.stringify({ success: false, error: "Origin không hợp lệ" }),
    { status: 403, headers: { "Content-Type": "application/json" } },
  );
}
