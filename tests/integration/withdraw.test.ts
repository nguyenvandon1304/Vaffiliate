import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  registerUser,
  addBankAccount,
  setWithdrawPin,
  createWithdrawRequest,
  subtractBalance,
  addBalance,
} from "@/lib/db";
import {
  assertSafeTestDb,
  uniqueSuffix,
  deleteUserById,
  walletBalance,
  creditWallet,
  insertOrder,
  markVerified,
} from "./helpers";

describe("integration: withdrawal money flow", () => {
  const sfx = uniqueSuffix();
  const username = `itwd_${sfx}`;
  const PIN = "123456";
  let userId = 0;
  let bankId = 0;

  beforeAll(async () => {
    assertSafeTestDb();
    const r = await registerUser(username, `itwd_${sfx}@test.local`, "Str0ngP@ss123");
    expect(r.success).toBe(true);
    userId = r.user!.id;
    await markVerified(userId);
    const bank = await addBankAccount(userId, {
      bank_code: "VCB",
      bank_name: "Vietcombank",
      account_number: "0123456789",
      account_holder: "NGUYEN VAN TEST",
    });
    expect(bank.success).toBe(true);
    bankId = bank.id!;
    await setWithdrawPin(userId, PIN);
  });

  afterAll(async () => {
    if (userId) await deleteUserById(userId);
  });

  it("blocks withdrawal when user has NO completed order (anti drain-bonus rule)", async () => {
    // Cho ví có tiền thưởng nhưng CHƯA có đơn hoàn tiền nào.
    await creditWallet(userId, 100_000, "tiền thưởng test");
    const r = await createWithdrawRequest(userId, bankId, 50_000, PIN);
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/đơn đã hoàn tiền/i);
    // Số dư KHÔNG bị trừ.
    expect(await walletBalance(userId)).toBe(100_000);
  });

  it("allows withdrawal after a completed cashback order exists", async () => {
    await insertOrder(userId, `IT-${sfx}-1`, "Đã hoàn tiền", 0);
    const before = await walletBalance(userId);
    const r = await createWithdrawRequest(userId, bankId, 50_000, PIN);
    expect(r.success).toBe(true);
    // Ví bị trừ đúng số tiền rút (ghi debit).
    expect(await walletBalance(userId)).toBe(before - 50_000);
  });

  it("rejects withdrawal with wrong PIN", async () => {
    const r = await createWithdrawRequest(userId, bankId, 10_000, "000000");
    expect(r.success).toBe(false);
  });

  it("rejects withdrawal exceeding balance", async () => {
    const bal = await walletBalance(userId);
    const r = await createWithdrawRequest(userId, bankId, bal + 1, PIN);
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/số dư không đủ/i);
  });

  it("rejects invalid amounts (zero / negative / NaN)", async () => {
    expect((await createWithdrawRequest(userId, bankId, 0, PIN)).success).toBe(false);
    expect((await createWithdrawRequest(userId, bankId, -1000, PIN)).success).toBe(false);
    expect((await createWithdrawRequest(userId, bankId, Number.NaN, PIN)).success).toBe(false);
  });

  describe("admin balance adjust", () => {
    it("addBalance credits and subtractBalance debits with balance guard", async () => {
      const start = await walletBalance(userId);
      await addBalance(username, 20_000, "test add");
      expect(await walletBalance(userId)).toBe(start + 20_000);

      const r = await subtractBalance(username, start + 20_000 + 1, "over-debit");
      expect(r.success).toBe(false); // không cho âm ví
      expect(await walletBalance(userId)).toBe(start + 20_000);

      const ok = await subtractBalance(username, 20_000, "test sub");
      expect(ok.success).toBe(true);
      expect(await walletBalance(userId)).toBe(start);
    });
  });
});
