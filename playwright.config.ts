import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E config.
 *
 * Chạy: npm run test:e2e
 *  - Tự khởi động `npm run dev` (DB dev qua .env.local) nếu chưa chạy.
 *  - 3 project:
 *    - "setup": đăng nhập admin 1 lần → lưu storageState (e2e/.auth/admin.json)
 *    - "admin": các test cần đăng nhập admin (dùng lại storageState)
 *    - "public": test không đăng nhập (landing, auth gating)
 *
 * Lưu ý: KHÔNG dùng waitForLoadState("networkidle") vì trang admin có SSE
 * (/api/notifications/stream) giữ kết nối mở → networkidle không bao giờ xảy ra.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 45_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    headless: true,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "user-setup",
      testMatch: /user\.setup\.ts/,
      teardown: "user-teardown",
    },
    { name: "user-teardown", testMatch: /user\.teardown\.ts/ },
    {
      name: "public",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "admin",
      testMatch: /admin-tabs\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/admin.json" },
    },
    {
      name: "user",
      testMatch: /user-dashboard\.spec\.ts/,
      dependencies: ["user-setup"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
