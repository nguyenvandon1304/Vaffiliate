/**
 * Mini-game vòng quay may mắn — EARN-BASED.
 *
 * Cơ chế:
 *   - User EARN lượt quay (không phải free 1 lần/ngày):
 *       + Mỗi N đơn hoàn tiền → +1 lượt (default N=10)
 *       + Mỗi M bạn mời active → +1 lượt (default M=5)
 *   - User SPEND lượt khi quay
 *   - Available = total_earned - total_spent
 *
 * Điểm hay:
 *   - Tạo động lực mua hàng + mời bạn (engagement)
 *   - Không bóp lượt như cooldown — user mua nhiều spin nhiều
 *   - Server tính toán từ DB → impossible cheat client
 *
 * Anti-cheat:
 *   - Available tokens compute from DB (orders + referrals + spin_history)
 *   - Atomic check-then-spin trong transaction
 *   - Order phải status = "Đã hoàn tiền" mới count (không tính order đã hủy/pending)
 *   - Referral phải bonus_credited = 1 (đã có ít nhất 1 đơn hoàn tiền)
 */

import crypto from "crypto";
import { getDb, getSetting } from "@/lib/db";

/** Namespace cho pg_advisory_xact_lock — serialize các lần quay của cùng user. */
const SPIN_LOCK_NAMESPACE = 4202;

export interface SpinSegment {
  index: number;
  amount: number;
  label: string;
  color: string;
  weight: number;
}

export const SPIN_SEGMENTS: SpinSegment[] = [
  { index: 0, amount: 1000,  label: "1.000đ",     color: "from-amber-300 to-amber-400",     weight: 30 },
  { index: 1, amount: 2000,  label: "2.000đ",     color: "from-orange-300 to-orange-400",   weight: 20 },
  { index: 2, amount: 5000,  label: "5.000đ",     color: "from-rose-300 to-rose-400",       weight: 15 },
  { index: 3, amount: 3000,  label: "3.000đ",     color: "from-pink-300 to-pink-400",       weight: 10 },
  { index: 4, amount: 0,     label: "Chúc may mắn", color: "from-gray-300 to-gray-400",       weight: 10 },
  { index: 5, amount: 10000, label: "10.000đ",    color: "from-emerald-400 to-emerald-500", weight: 5 },
  { index: 6, amount: 0,     label: "Thử lại",    color: "from-slate-300 to-slate-400",     weight: 5 },
  { index: 7, amount: 50000, label: "50.000đ 🎁", color: "from-fuchsia-400 to-purple-500",  weight: 5 },
];

function weightedRandom(): SpinSegment {
  const total = SPIN_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  const buf = crypto.randomBytes(4);
  const r = buf.readUInt32BE(0) % total;
  let cumulative = 0;
  for (const seg of SPIN_SEGMENTS) {
    cumulative += seg.weight;
    if (r < cumulative) return seg;
  }
  return SPIN_SEGMENTS[0];
}

export interface SpinStatus {
  /** Game có đang bật không (admin có thể tắt). */
  enabled: boolean;
  /** Số lượt quay đang có (earned - spent). */
  availableTokens: number;
  /** Tổng số lượt đã earn từ trước đến nay. */
  totalEarned: number;
  /** Tổng số lần đã quay. */
  totalSpins: number;
  /** Tổng tiền thưởng đã nhận từ vòng quay. */
  totalWon: number;
  /** Số đơn "Đã hoàn tiền" hiện có. */
  completedOrders: number;
  /** Số bạn mời active. */
  activeReferrals: number;
  /** Config hiện tại. */
  ordersPerToken: number;
  referralsPerToken: number;
  /** Tiến độ tới lượt quay tiếp theo. */
  ordersTowardsNext: number;       // 0..ordersPerToken
  referralsTowardsNext: number;    // 0..referralsPerToken
}

/**
 * Tính số lượt earned từ orders + referrals.
 *   tokens_from_orders   = floor(completed_orders / orders_per_token)
 *   tokens_from_referrals= floor(active_referrals / referrals_per_token)
 *
 * Tách 2 nguồn để hiển thị progress riêng cho mỗi cái.
 */
