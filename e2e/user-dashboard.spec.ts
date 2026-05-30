import { test, expect, type Page } from "@playwright/test";

/**
 * E2E sâu phía USER: dùng session user (từ user.setup.ts) → đi qua các trang/tab
 * dashboard → kiểm tra load không lỗi (không error overlay / 5xx, <main> có nội dung).
 *
 * KHÔNG dùng networkidle (dashboard có SSE notifications giữ kết nối mở).
 */

// Tab trong /dashboard (qua ?tab=) + các sub-page riêng.
const USER_ROUTES: { path: string; name: string }[] = [
  { path: "/dashboard", name: "overview" },
  { path: "/dashboard?tab=orders", name: "orders (Đơn hàng)" },
  { path: "/dashboard?tab=wallet", name: "wallet (Ví tiền)" },
  { path: "/dashboard?tab=link-history", name: "link-history (Lịch sử link)" },
  { path: "/dashboard/cashback", name: "create-link (Tạo link)" },
  { path: "/dashboard/referral", name: "referral (Giới thiệu)" },
  { path: "/dashboard/help", name: "help (Hướng dẫn)" },
  { path: "/dashboard/spin", name: "spin (Vòng quay)" },
  { path: "/dashboard/wishlist", name: "wishlist" },
  { path: "/dashboard/security", name: "security (Bảo mật)" },
];

async function expectNoAppError(page: Page) {
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(
    /Application error|Unhandled Runtime Error|This page could not be found|Internal Server Error/i,
  );
}

test.describe("user dashboard: đi qua các tab (đã đăng nhập)", () => {
  test("vào được /dashboard với session user", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("main").first()).toBeVisible();
    await expectNoAppError(page);
  });

  for (const route of USER_ROUTES) {
    test(`route "${route.name}" load không lỗi`, async ({ page }) => {
      const serverErrors: string[] = [];
      page.on("response", (res) => {
        if (res.status() >= 500 && !res.url().includes("/notifications/stream")) {
          serverErrors.push(`${res.status()} ${res.url()}`);
        }
      });

      await page.goto(route.path, { waitUntil: "domcontentloaded" });

      const main = page.locator("main").first();
      await expect(main).toBeVisible({ timeout: 15_000 });
      await expect.poll(async () => (await main.innerText()).trim().length, {
        timeout: 15_000,
      }).toBeGreaterThan(0);

      await expectNoAppError(page);
      // Không redirect ra ngoài dashboard (session còn hiệu lực).
      expect(page.url()).toContain("/dashboard");

      await page.waitForTimeout(1200);
      expect(serverErrors, `5xx khi load ${route.name}: ${serverErrors.join(", ")}`).toHaveLength(0);
    });
  }
});
