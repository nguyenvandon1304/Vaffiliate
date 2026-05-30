import { test as setup, expect } from "@playwright/test";

/**
 * Setup project — đăng nhập admin MỘT LẦN rồi lưu session cookie vào storageState.
 * Các test admin sau dùng lại state này nên không phải login lại từng test.
 *
 * Captcha bị skip ở local do DISABLE_TURNSTILE=1 trong .env.local (server-side),
 * và nút Đăng nhập không bị captcha khoá → chỉ cần điền user/pass.
 */
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";
const AUTH_FILE = "e2e/.auth/admin.json";

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder(/Nhập tên đăng nhập|tên đăng nhập/i).first().fill(ADMIN_USER);
  await page.getByPlaceholder("Nhập mật khẩu").fill(ADMIN_PASS);

  // Local dùng captcha SVG fallback (NEXT_PUBLIC_DISABLE_TURNSTILE=1). Client yêu
  // cầu nhập đúng mã hiển thị mới cho submit. Đọc các glyph <text> trong SVG theo
  // thứ tự để lấy mã rồi điền — chỉ khả thi ở môi trường test/local.
  const captchaInput = page.getByPlaceholder("Nhập mã");
  await captchaInput.waitFor({ state: "visible", timeout: 10_000 });
  // Captcha SVG có class riêng "select-none" + "w-[130px]"; chỉ svg này có <text>
  // chứa glyph mã. (Tránh nhầm với SVG logo "V-Affiliate".)
  const glyphs = await page.locator("svg.select-none text").allTextContents();
  const code = glyphs.join("").replace(/\s/g, "");
  expect(code.length, `captcha glyphs: ${JSON.stringify(glyphs)}`).toBeGreaterThanOrEqual(4);
  await captchaInput.fill(code);
  await expect(captchaInput).toHaveValue(code);

  await page.getByRole("button", { name: "Đăng nhập" }).last().click();
  // Admin → redirect /admin.
  await page.waitForURL(/\/admin/, { timeout: 20_000 });
  await expect(page).toHaveURL(/\/admin/);
  await page.context().storageState({ path: AUTH_FILE });
});
