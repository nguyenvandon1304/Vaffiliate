import { test, expect, type Page } from "@playwright/test";

/**
 * E2E sâu: dùng session admin (từ auth.setup.ts) → đi qua TỪNG tab admin →
 * kiểm tra tab load không lỗi.
 *
 * "Không lỗi" = không có Next.js error overlay / "Application error", vùng <main>
 * có nội dung, và không có response 5xx khi load tab.
 *
 * KHÔNG dùng networkidle (trang admin có SSE giữ kết nối mở mãi).
 */

// Các tab admin (khớp VALID_TABS trong src/app/admin/page.tsx).
const ADMIN_TABS: { key: string; heading?: string }[] = [
  { key: "overview", heading: "Tổng Quan Hệ Thống" },
  { key: "analytics" },
  { key: "finance" },
  { key: "users" },
  { key: "orders" },
  { key: "withdrawals" },
  { key: "balance", heading: "Nạp / Trừ Tiền" },
  { key: "spin" },
  { key: "referrals" },
  { key: "import" },
  { key: "import-history" },
  { key: "broadcast" },
  { key: "email" },
  { key: "fraud" },
  { key: "ip-blocklist" },
  { key: "settings" },
];

async function expectNoAppError(page: Page) {
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(
    /Application error|Unhandled Runtime Error|This page could not be found|Internal Server Error/i,
  );
}

test.describe("admin: đi qua từng tab (đã đăng nhập)", () => {
  test("vào được /admin với session admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator("main")).toBeVisible();
    await expectNoAppError(page);
  });

  for (const tab of ADMIN_TABS) {
    test(`tab "${tab.key}" load không lỗi`, async ({ page }) => {
      const serverErrors: string[] = [];
      page.on("response", (res) => {
        // Bỏ qua SSE stream (long-lived) khỏi việc đánh giá 5xx.
        if (res.status() >= 500 && !res.url().includes("/notifications/stream")) {
          serverErrors.push(`${res.status()} ${res.url()}`);
        }
      });

      const url = tab.key === "overview" ? "/admin" : `/admin?tab=${tab.key}`;
      await page.goto(url, { waitUntil: "domcontentloaded" });

      // Chờ <main> render + có nội dung (thay cho networkidle).
      const main = page.locator("main");
      await expect(main).toBeVisible({ timeout: 15_000 });
      await expect.poll(async () => (await main.innerText()).trim().length, {
        timeout: 15_000,
      }).toBeGreaterThan(0);

      await expectNoAppError(page);

      if (tab.heading) {
        await expect(page.getByText(tab.heading, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
      }

      // Cho data fetch của tab kịp chạy rồi mới kết luận 5xx.
      await page.waitForTimeout(1500);
      expect(serverErrors, `5xx khi load tab ${tab.key}: ${serverErrors.join(", ")}`).toHaveLength(0);
    });
  }
});
