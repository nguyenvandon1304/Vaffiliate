import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  registerUser,
  addBankAccount,
  setWithdrawPin,
  createWithdrawRequest,
  importOrders,
  updateWithdrawalStatus,
} from "@/lib/db";
import {
  assertSafeTestDb,
  uniqueSuffix,
  deleteUserById,
  walletBalance,
  markVerified,
  orderStatus,
  latestWithdrawal,
} from "./helpers";

describe("integration: import CSV + withdrawal approve/reject", () => {
  const sfx = uniqueSuffix();
  const username = `itimp_${sfx}`;
  const PIN = "654321";
  let userId = 0;
  let bankId = 0;

  beforeAll(async () => {
    assertSafeTestDb();
    const r = await registerUser(username, `itimp_${sfx}@test.local`, "Str0ngP@ss123");
    userId = r.user!.id;
    await markVerified(userId);
    const bank = await addBankAccount(userId, {
      bank_code: "VCB", bank_name: "Vietcombank",
      account_number: "0987654321", account_holder: "NGUYEN TEST IMPORT",
    });
    bankId = bank.id!;
    await setWithdrawPin(userId, PIN);
  });

  afterAll(async () => {
    if (userId) await deleteUserById(userId);
  });

  describe("importOrders", () => {
    it("credits cashback when a completed order is imported (matched via uid sub_id)", async () => {
      const orderCode = `IMP-${sfx}-A`;
      const before = await walletBalance(userId);
      const res = await importOrders([{
        orderCode,
        shopId: "shop1",
        itemId: "item1",
        productName: "Test product",
        amount: 200_000,
        commission: 20_000, // cashback = 20000 * 50% (Bronze) = 10000
        status: "COMPLETED",
        subId: `uid_${userId}`,
      }]);
      expect(res.matched).toBe(1);
      expect(await orderStatus(orderCode)).toBe("Đã hoàn tiền");
      // Bronze 50% → +10.000đ vào ví.
      expect(await walletBalance(userId)).toBe(before + 10_000);
    });

    it("does NOT double-credit when the same completed order is re-imported", async () => {
      const orderCode = `IMP-${sfx}-A`; // cùng order_code đã completed ở trên
      const before = await walletBalance(userId);
      const res = await importOrders([{
        orderCode, shopId: "shop1", itemId: "item1", productName: "Test product",
        amount: 200_000, commission: 20_000, status: "COMPLETED", subId: `uid_${userId}`,
      }]);
      expect(res.duplicated).toBe(1);
      expect(await walletBalance(userId)).toBe(before); // không cộng lại
    });

    it("claws back cashback when a completed order is later cancelled", async () => {
      const orderCode = `IMP-${sfx}-A`;
      const before = await walletBalance(userId);
      const res = await importOrders([{
        orderCode, shopId: "shop1", itemId: "item1", productName: "Test product",
        amount: 200_000, commission: 20_000, status: "CANCELLED", subId: `uid_${userId}`,
      }]);
      expect(res.updated).toBe(1);
      expect(await orderStatus(orderCode)).toBe("Đã hủy");
      // Thu hồi đúng 10.000đ đã cộng.
      expect(await walletBalance(userId)).toBe(before - 10_000);
    });

    it("matches a pending order to user but does not credit until completed", async () => {
      const orderCode = `IMP-${sfx}-B`;
      const before = await walletBalance(userId);
      const res = await importOrders([{
        orderCode, shopId: "shop2", itemId: "item2", productName: "Pending product",
        amount: 100_000, commission: 10_000, status: "PENDING", subId: `uid_${userId}`,
      }]);
      expect(res.matched).toBe(1);
      // "PENDING" map sang "Đang xử lý" (xem mapStatus); chưa hoàn tiền.
      expect(await orderStatus(orderCode)).toBe("Đang xử lý");
      expect(await walletBalance(userId)).toBe(before); // chưa cộng tiền
    });
  });

  describe("withdrawal approve / reject", () => {
    it("approves a pending withdrawal exactly once (no double-process)", async () => {
      // Tạo đơn completed để mở khoá rút (đã có IMP-A nhưng giờ là Đã hủy → cần đơn mới)
      await importOrders([{
        orderCode: `IMP-${sfx}-C`, shopId: "shop3", itemId: "item3", productName: "P",
        amount: 100_000, commission: 100_000, status: "COMPLETED", subId: `uid_${userId}`,
      }]);
      const bal = await walletBalance(userId);
      expect(bal).toBeGreaterThanOrEqual(50_000);

      const wd = await createWithdrawRequest(userId, bankId, 50_000, PIN);
      expect(wd.success).toBe(true);
      const afterDebit = await walletBalance(userId);
      expect(afterDebit).toBe(bal - 50_000);

      const w = await latestWithdrawal(userId);
      expect(w).not.toBeNull();

      const approve1 = await updateWithdrawalStatus(w!.id, "approved");
      expect(approve1.success).toBe(true);
      // Lần 2 phải bị chặn (đã xử lý) — chống double-process.
      const approve2 = await updateWithdrawalStatus(w!.id, "approved");
      expect(approve2.success).toBe(false);
      // Approve KHÔNG hoàn tiền lại → số dư giữ nguyên sau debit.
      expect(await walletBalance(userId)).toBe(afterDebit);
    });

    it("refunds wallet exactly once when a withdrawal is rejected", async () => {
      // Đảm bảo đủ số dư: import thêm 1 đơn completed (commission 60k → cashback 30k Bronze).
      await importOrders([{
        orderCode: `IMP-${sfx}-D`, shopId: "shop4", itemId: "item4", productName: "P",
        amount: 100_000, commission: 60_000, status: "COMPLETED", subId: `uid_${userId}`,
      }]);
      const balBefore = await walletBalance(userId);
      expect(balBefore).toBeGreaterThanOrEqual(30_000);

      const wd = await createWithdrawRequest(userId, bankId, 30_000, PIN);
      expect(wd.success).toBe(true);
      const afterDebit = await walletBalance(userId);
      expect(afterDebit).toBe(balBefore - 30_000);

      const w = await latestWithdrawal(userId);
      const reject1 = await updateWithdrawalStatus(w!.id, "rejected", "test reject");
      expect(reject1.success).toBe(true);
      // Hoàn tiền đúng 1 lần → về lại balBefore.
      expect(await walletBalance(userId)).toBe(balBefore);

      // Reject lần 2 phải bị chặn (không hoàn tiền lần 2).
      const reject2 = await updateWithdrawalStatus(w!.id, "rejected", "again");
      expect(reject2.success).toBe(false);
      expect(await walletBalance(userId)).toBe(balBefore);
    });
  });
});
