/**
 * Hệ thống cấp bậc (Bronze / Silver / Gold / VIP).
 *
 * User đạt tier khi đáp ứng **1 trong 2** điều kiện (orders HOẶC referrals),
 * không cần cả 2 — flexible cho user mua nhiều, hoặc chuyên mời bạn.
 *
 * Cashback rate phụ thuộc tier:
 *   Bronze 50% → Silver 53% → Gold 55% → VIP 58%
 *
 * Threshold + rate có thể chỉnh qua settings — admin tinh chỉnh không cần redeploy.
 */

import { getDb, getSetting, createNotification } from "@/lib/db";

export type TierCode = "bronze" | "silver" | "gold" | "vip";

export interface Tier {
  code: TierCode;
  name: string;
  icon: string;
  /** Tailwind color stem cho UI (vd. "amber" → bg-amber-500). */
  color: string;
  /** Ngưỡng đơn "Đã hoàn tiền" để đạt tier này. */
  minOrders: number;
  /** Ngưỡng bạn mời active để đạt tier này. */
  minReferrals: number;
  /** % cashback cho commission. */
  cashbackPercent: number;
}

/**
 * Tier catalog — order theo level. Bronze level 0, VIP level 3.
 *
 * Settings overrides:
 *   tier_silver_orders, tier_silver_referrals, tier_silver_percent
 *   tier_gold_orders,   tier_gold_referrals,   tier_gold_percent
 *   tier_vip_orders,    tier_vip_referrals,    tier_vip_percent
 *   cashback_base_percent (Bronze)
 */
const DEFAULT_TIERS: Tier[] = [
  { code: "bronze", name: "Bronze", icon: "🥉", color: "amber",   minOrders: 0,   minReferrals: 0,   cashbackPercent: 50 },
  { code: "silver", name: "Silver", icon: "🥈", color: "slate",   minOrders: 50,  minReferrals: 25,  cashbackPercent: 53 },
  { code: "gold",   name: "Gold",   icon: "🥇", color: "yellow",  minOrders: 100, minReferrals: 50,  cashbackPercent: 55 },
  { code: "vip",    name: "VIP",    icon: "💎", color: "amber",  minOrders: 300, minReferrals: 100, cashbackPercent: 58 },
];

/**
 * Đọc tier config từ settings. Nếu setting chưa có → dùng default.
 * Cache trong memory tối đa 60s để tránh hit DB liên tục cho mỗi request
 * (admin đổi setting cũng đợi 1 phút mới áp dụng — chấp nhận được).
 */
let cachedTiers: { tiers: Tier[]; expiresAt: number } | null = null;
const TIER_CACHE_MS = 60_000;

export async function getTiers(): Promise<Tier[]> {
  if (cachedTiers && Date.now() < cachedTiers.expiresAt) {
    return cachedTiers.tiers;
  }

  // Bronze: dùng cashback_base_percent (giữ tương thích setting cũ).
  const bronzePercent = Number(await getSetting("cashback_base_percent")) || 50;

  const tiers: Tier[] = await Promise.all(
    DEFAULT_TIERS.map(async (t) => {
      if (t.code === "bronze") {
        return { ...t, cashbackPercent: bronzePercent };
      }
      const ordersStr = await getSetting(`tier_${t.code}_orders`);
      const refsStr = await getSetting(`tier_${t.code}_referrals`);
      const percentStr = await getSetting(`tier_${t.code}_percent`);
      return {
        ...t,
        minOrders: ordersStr ? Number(ordersStr) : t.minOrders,
        minReferrals: refsStr ? Number(refsStr) : t.minReferrals,
        cashbackPercent: percentStr ? Number(percentStr) : t.cashbackPercent,
      };
    }),
  );

  cachedTiers = { tiers, expiresAt: Date.now() + TIER_CACHE_MS };
  return tiers;
}

/** Reset cache — gọi sau khi admin save settings tier. */
export function clearTierCache(): void {
  cachedTiers = null;
}

