import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { blockIp, unblockIp } from "@/lib/geo";

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
  const reason = String(body.reason ?? "Manual block by admin");
  const hours = Math.min(Math.max(Number(body.hours ?? 24), 1), 720); // max 30 ngày

  if (!ip) {
    return NextResponse.json({ success: false, error: "Thiếu IP" }, { status: 400 });
  }

  await blockIp(ip, reason, hours);
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

  await unblockIp(ip);
  return NextResponse.json({ success: true, message: `Đã unblock IP ${ip}` });
}
