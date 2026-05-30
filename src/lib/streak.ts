/**
 * Daily login streak system — gamification để tăng DAU.
 *
 * Quy tắc:
 *   - Mỗi ngày user login lần đầu → check & update streak
 *   - Login cùng ngày: không thay đổi streak
 *   - Login ngày kế tiếp: streak +1
 *   - Bỏ 1 ngày: streak reset về 1
 *
 * Reward milestones (đơn vị: VND credit vào ví):
 *   - 7 ngày: +2.000đ
 *   - 14 ngày: +3.000đ
 *   - 30 ngày: +5.000đ
 *   - 60 ngày: +10.000đ
 *   - 90 ngày: +20.000đ
 *
 * Idempotent: streak_rewards table có UNIQUE(user_id, milestone) — không double reward.
 */

import { getDb, createNotification } from "@/lib/db";

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  /** Ngày đã streak gần nhất (DATE format). */
  lastStreakDate: string | null;
  /** Reward sắp tới (vd. 7 nếu streak hiện tại = 5 → cần thêm 2 ngày). */
  nextMilestone: number | null;
  /** Bonus VND tại nextMilestone. */
  nextBonus: number;
  /** Reward vừa nhận trong lần update gần nhất (null nếu không có). */
  rewardJustEarned: { milestone: number; amount: number } | null;
}

const MILESTONES: { day: number; bonus: number }[] = [
  { day: 7, bonus: 2_000 },
  { day: 14, bonus: 3_000 },
  { day: 30, bonus: 5_000 },
  { day: 60, bonus: 10_000 },
  { day: 90, bonus: 20_000 },
];

/** Get next milestone for current streak. */
function getNextMilestone(currentStreak: number): { milestone: number | null; bonus: number } {
  for (const m of MILESTONES) {
    if (m.day > currentStreak) return { milestone: m.day, bonus: m.bonus };
  }
  return { milestone: null, bonus: 0 };
}

/**
 * Update streak khi user login. Chỉ chạy update logic 1 lần / ngày.
 * Trả streak info + bonus nếu vừa đạt milestone.
 *
 * Gọi trong loginUser sau khi auth thành công.
 */
export async function updateLoginStreak(userId: number): Promise<StreakInfo> {
  const db = await getDb();

  const row = await db.get(
    "SELECT current_streak, longest_streak, last_streak_date FROM users WHERE id = ?",
    [userId],
  );

  const currentStreak = Number(row?.current_streak ?? 0);
  const longestStreak = Number(row?.longest_streak ?? 0);
  const lastStreakDate = row?.last_streak_date
    ? (row.last_streak_date instanceof Date ? row.last_streak_date.toISOString().slice(0, 10) : String(row.last_streak_date).slice(0, 10))
    : null;

  // Compute today's date string (local server time → 00:00 cutoff)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Same day login → không update streak
  if (lastStreakDate === today) {
    const next = getNextMilestone(currentStreak);
    return {
      currentStreak,
      longestStreak,
      lastStreakDate: today,
      nextMilestone: next.milestone,
      nextBonus: next.bonus,
      rewardJustEarned: null,
    };
  }

  // Tính ngày hôm qua
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  // Continuous? (lastStreakDate = yesterday) → +1; else → reset về 1
  const newStreak = lastStreakDate === yesterdayStr ? currentStreak + 1 : 1;
  const newLongest = Math.max(longestStreak, newStreak);

  // Update users row
  await db.run(
    `UPDATE users
     SET current_streak = ?, longest_streak = ?, last_streak_date = ?
     WHERE id = ?`,
    [newStreak, newLongest, today, userId],
  );

  // Check milestone reward
  let rewardJustEarned: StreakInfo["rewardJustEarned"] = null;
  const milestone = MILESTONES.find((m) => m.day === newStreak);
  if (milestone) {
    // Idempotent: use ON CONFLICT DO NOTHING via UNIQUE constraint
    try {
      const insertResult = await db.run(
        `INSERT INTO streak_rewards (user_id, milestone, bonus_amount)
         VALUES (?, ?, ?)
         ON CONFLICT (user_id, milestone) DO NOTHING`,
        [userId, milestone.day, milestone.bonus],
      );
      // Chỉ credit + notify nếu vừa insert mới
      if (insertResult.changes > 0) {
        // Credit wallet
        await db.run(
          `INSERT INTO wallet (user_id, label, amount, type)
           VALUES (?, ?, ?, 'credit')`,
          [userId, `Thưởng streak ${milestone.day} ngày`, milestone.bonus],
        );
        // Notification
        await createNotification(
          userId,
          `🔥 Streak ${milestone.day} ngày — Nhận ${milestone.bonus.toLocaleString("vi-VN")}đ!`,
          `Tuyệt vời! Bạn đã đăng nhập ${milestone.day} ngày liên tiếp. Phần thưởng ${milestone.bonus.toLocaleString("vi-VN")}đ vừa được cộng vào ví. Tiếp tục giữ streak để mở khóa milestone cao hơn nhé!`,
          "achievement",
        );
        rewardJustEarned = { milestone: milestone.day, amount: milestone.bonus };
      }
    } catch (e) {
      console.warn("[streak] milestone reward failed:", e);
    }
  }

  const next = getNextMilestone(newStreak);
  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastStreakDate: today,
    nextMilestone: next.milestone,
    nextBonus: next.bonus,
    rewardJustEarned,
  };
}

/**
 * Get current streak info — không update, chỉ đọc.
 * Dùng cho UI dashboard hiển thị streak badge.
 */
export async function getStreakInfo(userId: number): Promise<StreakInfo> {
  const db = await getDb();
  const row = await db.get(
    "SELECT current_streak, longest_streak, last_streak_date FROM users WHERE id = ?",
    [userId],
  );

  let currentStreak = Number(row?.current_streak ?? 0);
  const longestStreak = Number(row?.longest_streak ?? 0);
  const lastStreakDate = row?.last_streak_date
    ? (row.last_streak_date instanceof Date ? row.last_streak_date.toISOString().slice(0, 10) : String(row.last_streak_date).slice(0, 10))
    : null;

  // Nếu lastStreakDate < hôm qua → streak đã đứt. Hiển thị 0 (sẽ được update khi user login lại).
  if (lastStreakDate) {
    const last = new Date(lastStreakDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    last.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) {
      // Streak đã đứt
      currentStreak = 0;
    }
  }

  const next = getNextMilestone(currentStreak);
  return {
    currentStreak,
    longestStreak,
    lastStreakDate,
    nextMilestone: next.milestone,
    nextBonus: next.bonus,
    rewardJustEarned: null,
  };
}
