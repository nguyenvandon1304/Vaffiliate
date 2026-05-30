import { test, expect, request as pwRequest, type APIRequestContext, type Page } from "@playwright/test";

/**
 * E2E thao tác sâu: flow rút tiền đầu-cuối qua UI.
 *   user gửi yêu cầu rút (wizard) → admin duyệt → kiểm số dư cuối.
 *
 * Tiền đề set qua API cho nhanh (không phải mục tiêu test UI):
 *   - user verified email (admin mark_verified)
 *   - user có 1 đơn "Đã hoàn tiền" → ví được credit (admin tạo order)
 *   - user có bank account + withdraw PIN (qua API user)
 *
 * Hành động CHÍNH test qua UI:
 *   - user mở Ví → wizard rút (số tiền → Tiếp tục → PIN → Xác nhận rút)
 *   - admin vào tab Rút tiền → bấm Duyệt (confirm dialog)
 *
 * Captcha login đọc từ SVG fallback (local). Dọn user test ở cuối.
 */

const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const USERNAME = `e2ewd${suffix}`.slice(0, 20);
const EMAIL = `e2ewd_${suffix}@test.local`;
const PASSWORD = `Vaff!${suffix}Qx7#`;
const PIN = "246813";
const CASHBACK = 80_000;
const WITHDRAW_AMOUNT = 50_000;

const HIDE_OVERLAYS = ".fixed{display:none !important}";

async function readCaptcha(page: Page): Promise<string> {
  const glyphs = await page.locator("svg.select-none text").allTextContents();
  return glyphs.join("").replace(/\s/g, "");
}

async function loginViaUI(page: Page, username: string, password: string, expectUrl: RegExp) {
  await page.goto("/");
  await page.getByPlaceholder(/Nhập tên đăng nhập|tên đăng nhập/i).first().fill(username);
  await page.getByPlaceholder("Nhập mật khẩu").fill(password);
  const captchaInput = page.getByPlaceholder("Nhập mã");
  await captchaInput.waitFor({ state: "visible", timeout: 10_000 });
  const code = await readCaptcha(page);
  await captchaInput.fill(code);
  await expect(captchaInput).toHaveValue(code);
  await page.getByRole("button", { name: "Đăng nhập" }).last().click();
  await page.waitForURL(expectUrl, { timeout: 20_000 });
}

async function adminApi(): Promise<{ ctx: APIRequestContext; close: () => Promise<void> }> {
  const ctx = await pwRequest.newContext({ baseURL: "http://localhost:3000" });
  const res = await ctx.post("/api/auth/login", { data: { username: "admin", password: "admin123" } });
  expect(res.ok(), "admin api login failed").toBeTruthy();
  return { ctx, close: () => ctx.dispose() };
}

