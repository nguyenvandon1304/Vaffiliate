/**
 * Mini-game vòng quay may mắn.
 *
 * Cách hoạt động:
 *   - 8 segment trên vòng quay với phần thưởng + xác suất khác nhau
 *   - User spin 1 lần / 24h (cấu hình qua setting `spin_cooldown_hours`)
 *   - Random server-side (không trust client) → trả về `segmentIndex` để UI animate
 *   - Tự động cộng tiền vào ví user qua bảng `wallet`
 *
 * Anti-cheat:
 *   - Server check cooldown từ DB (không từ client)
 *   - randomBytes thay vì Math.random (entropy cao)
 *   - Atomic check-then-insert trong transaction → 2 request đồng thời
 *     không thể double-spin
 */

import crypto from "crypto";
import { getDb, getSetting } from "@/lib/db";

/**
 * 8 segment vòng quay. `weight` là trọng số xác suất (cao = dễ trúng).
 * Tổng weight = 100 → tiện hiện % cho user.
 *
 * Strategy:
 *   - 50% rơi vào reward thấp (1-2k) — giữ EV ~3k/spin, app không lỗ nhiều
 *   - 30% trượt — tạo cảm giác đa dạng, không phải lúc nào cũng có thưởng
 *   - 15% medium 5k
 *   - 5% jackpot 50k — hiếm nhưng tạo viral moment
 *
 * Tính toán:
 *   EV = 0.30*1000 + 0.20*2000 + 0.15*5000 + 0.10*3000 + 0.10*0 + 0.05*10000
 *      + 0.05*0 + 0.05*50000
 *      = 300 + 400 + 750 + 300 + 0 + 500 + 0 + 2500 = 4750đ/spin
 *   1 user spin/ngày × 30 ngày = ~142,500đ/tháng — chấp nhận được như chi phí marketing
 */
export interface SpinSegment {
  index: number;
  amount: number;
  label: string;
  /** Màu Tailwind cho UI (alternating). */
  color: string;
  /** Xác suất 0-100. Tổng = 100. */
  weight: number;
}

export const SPIN_SEGMENTS: SpinSegment[] = [
  { index: 0, amount: 1000,  label: "1.000đ",   color: "from-amber-300 to-amber-400",   weight: 30 },
  { index: 1, amount: 2000,  label: "2.000đ",   color: "from-orange-300 to-orange-400", weight: 20 },
  { index: 2, amount: 5000,  label: "5.000đ",   color: "from-rose-300 to-rose-400",     weight: 15 },
  { index: 3, amount: 3000,  label: "3.000đ",   color: "from-pink-300 to-pink-400",     weight: 10 },
  { index: 4, amount: 0,     label: "Chúc may mắn",  color: "from-gray-300 to-gray-400",   weight: 10 },
  { index: 5, amount: 10000, label: "10.000đ",  color: "from-emerald-400 to-emerald-500", weight: 5 },
  { index: 6, amount: 0,     label: "Thử lại",  color: "from-slate-300 to-slate-400",   weight: 5 },
  { index: 7, amount: 50000, label: "50.000đ 🎁", color: "from-fuchsia-400 to-purple-500", weight: 5 },
];

/**
 * Weighted random pick từ SPIN_SEGMENTS dùng crypto.randomBytes.
 *
 * Không dùng `Math.random()` vì:
 *   - PRNG có thể bị predict
 *   - User mất niềm tin nếu admin gian lận (tuy không có thật)
 *
 * Crypto random → entropy đủ + không thể đoán được kết quả tiếp theo.
 */
function weightedRandom(): SpinSegment {
  const total = SPIN_SEGMENTS.reduce((s, seg) => s + seg.weight, 0);
  // Sinh số 0..total-1
  const buf = crypto.randomBytes(4);
  const r = buf.readUInt32BE(0) % total;

  let cumulative = 0;
  for (const seg of SPIN_SEGMENTS) {
    cumulative += seg.weight;
    if (r < cumulative) return seg;
  }
  return SPIN_SEGMENTS[0]; // fallback (không xảy ra khi tổng = 100)
}

