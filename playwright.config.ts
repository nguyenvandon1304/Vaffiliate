import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config.
 *
 * Chạy: npm run test:e2e
 *  - Tự khởi động `npm run dev` (DB dev qua .env.local) nếu chưa chạy.
 *  - Test trong thư mục `e2e/`.
 *  - Chỉ Chromium (đủ cho smoke; thêm browser khác nếu cần).
 *
 * E2E cố ý CHỈ test các flow không phụ thuộc API ngoài (Shopee/GoAffiliate) và
 * không cần email thật — tập trung vào UI load + auth gating + điều hướng.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    headless: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