test.describe("withdraw end-to-end (user gửi → admin duyệt)", () => {
  let userId = 0;

  test("luồng rút tiền hoàn chỉnh qua UI", async ({ page }) => {
    test.setTimeout(90_000);

    // ─── 1. Đăng ký user qua API (captcha skip server-side) ───
    const userCtx = await pwRequest.newContext({ baseURL: "http://localhost:3000" });
    const reg = await userCtx.post("/api/auth/register", {
      data: { username: USERNAME, email: EMAIL, password: PASSWORD },
    });
    expect(reg.ok(), `register failed: ${reg.status()} ${await reg.text()}`).toBeTruthy();
    userId = (await reg.json()).user?.id;
    expect(userId).toBeGreaterThan(0);

    // ─── 2. Admin: mark verified + tạo đơn hoàn tiền (credit ví) ───
    const admin = await adminApi();
    const mv = await admin.ctx.post(`/api/admin/users/${userId}`, { data: { action: "mark_verified" } });
    expect(mv.ok(), "mark_verified failed").toBeTruthy();
    const orderRes = await admin.ctx.post("/api/admin/orders", {
      data: { userId, orderCode: `E2EWD-${suffix}`, store: "Shopee", amount: 200_000, cashback: CASHBACK, status: "Đã hoàn tiền" },
    });
    expect(orderRes.ok(), `create order failed: ${await orderRes.text()}`).toBeTruthy();

    // ─── 3. User login API → add bank + PIN ───
    const userLogin = await userCtx.post("/api/auth/login", { data: { username: USERNAME, password: PASSWORD } });
    expect(userLogin.ok(), "user api login failed").toBeTruthy();
    const bankRes = await userCtx.post("/api/bank", {
      data: { bank_code: "VCB", bank_name: "Vietcombank", account_number: "0123456789", account_holder: "NGUYEN VAN E2E" },
    });
    expect(bankRes.ok(), `add bank failed: ${await bankRes.text()}`).toBeTruthy();
    const pinRes = await userCtx.post("/api/withdraw-pin", { data: { new_pin: PIN } });
    expect(pinRes.ok(), `set pin failed: ${await pinRes.text()}`).toBeTruthy();

    // Xác nhận tiền đề đủ trước khi vào UI.
    const pre = await (await userCtx.get("/api/dashboard")).json();
    expect(pre.stats.completedOrders, "phải có >=1 đơn hoàn tiền").toBeGreaterThan(0);
    expect(pre.stats.walletBalance, "ví phải có tiền").toBe(CASHBACK);

    // ─── 4. User login UI → gửi yêu cầu rút (wizard) ───
    await loginViaUI(page, USERNAME, PASSWORD, /\/dashboard/);
    await page.goto("/dashboard?tab=wallet", { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.addStyleTag({ content: HIDE_OVERLAYS });

    await expect(page.getByText("Cần Hoàn Thành Thông Tin")).toHaveCount(0, { timeout: 20_000 });

    const amountInput = page.locator('input[type="number"]').first();
    await amountInput.waitFor({ state: "visible", timeout: 15_000 });
    await amountInput.fill(String(WITHDRAW_AMOUNT));
    await expect(amountInput).toHaveValue(String(WITHDRAW_AMOUNT));
    const continueBtn = page.getByRole("button", { name: /Tiếp tục/ });
    await expect(continueBtn).toBeEnabled({ timeout: 15_000 });
    await continueBtn.click();

    // Step 2: nút "Xác nhận rút" xuất hiện = wizard đã sang bước 2.
    const confirmBtn = page.getByRole("button", { name: /Xác nhận rút/ });
    await confirmBtn.waitFor({ state: "visible", timeout: 15_000 });

    const pinInput = page.locator('input[type="password"]').filter({ visible: true }).first();
    await pinInput.waitFor({ state: "visible", timeout: 10_000 });
    await pinInput.fill(PIN);
    await expect(pinInput).toHaveValue(PIN);
    await expect(confirmBtn).toBeEnabled({ timeout: 10_000 });
    await confirmBtn.click();

    await expect(page.getByText(/đã được gửi/i).first()).toBeVisible({ timeout: 15_000 });

    // Số dư sau khi gửi rút = CASHBACK - WITHDRAW_AMOUNT (đã debit).
    const d1 = await (await userCtx.get("/api/dashboard")).json();
    expect(d1.stats.walletBalance).toBe(CASHBACK - WITHDRAW_AMOUNT);
    expect(d1.stats.pendingWithdrawAmount).toBe(WITHDRAW_AMOUNT);

    // ─── 5. Admin duyệt qua UI ───
    // Xoá cookie user (đang đăng nhập) để trang "/" hiện form login cho admin.
    await page.context().clearCookies();
    page.on("dialog", (dialog) => dialog.accept());
    await loginViaUI(page, "admin", "admin123", /\/admin/);
    await page.goto("/admin?tab=withdrawals&status=pending", { waitUntil: "domcontentloaded" });
    await page.addStyleTag({ content: HIDE_OVERLAYS });

    const approveBtn = page.getByRole("button", { name: "Duyệt" }).first();
    await approveBtn.waitFor({ state: "visible", timeout: 15_000 });
    await approveBtn.click();

    // ─── 6. Trạng thái cuối — poll API thay vì bắt toast (toast tự biến mất nhanh) ───
    await expect.poll(async () => {
      const d = await (await userCtx.get("/api/dashboard")).json();
      return d.stats.pendingWithdrawAmount;
    }, { timeout: 15_000, message: "withdrawal phải được duyệt (pending về 0)" }).toBe(0);

    const d2 = await (await userCtx.get("/api/dashboard")).json();
    expect(d2.stats.totalWithdrawn).toBe(WITHDRAW_AMOUNT);
    expect(d2.stats.walletBalance).toBe(CASHBACK - WITHDRAW_AMOUNT);

    await admin.close();
    await userCtx.dispose();
  });

  test.afterAll(async () => {
    if (!userId) return;
    const admin = await adminApi();
    await admin.ctx.post("/api/admin/users/bulk", { data: { userIds: [userId], action: "delete" } }).catch(() => {});
    await admin.close();
  });
});
