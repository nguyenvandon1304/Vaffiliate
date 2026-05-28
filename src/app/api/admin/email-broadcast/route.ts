import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb, logAudit } from "@/lib/db";
import { getClientIp } from "@/lib/turnstile";
import { sendBroadcastEmail } from "@/lib/email";

/**
 * POST /api/admin/email-broadcast
 *   body {
 *     subject: string,
 *     bodyHtml: string,
 *     targetRole?: "all" | "user" | "admin",
 *     onlyVerified?: boolean,    // chỉ gửi user đã verify email
 *     onlyActive?: boolean,      // chỉ user is_active = 1
 *     limit?: number             // hard cap, mặc định 500
 *   }
 *
 * Gửi mass email qua Resend HTTPS API.
 * Throttle 100ms/email để không hit rate limit Resend (10 req/s).
 *
 * Security:
 * - Yêu cầu admin
 * - Cap mặc định 500/lần (Resend free 100/ngày, paid 50k/tháng)
 * - Audit log
 * - Skip user không có email hoặc chưa verify (nếu onlyVerified)
 */

interface EmailBroadcastBody {
  subject?: string;
  bodyHtml?: string;
  targetRole?: "all" | "user" | "admin";
  onlyVerified?: boolean;
  onlyActive?: boolean;
  limit?: number;
}

interface UserRow {
  id: number;
  username: string;
  email: string | null;
  display_name: string | null;
}

const HARD_CAP = 1000;

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const body = (await request.json().catch(() => ({}))) as EmailBroadcastBody;
  const subject = String(body.subject ?? "").trim();
  const bodyHtml = String(body.bodyHtml ?? "").trim();
  const targetRole = body.targetRole === "user" || body.targetRole === "admin" || body.targetRole === "all" ? body.targetRole : "all";
  const onlyVerified = body.onlyVerified !== false; // default true
  const onlyActive = body.onlyActive !== false;     // default true
  const limit = Math.min(Math.max(1, Number(body.limit) || 500), HARD_CAP);

  if (!subject || subject.length > 200) {
    return NextResponse.json({ success: false, error: "Subject bắt buộc, tối đa 200 ký tự" }, { status: 400 });
  }
  if (!bodyHtml || bodyHtml.length > 10000) {
    return NextResponse.json({ success: false, error: "Nội dung bắt buộc, tối đa 10000 ký tự HTML" }, { status: 400 });
  }

  // Build query với placeholder ? (adapter convert sang $1, $2...)
  const conditions: string[] = ["email IS NOT NULL", "email != ''"];
  const params: (string | number)[] = [];
  if (targetRole === "user") conditions.push("role = 'user'");
  else if (targetRole === "admin") conditions.push("role = 'admin'");
  if (onlyActive) conditions.push("is_active = 1");
  if (onlyVerified) conditions.push("email_verified = 1");

  const where = conditions.join(" AND ");
  const db = await getDb();
  const rows = (await db.all(
    `SELECT id, username, email, display_name FROM users WHERE ${where} ORDER BY id ASC LIMIT ?`,
    [...params, limit],
  )) as unknown as UserRow[];

  if (rows.length === 0) {
    return NextResponse.json({ success: false, error: "Không có user nào match filter" }, { status: 400 });
  }

  // Send sequential với 100ms delay → ~10 email/s, an toàn cho Resend.
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const u of rows) {
    if (!u.email) { failed++; continue; }
    const name = u.display_name || u.username;
    const result = await sendBroadcastEmail(u.email, name, subject, bodyHtml);
    if (result.success) {
      sent++;
    } else {
      failed++;
      if (errors.length < 5) errors.push(`${u.email}: ${result.error}`);
    }
    // Throttle ~10 email/s
    if (sent + failed < rows.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  await logAudit("admin.email_broadcast", {
    userId: auth.user.id,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
    detail: `target=${targetRole}; sent=${sent}; failed=${failed}; subject=${subject.slice(0, 80)}`,
  });

  return NextResponse.json({
    success: true,
    total: rows.length,
    sent,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  });
}

/**
 * GET /api/admin/email-broadcast?targetRole=...&onlyVerified=1&onlyActive=1
 * Preview số lượng user sẽ được gửi (KHÔNG gửi).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const url = new URL(request.url);
  const targetRole = url.searchParams.get("targetRole") || "all";
  const onlyVerified = url.searchParams.get("onlyVerified") !== "0";
  const onlyActive = url.searchParams.get("onlyActive") !== "0";

  const conditions: string[] = ["email IS NOT NULL", "email != ''"];
  if (targetRole === "user") conditions.push("role = 'user'");
  else if (targetRole === "admin") conditions.push("role = 'admin'");
  if (onlyActive) conditions.push("is_active = 1");
  if (onlyVerified) conditions.push("email_verified = 1");

  const db = await getDb();
  const result = (await db.get(
    `SELECT COUNT(*)::int as cnt FROM users WHERE ${conditions.join(" AND ")}`,
    [],
  )) as { cnt: number } | null;

  return NextResponse.json({ success: true, count: result?.cnt ?? 0 });
}