export interface UserTierInfo {
  /** Tier hiện tại. */
  current: Tier;
  /** Tier kế tiếp (null nếu đã VIP). */
  next: Tier | null;
  /** Số đơn hoàn tiền hiện tại. */
  ordersCount: number;
  /** Số bạn mời active hiện tại. */
  referralsCount: number;
  /** Tiến độ tới next tier (0-100, lấy max của 2 trục). */
  progressPercent: number;
  /** Còn thiếu bao nhiêu đơn để lên tier kế. */
  ordersToNext: number;
  /** Còn thiếu bao nhiêu referral. */
  referralsToNext: number;
  /** % cashback hiện tại. */
  cashbackPercent: number;
}

/**
 * Tính tier hiện tại của user dựa trên data thực.
 *
 * Quy tắc match:
 *   - Bronze: default
 *   - Silver/Gold/VIP: orders >= minOrders OR referrals >= minReferrals
 *   - Lấy tier cao nhất user qualified (vd. user có 100 đơn → Gold, dù 0 referral)
 */
export async function getUserTier(userId: number): Promise<UserTierInfo> {
  const db = await getDb();
  const row = await db.get(
    `SELECT
      COALESCE((SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status = 'Đã hoàn tiền'), 0) AS orders_count,
      COALESCE((SELECT COUNT(*) FROM referrals WHERE referrer_user_id = $1 AND bonus_credited = 1), 0) AS referrals_count`,
    [userId],
  );
  const ordersCount = Number(row?.orders_count ?? 0);
  const referralsCount = Number(row?.referrals_count ?? 0);

  const tiers = await getTiers();

  // Tìm tier cao nhất user qualified — duyệt từ VIP xuống.
  let current = tiers[0]; // Bronze fallback
  for (let i = tiers.length - 1; i >= 0; i--) {
    const t = tiers[i];
    if (ordersCount >= t.minOrders || referralsCount >= t.minReferrals) {
      current = t;
      break;
    }
  }

  const currentIndex = tiers.findIndex((t) => t.code === current.code);
  const next = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;

  // Progress: lấy max % của 2 trục → tới gần threshold nào hơn thì hiển thị.
  let progressPercent = 100;
  let ordersToNext = 0;
  let referralsToNext = 0;
  if (next) {
    const orderProgress = Math.min(100, (ordersCount / next.minOrders) * 100);
    const refProgress = Math.min(100, (referralsCount / next.minReferrals) * 100);
    progressPercent = Math.round(Math.max(orderProgress, refProgress));
    ordersToNext = Math.max(0, next.minOrders - ordersCount);
    referralsToNext = Math.max(0, next.minReferrals - referralsCount);
  }

  return {
    current,
    next,
    ordersCount,
    referralsCount,
    progressPercent,
    ordersToNext,
    referralsToNext,
    cashbackPercent: current.cashbackPercent,
  };
}

/**
 * Kiểm tra user vừa lên tier mới chưa — gọi sau khi data thay đổi
 * (vd. import order chuyển sang Đã hoàn tiền, referee active).
 *
 * Nếu user vừa lên tier mới → tạo notification chúc mừng.
 *
 * Idempotent: dùng audit_logs để track user đã được congrat tier nào,
 * tránh spam notification mỗi lần check.
 */
export async function checkAndNotifyTierUp(userId: number): Promise<void> {
  const info = await getUserTier(userId);
  if (info.current.code === "bronze") return; // Bronze là default, không congrat

  const db = await getDb();
  // Check đã có notif tier-up cho tier này chưa.
  const existing = await db.get(
    `SELECT id FROM audit_logs
     WHERE user_id = ? AND action = 'user.tier_up' AND target = ?
     LIMIT 1`,
    [userId, `tier=${info.current.code}`],
  );
  if (existing) return;

  // Notification + audit log.
  await createNotification(
    userId,
    `${info.current.icon} Chúc mừng! Bạn đã lên tier ${info.current.name}!`,
    `Tuyệt vời! Bạn vừa thăng hạng lên tier ${info.current.name} — cashback từ nay tăng lên ${info.current.cashbackPercent}% cho MỌI đơn hàng. Càng mua sắm, càng tiết kiệm hơn nữa! 🎊`,
    "achievement",
  );
  await db.run(
    "INSERT INTO audit_logs (user_id, action, target) VALUES (?, ?, ?)",
    [userId, "user.tier_up", `tier=${info.current.code}`],
  );
}