export async function getSpinStatus(userId: number): Promise<SpinStatus> {
  const enabled = (await getSetting("spin_enabled")) !== "0";
  const ordersPerToken = Math.max(1, Number(await getSetting("spin_orders_per_token")) || 10);
  const referralsPerToken = Math.max(1, Number(await getSetting("spin_referrals_per_token")) || 5);

  const db = await getDb();

  // 1 query gộp các COUNT cần thiết.
  const row = await db.get(
    `SELECT
      COALESCE((SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status = 'Đã hoàn tiền'), 0) AS completed_orders,
      COALESCE((SELECT COUNT(*) FROM referrals WHERE referrer_user_id = $1 AND bonus_credited = 1), 0) AS active_referrals,
      COALESCE((SELECT COUNT(*) FROM spin_history WHERE user_id = $1), 0) AS total_spins,
      COALESCE((SELECT SUM(reward_amount) FROM spin_history WHERE user_id = $1), 0) AS total_won`,
    [userId],
  );

  const completedOrders = Number(row?.completed_orders ?? 0);
  const activeReferrals = Number(row?.active_referrals ?? 0);
  const totalSpins = Number(row?.total_spins ?? 0);
  const totalWon = Number(row?.total_won ?? 0);

  const tokensFromOrders = Math.floor(completedOrders / ordersPerToken);
  const tokensFromReferrals = Math.floor(activeReferrals / referralsPerToken);
  const totalEarned = tokensFromOrders + tokensFromReferrals;
  const availableTokens = Math.max(0, totalEarned - totalSpins);

  return {
    enabled,
    availableTokens,
    totalEarned,
    totalSpins,
    totalWon,
    completedOrders,
    activeReferrals,
    ordersPerToken,
    referralsPerToken,
    ordersTowardsNext: completedOrders % ordersPerToken,
    referralsTowardsNext: activeReferrals % referralsPerToken,
  };
}

export interface SpinResult {
  success: boolean;
  error?: string;
  segmentIndex?: number;
  amount?: number;
  label?: string;
  /** Số lượt còn lại sau khi quay. */
  remainingTokens?: number;
}

/**
 * Thực hiện 1 lượt quay. Atomic check-then-spend trong transaction.
 *
 * Race condition: user spam click → 2 request đến cùng lúc → cả 2 thấy
 * available=1 → cả 2 quay → spend âm. Transaction + check trong tx
 * tránh trường hợp này (sequential within 1 connection pool slot).
 */
export async function performSpin(userId: number): Promise<SpinResult> {
  const enabled = (await getSetting("spin_enabled")) !== "0";
  if (!enabled) {
    return { success: false, error: "Vòng quay tạm khoá. Quay lại sau nhé!" };
  }

  const ordersPerToken = Math.max(1, Number(await getSetting("spin_orders_per_token")) || 10);
  const referralsPerToken = Math.max(1, Number(await getSetting("spin_referrals_per_token")) || 5);

  const db = await getDb();

  return await db.transaction(async (tx) => {
    // Advisory lock theo user_id — serialize các lần quay đồng thời của cùng user.
    // READ COMMITTED + connection pool khiến 2 request song song có thể cùng đọc
    // available=1 rồi cùng insert spin_history → quay 2 lần với 1 lượt (farm thưởng).
    // Lock tự nhả khi transaction kết thúc.
    await tx.run("SELECT pg_advisory_xact_lock(?, ?)", [SPIN_LOCK_NAMESPACE, userId]);

    // Re-check availability TRONG transaction để chống race.
    const row = await tx.get(
      `SELECT
        COALESCE((SELECT COUNT(*) FROM orders WHERE user_id = $1 AND status = 'Đã hoàn tiền'), 0) AS completed_orders,
        COALESCE((SELECT COUNT(*) FROM referrals WHERE referrer_user_id = $1 AND bonus_credited = 1), 0) AS active_referrals,
        COALESCE((SELECT COUNT(*) FROM spin_history WHERE user_id = $1), 0) AS total_spins`,
      [userId],
    );

    const completedOrders = Number(row?.completed_orders ?? 0);
    const activeReferrals = Number(row?.active_referrals ?? 0);
    const totalSpins = Number(row?.total_spins ?? 0);

    const totalEarned =
      Math.floor(completedOrders / ordersPerToken) +
      Math.floor(activeReferrals / referralsPerToken);
    const available = totalEarned - totalSpins;

    if (available <= 0) {
      // Tính bao nhiêu nữa thì có lượt — hint cho user.
      const ordersToNext = ordersPerToken - (completedOrders % ordersPerToken);
      const refsToNext = referralsPerToken - (activeReferrals % referralsPerToken);
      return {
        success: false,
        error:
          `Bạn chưa có lượt quay. ` +
          `Mua thêm ${ordersToNext} đơn hoặc mời thêm ${refsToNext} bạn để mở 1 lượt.`,
      };
    }

    // Spend 1 token = insert 1 row spin_history. Random reward.
    const segment = weightedRandom();

    await tx.run(
      "INSERT INTO spin_history (user_id, reward_amount, reward_label, segment_index) VALUES (?, ?, ?, ?)",
      [userId, segment.amount, segment.label, segment.index],
    );

    if (segment.amount > 0) {
      await tx.run(
        "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
        [userId, `Vòng quay may mắn — ${segment.label}`, segment.amount, "credit"],
      );
      await tx.run(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
        [
          userId,
          "🎉 Trúng thưởng vòng quay!",
          `Bạn vừa nhận ${segment.amount.toLocaleString("vi-VN")}đ từ vòng quay may mắn. Tiền đã cộng vào ví.`,
          "spin",
        ],
      );
    }

    return {
      success: true,
      segmentIndex: segment.index,
      amount: segment.amount,
      label: segment.label,
      remainingTokens: available - 1,
    };
  });
}
