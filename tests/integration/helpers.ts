/**
 * Helpers cho integration test — KẾT NỐI DB THẬT (dev).
 *
 * ⚠️ AN TOÀN: file này có guard chặn chạy nhầm trên DB production. Test integration
 * tạo + xoá user thật trong DB nên CHỈ được chạy trên DB dev/test.
 *
 * Cách chạy:  npm run test:integration
 *   (script này set INTEGRATION_DB=1 + load .env.local của bạn = DB dev)
 */
import { getDb } from "@/lib/db";

/** Ref project Supabase production — KHÔNG cho test chạy trên ref này. */
const PROD_DB_REF = "axylhcdefhidnpemapzo";

/**
 * Chặn cứng: nếu DATABASE_URL trỏ vào project production, throw ngay để không
 * bao giờ tạo/xoá data trên DB khách thật. Phải set INTEGRATION_DB=1 để xác nhận
 * chủ đích chạy integration test.
 */
export function assertSafeTestDb(): void {
  const url = process.env.DATABASE_URL || "";
  if (process.env.INTEGRATION_DB !== "1") {
    throw new Error(
      "Integration test bị chặn: chưa set INTEGRATION_DB=1. Dùng `npm run test:integration`.",
    );
  }
  if (!url) {
    throw new Error("Integration test bị chặn: thiếu DATABASE_URL.");
  }
  if (url.includes(PROD_DB_REF)) {
    throw new Error(
      "🛑 DỪNG LẠI: DATABASE_URL đang trỏ vào DB PRODUCTION. Integration test chỉ chạy trên DB dev!",
    );
  }
}

/** Tạo hậu tố duy nhất để user test không đụng nhau / không trùng data có sẵn. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Xoá user test theo id (CASCADE tự xoá orders/wallet/withdrawals/... liên quan). */
export async function deleteUserById(userId: number): Promise<void> {
  const db = await getDb();
  await db.run("DELETE FROM users WHERE id = ?", [userId]);
}

/** Lấy số dư ví hiện tại của user (ledger: credit - debit). */
export async function walletBalance(userId: number): Promise<number> {
  const db = await getDb();
  const row = await db.get(
    "SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END), 0) AS bal FROM wallet WHERE user_id = ?",
    [userId],
  );
  return Number(row?.bal ?? 0);
}

/** Thêm 1 credit thẳng vào ví (mô phỏng tiền thưởng) — dùng trong setup test. */
export async function creditWallet(userId: number, amount: number, label = "test credit"): Promise<void> {
  const db = await getDb();
  await db.run(
    "INSERT INTO wallet (user_id, label, amount, type) VALUES (?, ?, ?, 'credit')",
    [userId, label, amount],
  );
}

/** Tạo 1 đơn cho user với status cho trước (để test rule rút tiền). */
export async function insertOrder(
  userId: number,
  orderCode: string,
  status: string,
  cashback = 0,
): Promise<void> {
  const db = await getDb();
  await db.run(
    "INSERT INTO orders (user_id, order_code, store, amount, cashback, status) VALUES (?, ?, 'Shopee', ?, ?, ?)",
    [userId, orderCode, cashback, cashback, status],
  );
}

/** Đánh dấu user đã verify email (cho các flow cần verified). */
export async function markVerified(userId: number): Promise<void> {
  const db = await getDb();
  await db.run("UPDATE users SET email_verified = 1 WHERE id = ?", [userId]);
}

/** Lấy status của 1 đơn theo order_code (null nếu không có). */
export async function orderStatus(orderCode: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.get("SELECT status FROM orders WHERE order_code = ?", [orderCode]);
  return row ? String(row.status) : null;
}

/** Lấy withdrawal pending mới nhất của user (id + status). */
export async function latestWithdrawal(
  userId: number,
): Promise<{ id: number; status: string; amount: number } | null> {
  const db = await getDb();
  const row = await db.get(
    "SELECT id, status, amount FROM withdrawals WHERE user_id = ? ORDER BY id DESC LIMIT 1",
    [userId],
  );
  return row ? { id: Number(row.id), status: String(row.status), amount: Number(row.amount) } : null;
}
