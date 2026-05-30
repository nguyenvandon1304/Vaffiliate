import { test as teardown } from "@playwright/test";
import { readFileSync, existsSync, rmSync } from "node:fs";

/**
 * Teardown — xoá user test đã tạo ở user.setup.ts để DB dev sạch sau khi chạy.
 * Dùng session user (storageState) + password trong cred file → DELETE /api/auth/account.
 */
const CRED_FILE = "e2e/.auth/user-cred.json";

teardown("delete test user", async ({ request }) => {
  if (!existsSync(CRED_FILE)) return;
  const cred = JSON.parse(readFileSync(CRED_FILE, "utf8")) as { password: string };
  const res = await request.delete("/api/auth/account", {
    data: { password: cred.password },
  });
  // Không fail teardown nếu xoá lỗi — chỉ cảnh báo.
  if (!res.ok()) {
    console.warn("[teardown] xoá user test thất bại:", res.status(), await res.text());
  }
  try { rmSync(CRED_FILE); } catch { /* ignore */ }
});
