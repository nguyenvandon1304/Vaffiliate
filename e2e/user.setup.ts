import { test as setup, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";

/**
 * Setup project (user) — tạo 1 user test rồi đăng nhập, lưu storageState +
 * thông tin user để test dashboard và để teardown xoá sau.
 *
 * Cách làm an toàn, không cần truy cập DB từ Playwright:
 *  1. Đăng ký qua API /api/auth/register — captcha bị skip server-side
 *     (DISABLE_TURNSTILE=1 ở .env.local) nên gọi thẳng được.
 *  2. Đăng nhập qua UI (đọc mã captcha SVG fallback) để có session cookie thật.
 *
 * User chưa verify email vẫn vào được dashboard (soft email gate) → đủ để test
 * các tab hiển thị. Teardown xoá user qua DELETE /api/auth/account.
 */
const AUTH_FILE = "e2e/.auth/user.json";
const CRED_FILE = "e2e/.auth/user-cred.json";

const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const USERNAME = `e2euser${suffix}`.slice(0, 20);
const EMAIL = `e2e_${suffix}@test.local`;
// Mật khẩu phải mạnh + KHÔNG nằm trong HaveIBeenPwned (app chặn pwned password).
// Dùng suffix ngẫu nhiên để gần như chắc chắn chưa từng bị lộ.
const PASSWORD = `Vaff!${suffix}Qx7#`;

setup("create + authenticate test user", async ({ page, request }) => {
  // 1. Đăng ký qua API (captcha skip server-side).
  const reg = await request.post("/api/auth/register", {
    data: { username: USERNAME, email: EMAIL, password: PASSWORD },
  });
  expect(reg.ok(), `register failed: ${reg.status()} ${await reg.text()}`).toBeTruthy();

  // Lưu credential để teardown dùng.
  writeFileSync(CRED_FILE, JSON.stringify({ username: USERNAME, email: EMAIL, password: PASSWORD }), "utf8");

  // 2. Đăng nhập qua UI.
  await page.goto("/");
  await page.getByPlaceholder(/Nhập tên đăng nhập|tên đăng nhập/i).first().fill(USERNAME);
  await page.getByPlaceholder("Nhập mật khẩu").fill(PASSWORD);
  const captchaInput = page.getByPlaceholder("Nhập mã");
  await captchaInput.waitFor({ state: "visible", timeout: 10_000 });
  const glyphs = await page.locator("svg.select-none text").allTextContents();
  const code = glyphs.join("").replace(/\s/g, "");
  expect(code.length).toBeGreaterThanOrEqual(4);
  await captchaInput.fill(code);
  await expect(captchaInput).toHaveValue(code);
  await page.getByRole("button", { name: "Đăng nhập" }).last().click();

  // User thường → redirect /dashboard.
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: AUTH_FILE });
});
