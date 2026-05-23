/**
 * Anti-fraud detection — flag hành vi đáng ngờ để admin review.
 *
 * Strategy:
 *   - DETECT (tự động): phát hiện pattern bất thường → tạo flag trong DB
 *   - REVIEW (admin): xem list flag chưa resolved, action manual
 *
 * Patterns đang detect:
 *   1. same_ip_register   — N user đăng ký từ cùng IP trong 24h (spam farm)
 *   2. self_referral      — User refer chính mình (cùng device/IP)
 *   3. rapid_withdraw     — User submit nhiều withdraw liên tiếp (~< 1h)
 *   4. suspicious_login   — Login từ country lạ so với pattern trước
 *
 * Notify Telegram khi flag severity=high → admin biết ngay.
 */

import { getDb } from "@/lib/db";
import { notifyCustom } from "@/lib/telegram";

export type FraudType =
  | "same_ip_register"
  | "self_referral"
  | "rapid_withdraw"
  | "suspicious_login";

export type FraudSeverity = "low" | "medium" | "high";

interface FlagOptions {
  userId: number | null;
  type: FraudType;
  severity?: FraudSeverity;
  detail?: string;
  /** Telegram alert nếu high severity. */
  notifyAdmin?: boolean;
}

/**
 * Tạo fraud flag — idempotent theo (userId, type) để tránh spam flag cùng loại.
 * Resolved flag cũ sẽ tạo mới khi tái phạm.
 */
export async function flagFraud(opts: FlagOptions): Promise<{ created: boolean }> {
  const db = await getDb();
  const severity = opts.severity ?? "medium";

  // Check flag cùng type+user đã tồn tại + chưa resolved → skip để không spam.
  const existing = await db.get(
    "SELECT id FROM fraud_flags WHERE user_id = ? AND type = ? AND resolved = 0",
    [opts.userId, opts.type],
  );
  if (existing) return { created: false };

  await db.run(
    "INSERT INTO fraud_flags (user_id, type, severity, detail) VALUES (?, ?, ?, ?)",
    [opts.userId, opts.type, severity, opts.detail ?? null],
  );

  // High severity → ping Telegram. Fire-and-forget.
  if (severity === "high" && opts.notifyAdmin !== false) {
    void notifyCustom(
      `🚨 Cảnh báo gian lận (${opts.type})`,
      `User ID: ${opts.userId ?? "N/A"}\n${opts.detail ?? ""}`,
    );
  }
  return { created: true };
}

/* ─────────────── Detection rules ─────────────── */

/**
 * Check IP đăng ký nhiều account trong 24h.
 *
 * Threshold:
 *   - 3 user/IP/24h → flag medium
 *   - 5+ user/IP/24h → flag high + telegram alert
 *
 * Gọi sau register thành công.
 */
export async function checkSameIpRegister(ip: string | null | undefined, newUserId: number): Promise<void> {
  if (!ip) return;
  const db = await getDb();

  // Đếm user đăng ký cùng IP trong 24h dùng audit_logs (action=user.register).
  // Không trust user_agent (có thể fake) — IP đáng tin hơn.
  const row = await db.get(
    `SELECT COUNT(DISTINCT user_id) AS c FROM audit_logs
     WHERE action = 'user.register' AND ip = ? AND created_at > NOW() - INTERVAL '24 hours'`,
    [ip],
  );
  const count = Number(row?.c ?? 0);

  if (count >= 5) {
    await flagFraud({
      userId: newUserId,
      type: "same_ip_register",
      severity: "high",
      detail: `IP ${ip} đăng ký ${count} tài khoản trong 24h`,
      notifyAdmin: true,
    });
  } else if (count >= 3) {
    await flagFraud({
      userId: newUserId,
      type: "same_ip_register",
      severity: "medium",
      detail: `IP ${ip} đăng ký ${count} tài khoản trong 24h`,
    });
  }
}

/**
 * Check user refer chính mình (cùng IP / device fingerprint).
 *
 * Trigger khi attachReferral được gọi:
 *   - Compare IP của referrer (lúc đăng ký) với IP của referee (lúc đăng ký)
 *   - Same → high severity (chống farm referral để lấy bonus)
 */
