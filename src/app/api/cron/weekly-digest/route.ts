import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sendWeeklyDigestEmail } from "@/lib/email";

/**
 * Weekly digest cron endpoint — gửi email tóm tắt tuần qua cho user active.
 *
 * Schedule: Chủ Nhật 9:00 AM Asia/Ho_Chi_Minh (qua cron-job.org).
 *
 * Auth: protected bằng `CRON_SECRET` env header.
 *   curl -X POST https://vaffiliate.vn/api/cron/weekly-digest \
 *        -H "Authorization: Bearer ${CRON_SECRET}"
 *
 * Logic:
 *   1. Find users đã verify email + có activity trong 30 ngày
 *   2. Compute stats 7 ngày qua từ DB
 *   3. Send digest email
 *   4. Skip user nếu email chưa verify hoặc inactive
 *
 * Performance: process tối đa 100 user/lần để tránh Resend rate limit (10 req/s).
 */
export async function POST(request: NextRequest) {
  // Auth check
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ success: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();

  // Find active users (verified email + login trong 30 ngày)
  const users = await db.all(
    `SELECT id, username, email
     FROM users
     WHERE role = 'user' AND is_active = 1 AND email_verified = 1
       AND last_login >= NOW() - INTERVAL '30 days'
     ORDER BY id ASC
     LIMIT 100`,
    [],
  );

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const u of users) {
    const userId = Number(u.id);
    try {
      // Compute weekly stats
      const stats = await db.get(
        `SELECT
          COALESCE((SELECT SUM(cashback) FROM orders WHERE user_id = $1 AND status = 'Đã hoàn tiền' AND created_at >= NOW() - INTERVAL '7 days'), 0)::int AS week_cashback,
          COALESCE((SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status = 'Đã hoàn tiền' AND created_at >= NOW() - INTERVAL '7 days'), 0)::int AS week_orders,
          COALESCE((SELECT SUM(cashback) FROM orders WHERE user_id = $1 AND status = 'Đã hoàn tiền'), 0)::int AS total_cashback,
          COALESCE((SELECT SUM(CASE WHEN type='credit' THEN amount ELSE -amount END) FROM wallet WHERE user_id = $1), 0)::int AS wallet_balance,
          COALESCE((SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status IN ('Đang xử lý', 'Chờ xác nhận')), 0)::int AS pending_orders,
          COALESCE((SELECT COUNT(*) FROM referrals WHERE referrer_user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'), 0)::int AS new_referrals`,
        [userId],
      );

      // Skip nếu user không có activity tuần qua + không có pending
      const weekActivity =
        Number(stats?.week_cashback ?? 0) > 0 ||
        Number(stats?.pending_orders ?? 0) > 0 ||
        Number(stats?.new_referrals ?? 0) > 0;
      if (!weekActivity) {
        skipped++;
        continue;
      }

      const result = await sendWeeklyDigestEmail(
        String(u.email),
        String(u.username),
        {
          weekCashback: Number(stats?.week_cashback ?? 0),
          weekOrders: Number(stats?.week_orders ?? 0),
          totalCashback: Number(stats?.total_cashback ?? 0),
          walletBalance: Number(stats?.wallet_balance ?? 0),
          pendingOrders: Number(stats?.pending_orders ?? 0),
          newReferrals: Number(stats?.new_referrals ?? 0),
        },
      );

      if (result.success) {
        sent++;
      } else {
        errors.push(`user_id=${userId}: ${result.error}`);
      }

      // Rate limit Resend: 10 req/s → wait 100ms giữa mỗi email
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (e) {
      errors.push(`user_id=${userId}: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  return NextResponse.json({
    success: true,
    processed: users.length,
    sent,
    skipped,
    errors: errors.slice(0, 10), // chỉ trả 10 errors đầu
  });
}
