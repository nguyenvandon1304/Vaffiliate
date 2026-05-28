import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb, logAudit } from "@/lib/db";
import { getClientIp } from "@/lib/turnstile";

interface BulkRequest {
  userIds: number[];
  action: "block" | "unblock" | "verify_email" | "delete";
}

/**
 * POST /api/admin/users/bulk — bulk action trên nhiều user cùng lúc.
 *
 * Body: { userIds: [1, 2, 3], action: "block" | "unblock" | "verify_email" | "delete" }
 *
 * Limit: max 100 users/lần để tránh DB overload.
 * Audit: log mỗi bulk action.
 *
 * Safety: KHÔNG cho phép affect admin role. KHÔNG cho phép self-action (tự block mình).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  let body: BulkRequest;
  try {
    body = (await request.json()) as BulkRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Body không hợp lệ" }, { status: 400 });
  }

  const userIds = (body.userIds || []).filter((id) => Number.isFinite(id) && id > 0);
  const action = body.action;

  if (userIds.length === 0) {
    return NextResponse.json({ success: false, error: "Không có user nào được chọn" }, { status: 400 });
  }
  if (userIds.length > 100) {
    return NextResponse.json({ success: false, error: "Tối đa 100 user/lần" }, { status: 400 });
  }
  if (!["block", "unblock", "verify_email", "delete"].includes(action)) {
    return NextResponse.json({ success: false, error: "Action không hợp lệ" }, { status: 400 });
  }

  // Filter out self (safety)
  const safeUserIds = userIds.filter((id) => id !== auth.user!.id);
  if (safeUserIds.length === 0) {
    return NextResponse.json({ success: false, error: "Không thể tự áp dụng action lên chính mình" }, { status: 400 });
  }

  // Build IN clause với placeholder `?` (adapter tự convert sang $1, $2...)
  const placeholders = safeUserIds.map(() => "?").join(",");

  const db = await getDb();
  // Exclude any admins
  const adminCheck = await db.all(
    `SELECT id FROM users WHERE id IN (${placeholders}) AND role = 'admin'`,
    safeUserIds,
  );
  const adminIds = new Set(adminCheck.map((r) => Number(r.id)));
  const finalIds = safeUserIds.filter((id) => !adminIds.has(id));

  if (finalIds.length === 0) {
    return NextResponse.json({ success: false, error: "Tất cả user được chọn đều là admin (skip)" }, { status: 400 });
  }

  const finalPh = finalIds.map(() => "?").join(",");

  let affected = 0;
  try {
    if (action === "block") {
      const result = await db.run(
        `UPDATE users SET is_active = 0, updated_at = NOW() WHERE id IN (${finalPh})`,
        finalIds,
      );
      affected = result.changes;
      // Revoke sessions
      await db.run(`DELETE FROM sessions WHERE user_id IN (${finalPh})`, finalIds);
    } else if (action === "unblock") {
      const result = await db.run(
        `UPDATE users SET is_active = 1, updated_at = NOW() WHERE id IN (${finalPh})`,
        finalIds,
      );
      affected = result.changes;
    } else if (action === "verify_email") {
      const result = await db.run(
        `UPDATE users SET email_verified = 1, updated_at = NOW() WHERE id IN (${finalPh})`,
        finalIds,
      );
      affected = result.changes;
    } else if (action === "delete") {
      // Soft delete: set is_active = 0 + clear email + clear personal data
      // NOT physical delete để không break foreign keys (orders, wallet, etc.)
      const result = await db.run(
        `UPDATE users SET is_active = 0,
                          email = CONCAT('deleted_', id, '@deleted.local'),
                          phone = NULL,
                          display_name = NULL,
                          updated_at = NOW()
         WHERE id IN (${finalPh})`,
        finalIds,
      );
      affected = result.changes;
      await db.run(`DELETE FROM sessions WHERE user_id IN (${finalPh})`, finalIds);
    }
  } catch (e) {
    console.error("[bulk]", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Lỗi DB" },
      { status: 500 },
    );
  }

  await logAudit(`admin.bulk_${action}`, {
    userId: auth.user.id,
    detail: `count=${affected}; ids=${finalIds.slice(0, 10).join(",")}${finalIds.length > 10 ? "..." : ""}`,
    ip: getClientIp(request.headers),
  });

  return NextResponse.json({
    success: true,
    affected,
    skipped: userIds.length - finalIds.length,
  });
}