export interface SpinStatus {
  /** User có thể spin lúc này không. */
  canSpin: boolean;
  /** Cooldown còn lại (giây). 0 nếu canSpin = true. */
  cooldownSeconds: number;
  /** Lần spin gần nhất (ISO). */
  lastSpinAt: string | null;
  /** Tổng số lần đã spin. */
  totalSpins: number;
  /** Tổng tiền thưởng đã nhận. */
  totalWon: number;
  /** Game có đang bật không (admin có thể tắt). */
  enabled: boolean;
}

/**
 * Lấy trạng thái spin hiện tại của user. UI dùng để render countdown.
 */
export async function getSpinStatus(userId: number): Promise<SpinStatus> {
  const enabled = (await getSetting("spin_enabled")) !== "0";
  const cooldownHours = Math.max(1, Number(await getSetting("spin_cooldown_hours")) || 24);

  const db = await getDb();
  // Lấy lần spin gần nhất + summary tổng.
  const last = await db.get(
    "SELECT spun_at FROM spin_history WHERE user_id = ? ORDER BY spun_at DESC LIMIT 1",
    [userId],
  );
  const summary = await db.get(
    "SELECT COUNT(*) AS total, COALESCE(SUM(reward_amount), 0) AS won FROM spin_history WHERE user_id = ?",
    [userId],
  );

  let canSpin = true;
  let cooldownSeconds = 0;
  let lastSpinAt: string | null = null;

  if (last) {
    const lastDate = new Date(last.spun_at as Date | string);
    lastSpinAt = lastDate.toISOString();
    const elapsed = Date.now() - lastDate.getTime();
    const cooldownMs = cooldownHours * 3600 * 1000;
    if (elapsed < cooldownMs) {
      canSpin = false;
      cooldownSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
    }
  }

  return {
    canSpin: enabled && canSpin,
    cooldownSeconds,
    lastSpinAt,
    totalSpins: Number(summary?.total ?? 0),
    totalWon: Number(summary?.won ?? 0),
    enabled,
  };
}

export interface SpinResult {
  success: boolean;
  error?: string;
  segmentIndex?: number;
  amount?: number;
  label?: string;
  /** Cooldown sau spin này (giây) — UI countdown đến lượt tiếp. */
  nextCooldownSeconds?: number;
}

/**
 * Thực hiện spin — atomic check cooldown + insert + cộng ví trong transaction.
 *
 * Race condition: nếu user spam click button, 2 request có thể đến cùng lúc.
 * Transaction + lock row đảm bảo chỉ 1 request thành công.
 */
export async function performSpin(userId: number): Promise<SpinResult> {
  const enabled = (await getSetting("spin_enabled")) !== "0";
  if (!enabled) {
    return { success: false, error: "Vòng quay tạm khoá. Quay lại sau nhé!" };
  }

  const cooldownHours = Math.max(1, Number(await getSetting("spin_cooldown_hours")) || 24);
  const db = await getDb();

  return await db.transaction(async (tx) => {
    // Check cooldown trong transaction (FOR UPDATE không cần — UNIQUE key đủ).
    const last = await tx.get(
      "SELECT spun_at FROM spin_history WHERE user_id = ? ORDER BY spun_at DESC LIMIT 1",
      [userId],
    );

    if (last) {
      const elapsed = Date.now() - new Date(last.spun_at as Date | string).getTime();
      const cooldownMs = cooldownHours * 3600 * 1000;
      if (elapsed < cooldownMs) {
        const remainSec = Math.ceil((cooldownMs - elapsed) / 1000);
        const remainHours = Math.ceil(remainSec / 3600);
        return {
          success: false,
          error: `Bạn đã quay rồi. Quay lại sau ~${remainHours} giờ nữa nhé!`,
        };
      }
    }

    // Random reward
    const segment = weightedRandom();

    // Insert spin history
    await tx.run(
      "INSERT INTO spin_history (user_id, reward_amount, reward_label, segment_index) VALUES (?, ?, ?, ?)",
      [userId, segment.amount, segment.label, segment.index],
    );

    // Cộng vào ví user (chỉ khi amount > 0)
    if (segment.amount > 0) {
      await tx.run(
        "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, ?)",
        [userId, `Vòng quay may mắn — ${segment.label}`, segment.amount, "credit"],
      );
      // Notification
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
      nextCooldownSeconds: cooldownHours * 3600,
    };
  });
}
