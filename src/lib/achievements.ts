/**
 * Achievement / Badges system.
 *
 * Cách hoạt động:
 *   - Mỗi badge có code unique + metadata (name, description, icon, color).
 *   - `grantBadge(userId, code)` — idempotent (UNIQUE constraint), insert nếu chưa có.
 *   - Caller hook vào event quan trọng (login, verify email, first order, ...).
 *   - Khi grant thành công → tạo notification user thấy ngay.
 *
 * Database: bảng `user_achievements` đã được tạo trong initSchema.
 */
import { getDb, createNotification } from "@/lib/db";

export type BadgeCode =
  | "first_login"
  | "email_verified"
  | "first_link"
  | "first_order"
  | "first_withdraw"
  | "invite_friend"
  | "tier_55"
  | "top_10";

export interface BadgeMeta {
  code: BadgeCode;
  name: string;
  description: string;
  icon: string;       // emoji để render đơn giản, không cần import lib
  color: string;      // tailwind color stem, vd. "amber", "emerald"
}

/**
 * Catalog tất cả badges. Đặt order theo độ "hiếm" — badges đầu dễ đạt, sau khó hơn.
 * Khi muốn thêm badge mới: thêm vào BadgeCode union + entry trong array này.
 */
export const BADGES: BadgeMeta[] = [
  { code: "first_login",     name: "Tân binh",            description: "Lần đầu đăng nhập V-Affiliate",                icon: "🌱", color: "emerald" },
  { code: "email_verified",  name: "Đã xác minh",         description: "Xác minh email thành công",                    icon: "✉️", color: "blue" },
  { code: "first_link",      name: "Bắt đầu hành trình", description: "Tạo affiliate link đầu tiên",                  icon: "🔗", color: "indigo" },
  { code: "first_order",     name: "Mua hàng đầu",        description: "Đơn hàng cashback đầu tiên đã hoàn tiền",      icon: "🛒", color: "orange" },
  { code: "first_withdraw",  name: "Rút tiền lần đầu",    description: "Rút tiền thành công lần đầu",                  icon: "💰", color: "yellow" },
  { code: "invite_friend",   name: "Người kết nối",       description: "Có ít nhất 1 người được mời active",           icon: "🤝", color: "rose" },
  { code: "tier_55",         name: "VIP 55%",             description: "Đạt mốc 50 người mời active — hoàn 55%",       icon: "💎", color: "amber" },
  { code: "top_10",          name: "Top 10 tháng",        description: "Lọt top 10 leaderboard tháng",                 icon: "🏆", color: "amber" },
];

const BADGE_BY_CODE: Record<BadgeCode, BadgeMeta> = Object.fromEntries(
  BADGES.map((b) => [b.code, b]),
) as Record<BadgeCode, BadgeMeta>;

/**
 * Grant 1 badge cho user. Idempotent — gọi nhiều lần chỉ insert 1 lần
 * (nhờ UNIQUE constraint). Tạo notification khi user vừa earn.
 *
 * Trả về:
 *   - { granted: true } — vừa earn lần đầu
 *   - { granted: false } — đã có sẵn / lỗi DB
 */
export async function grantBadge(
  userId: number,
  code: BadgeCode,
): Promise<{ granted: boolean }> {
  const meta = BADGE_BY_CODE[code];
  if (!meta) return { granted: false };

  const db = await getDb();
  try {
    const result = await db.run(
      "INSERT INTO user_achievements (user_id, badge_code) VALUES (?, ?) ON CONFLICT (user_id, badge_code) DO NOTHING RETURNING id",
      [userId, code],
    );
    // result.changes = 1 nếu vừa insert, 0 nếu đã tồn tại (DO NOTHING).
    if (result.changes > 0) {
      // Notification trong app + log audit.
      await createNotification(
        userId,
        `${meta.icon} Huy hiệu mới đã mở khoá!`,
        `Bạn vừa nhận được huy hiệu "${meta.name}" — ${meta.description}. Tiếp tục bứt phá để sưu tầm thêm nhiều thành tích nữa nhé! 🏅`,
        "achievement",
      );
      return { granted: true };
    }
    return { granted: false };
  } catch (e) {
    console.warn(`[Achievement] grant ${code} failed for user ${userId}:`, e);
    return { granted: false };
  }
}

export interface UserBadge {
  code: BadgeCode;
  name: string;
  description: string;
  icon: string;
  color: string;
  earned: boolean;
  earned_at: string | null;
}

