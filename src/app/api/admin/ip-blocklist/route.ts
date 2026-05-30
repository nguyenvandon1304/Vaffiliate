import { NextRequest, NextResponse } from "next/server";
import { getDb, logAudit } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { blockIp, unblockIp } from "@/lib/geo";
import { getClientIp } from "@/lib/turnstile";

/** Validate IPv4 hoặc IPv6 cơ bản — chống ghi rác vào blocklist. */
function isValidIp(ip: string): boolean {
  if (ip.length > 45) return false;
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4.test(ip)) {
    return ip.split(".").every((o) => Number(o) >= 0 && Number(o) <= 255);
  }
  // IPv6: chấp nhận hex + dấu hai chấm (kiểm tra cơ bản, không quá nghiêm).
  return /^[0-9a-fA-F:]+$/.test(ip) && ip.includes(":");
}

/**
 * GET /api/admin/ip-blocklist
 * Danh sách IP đang bị block + đã expire.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const db = await getDb();
  const rows = await db.all(
    `SELECT id, ip, reason, blocked_until, fail_count, created_at,
       (blocked_until IS NULL OR blocked_until > NOW()) AS is_active
     FROM ip_blocklist
     ORDER BY id DESC
     LIMIT 200`,
  );
  return NextResponse.json({ success: true, rows });
}

/**
 * POST /api/admin/ip-blocklist  body: { ip, reason?, hours? }
 * Manual block IP.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));
  const ip = String(body.ip ?? "").trim();
  const reason = String(body.reason ?? "Manual block by admin").slice(0, 200);
  const hours = Math.min(Math.max(Number(body.hours ?? 24), 1), 720); // max 30 ngày

  if (!ip) {
    return NextResponse.json({ success: false, error: "Thiếu IP" }, { status: 400 });
  }
  if (!isValidIp(ip)) {
    return NextResponse.json({ success: false, error: "Địa chỉ IP không hợp lệ" }, { status: 400 });
  }

  await blockIp(ip, reason, hours);
  await logAudit("admin.ip.block", {
    userId: auth.user.id,
    target: `ip=${ip}`,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
    detail: `reason=${reason}, hours=${hours}`,
  });
  return NextResponse.json({ success: true, message: `Đã block IP ${ip} trong ${hours}h` });
}

/**
 * DELETE /api/admin/ip-blocklist?ip=xxx
 * Unblock IP.
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const { searchParams } = new URL(request.url);
  const ip = searchParams.get("ip");
  if (!ip) {
    return NextResponse.json({ success: false, error: "Thiếu IP" }, { status: 400 });
  }
  if (!isValidIp(ip)) {
    return NextResponse.json({ success: false, error: "Địa chỉ IP không hợp lệ" }, { status: 400 });
  }

  await unblockIp(ip);
  await logAudit("admin.ip.unblock", {
    userId: auth.user.id,
    target: `ip=${ip}`,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ success: true, message: `Đã unblock IP ${ip}` });
}
