import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  registerUser,
  loginUser,
  changeUnverifiedEmail,
  changeUserPassword,
  verifyUserPassword,
} from "@/lib/db";
import { assertSafeTestDb, uniqueSuffix, deleteUserById } from "./helpers";

describe("integration: auth flows", () => {
  const sfx = uniqueSuffix();
  const username = `itauth_${sfx}`;
  const email = `itauth_${sfx}@test.local`;
  const password = "Str0ngP@ss123";
  const createdIds: number[] = [];

  beforeAll(() => {
    assertSafeTestDb();
  });

  afterAll(async () => {
    for (const id of createdIds) await deleteUserById(id);
  });

  it("registers a new user", async () => {
    const r = await registerUser(username, email, password);
    expect(r.success).toBe(true);
    expect(r.user).toBeDefined();
    if (r.user) createdIds.push(r.user.id);
  });

  it("rejects duplicate username", async () => {
    const r = await registerUser(username, `dup_${sfx}@test.local`, password);
    expect(r.success).toBe(false);
  });

  it("logs in with correct password and issues a token", async () => {
    const r = await loginUser(username, password);
    expect(r.success).toBe(true);
    expect(r.token).toBeTruthy();
  });

  it("rejects login with wrong password", async () => {
    const r = await loginUser(username, "wrong-password");
    expect(r.success).toBe(false);
    expect(r.token).toBeUndefined();
  });

  // Regression for C1: changeUnverifiedEmail MUST verify the password.
  // Trước khi fix, hàm này bỏ qua check mật khẩu (bug verifyPassword trả object).
  describe("changeUnverifiedEmail password check (C1 regression)", () => {
    it("rejects email change with WRONG password", async () => {
      const r = await changeUnverifiedEmail(username, "totally-wrong", `new_${sfx}@test.local`);
      expect(r.success).toBe(false);
    });

    it("allows email change with CORRECT password", async () => {
      const r = await changeUnverifiedEmail(username, password, `changed_${sfx}@test.local`);
      expect(r.success).toBe(true);
    });
  });

  describe("verifyUserPassword helper", () => {
    it("returns true for correct, false for wrong", async () => {
      const r = await loginUser(username, password);
      expect(r.user).toBeDefined();
      const uid = r.user!.id;
      expect(await verifyUserPassword(uid, password)).toBe(true);
      expect(await verifyUserPassword(uid, "nope")).toBe(false);
    });
  });

  describe("changeUserPassword", () => {
    it("rejects wrong current password", async () => {
      const r = await loginUser(username, password);
      const uid = r.user!.id;
      const res = await changeUserPassword(uid, "wrong-current", "NewStr0ng@9", {});
      expect(res.success).toBe(false);
    });
  });
});