/**
 * Lấy danh sách tất cả badges + trạng thái user đã earn chưa.
 * Dùng cho UI hiển thị grid achievements (cả earned + locked).
 */
export async function getUserBadges(userId: number): Promise<UserBadge[]> {
  const db = await getDb();
  const earned = await db.all(
    "SELECT badge_code, earned_at FROM user_achievements WHERE user_id = ?",
    [userId],
  );
  const earnedMap = new Map<string, Date | string>(
    earned.map((r) => [r.badge_code as string, r.earned_at as Date | string]),
  );

  return BADGES.map((b) => {
    const earnedAt = earnedMap.get(b.code);
    return {
      ...b,
      earned: !!earnedAt,
      earned_at: earnedAt
        ? earnedAt instanceof Date
          ? earnedAt.toISOString()
          : (earnedAt as string)
        : null,
    };
  });
}

/** Đếm số badge đã earn — dùng cho widget profile. */
export async function countUserBadges(userId: number): Promise<number> {
  const db = await getDb();
  const row = await db.get(
    "SELECT COUNT(*) AS c FROM user_achievements WHERE user_id = ?",
    [userId],
  );
  return Number(row?.c ?? 0);
}

/**
 * Helper trigger các badge auto theo state DB hiện tại — gọi mỗi lần user
 * load dashboard để catch up nếu có badge bị bỏ sót (vd. user cũ trước
 * khi feature này deploy).
 */
export async function syncBadgesForUser(userId: number): Promise<void> {
  const db = await getDb();

  // 1. first_login — luôn grant khi gọi hàm này
  await grantBadge(userId, "first_login");

  // 2. email_verified — check users.email_verified
  const u = await db.get(
    "SELECT email_verified FROM users WHERE id = ?",
    [userId],
  );
  if (u && Number(u.email_verified) === 1) {
    await grantBadge(userId, "email_verified");
  }

  // 3. first_link — check affiliate_links có row không
  const link = await db.get(
    "SELECT id FROM affiliate_links WHERE user_id = ? LIMIT 1",
    [userId],
  );
  if (link) await grantBadge(userId, "first_link");

  // 4. first_order — có order trạng thái "Đã hoàn tiền"
  const order = await db.get(
    "SELECT id FROM orders WHERE user_id = ? AND status = 'Đã hoàn tiền' LIMIT 1",
    [userId],
  );
  if (order) await grantBadge(userId, "first_order");

  // 5. first_withdraw — có withdrawal status approved
  const wd = await db.get(
    "SELECT id FROM withdrawals WHERE user_id = ? AND status = 'approved' LIMIT 1",
    [userId],
  );
  if (wd) await grantBadge(userId, "first_withdraw");

  // 6. invite_friend — có ≥ 1 referral với bonus_credited = 1
  const refRow = await db.get(
    "SELECT COUNT(*) AS c FROM referrals WHERE referrer_user_id = ? AND bonus_credited = 1",
    [userId],
  );
  const activeRefs = Number(refRow?.c ?? 0);
  if (activeRefs >= 1) await grantBadge(userId, "invite_friend");

  // 7. tier_55 — đạt milestone (default 50)
  const milestoneStr = await db.get(
    "SELECT value FROM system_settings WHERE key = 'referral_milestone_count'",
    [],
  );
  const milestone = Number(milestoneStr?.value ?? 50);
  if (activeRefs >= milestone) await grantBadge(userId, "tier_55");

  // 8. top_10 — check leaderboard tháng hiện tại
  // Tốn query, chỉ check khi user có ít nhất 1 order tháng này.
  const monthOrder = await db.get(
    "SELECT id FROM orders WHERE user_id = ? AND created_at >= date_trunc('month', NOW()) LIMIT 1",
    [userId],
  );
  if (monthOrder) {
    const top = await db.all(
      `SELECT u.id FROM users u
       LEFT JOIN orders o ON o.user_id = u.id AND o.created_at >= date_trunc('month', NOW())
       GROUP BY u.id
       HAVING COALESCE(SUM(o.cashback), 0) > 0
       ORDER BY COALESCE(SUM(o.cashback), 0) DESC
       LIMIT 10`,
      [],
    );
    if (top.some((r) => Number(r.id) === userId)) {
      await grantBadge(userId, "top_10");
    }
  }
}
