import { test, expect } from "@playwright/test";

/**
 * E2E smoke — UI load + auth gating + điều hướng cơ bản.
 * Không phụ thuộc API ngoài (Shopee/GoAffiliate) hay email thật.
 * Dùng selector theo placeholder (ổn định) thay vì text nút (dễ trùng).
 */

test.describe("landing + auth UI", () => {
  test("trang chủ load và có form đăng nhập (ô user + password)", async ({ page }) => {
    await page.goto("/");
    // Form login mặc định: ô tên đăng nhập + ô mật khẩu.
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    // Có chữ thương hiệu V-Affiliate đâu đó trên trang.
    await expect(page.getByText(/V-?Affiliate/i).first()).toBeVisible();
  });

  test("chuyển sang Đăng ký hiển thị ô xác nhận mật khẩu", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Đăng ký miễn phí/ }).click();
    // Form đăng ký có ô "Nhập lại mật khẩu" (confirm) — chỉ có ở register.
    await expect(page.getByPlaceholder("Nhập lại mật khẩu")).toBeVisible();
  });

  test("đăng nhập sai KHÔNG vào được dashboard", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/Nhập tên đăng nhập|tên đăng nhập/i).first().fill("nope_user_e2e");
    await page.getByPlaceholder("Nhập mật khẩu").fill("wrong-password-123");
    // Submit form bằng Enter trong ô password (tránh nút text trùng nhau).
    await page.getByPlaceholder("Nhập mật khẩu").press("Enter");
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain("/dashboard");
  });
});

test.describe("auth gating", () => {
  test("truy cập /dashboard khi chưa đăng nhập → không ở lại dashboard", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    expect(page.url()).not.toContain("/dashboard");
  });

  test("API /api/auth/me không đăng nhập trả 401", async ({ request }) => {
    const res = await request.get("/api/auth/me");
    expect(res.status()).toBe(401);
  });

  test("API /api/health trả 200 + db ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.db).toBe(true);
  });

  test("API /api/admin/stats không đăng nhập trả 401", async ({ request }) => {
    const res = await request.get("/api/admin/stats");
    expect(res.status()).toBe(401);
  });
});