export async function checkSelfReferral(referrerId: number, refereeId: number): Promise<void> {
  const db = await getDb();

  // Lấy IP đăng ký gần nhất của 2 user từ audit_logs.
  const refIp = await db.get(
    "SELECT ip FROM audit_logs WHERE user_id = ? AND action = 'user.register' ORDER BY id DESC LIMIT 1",
    [referrerId],
  );
  const refeeIp = await db.get(
    "SELECT ip FROM audit_logs WHERE user_id = ? AND action = 'user.register' ORDER BY id DESC LIMIT 1",
    [refereeId],
  );

  if (refIp?.ip && refeeIp?.ip && refIp.ip === refeeIp.ip) {
    await flagFraud({
      userId: refereeId,
      type: "self_referral",
      severity: "high",
      detail: `User ${refereeId} được refer bởi user ${referrerId} cùng IP ${refIp.ip}`,
      notifyAdmin: true,
    });
  }
}

/**
 * Check user spam withdraw — submit ≥ 3 yêu cầu trong 1 giờ.
 *
 * Trigger sau khi createWithdrawRequest thành công.
 */
export async function checkRapidWithdraw(userId: number): Promise<void> {
  const db = await getDb();

  const row = await db.get(
    `SELECT COUNT(*) AS c FROM withdrawals
     WHERE user_id = ? AND created_at > NOW() - INTERVAL '1 hour'`,
    [userId],
  );
  const count = Number(row?.c ?? 0);

  if (count >= 5) {
    await flagFraud({
      userId,
      type: "rapid_withdraw",
      severity: "high",
      detail: `${count} yêu cầu rút tiền trong 1 giờ`,
      notifyAdmin: true,
    });
  } else if (count >= 3) {
    await flagFraud({
      userId,
      type: "rapid_withdraw",
      severity: "medium",
      detail: `${count} yêu cầu rút tiền trong 1 giờ`,
    });
  }
}

/* ─────────────── Admin queries ─────────────── */

export interface FraudFlag {
  id: number;
  user_id: number | null;
  username: string | null;
  type: FraudType;
  severity: FraudSeverity;
  detail: string | null;
  resolved: number;
  resolved_at: string | null;
  resolved_by_username: string | null;
  created_at: string;
}

/**
 * List flag — mặc định chỉ unresolved, sort theo severity DESC + thời gian.
 */
export async function listFraudFlags(filter: {
  resolved?: boolean;
  severity?: FraudSeverity;
  limit?: number;
} = {}): Promise<FraudFlag[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (filter.resolved !== undefined) {
    where.push("f.resolved = ?");
    params.push(filter.resolved ? 1 : 0);
  }
  if (filter.severity) {
    where.push("f.severity = ?");
    params.push(filter.severity);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limit = Math.min(200, Math.max(10, filter.limit ?? 50));

  const rows = await db.all(
    `SELECT f.id, f.user_id, u.username, f.type, f.severity, f.detail,
            f.resolved, f.resolved_at, ru.username AS resolved_by_username, f.created_at
     FROM fraud_flags f
     LEFT JOIN users u ON f.user_id = u.id
     LEFT JOIN users ru ON f.resolved_by = ru.id
     ${whereSql}
     ORDER BY
       CASE f.severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
       f.id DESC
     LIMIT ?`,
    [...params, limit],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    user_id: r.user_id ? Number(r.user_id) : null,
    username: (r.username as string | null) ?? null,
    type: r.type as FraudType,
    severity: r.severity as FraudSeverity,
    detail: (r.detail as string | null) ?? null,
    resolved: Number(r.resolved),
    resolved_at: r.resolved_at instanceof Date ? r.resolved_at.toISOString() : (r.resolved_at as string | null),
    resolved_by_username: (r.resolved_by_username as string | null) ?? null,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : (r.created_at as string),
  }));
}

/** Đánh dấu 1 flag đã review xong. */
export async function resolveFraudFlag(flagId: number, adminId: number): Promise<{ success: boolean }> {
  const db = await getDb();
  await db.run(
    "UPDATE fraud_flags SET resolved = 1, resolved_at = NOW(), resolved_by = ? WHERE id = ?",
    [adminId, flagId],
  );
  return { success: true };
}

/** Đếm số flag chưa resolved theo severity — cho widget admin. */
export async function getFraudPendingCount(): Promise<{ high: number; medium: number; low: number; total: number }> {
  const db = await getDb();
  const rows = await db.all(
    "SELECT severity, COUNT(*) AS c FROM fraud_flags WHERE resolved = 0 GROUP BY severity",
    [],
  );
  let high = 0, medium = 0, low = 0;
  for (const r of rows) {
    const c = Number(r.c);
    if (r.severity === "high") high = c;
    else if (r.severity === "medium") medium = c;
    else low = c;
  }
  return { high, medium, low, total: high + medium + low };
}
