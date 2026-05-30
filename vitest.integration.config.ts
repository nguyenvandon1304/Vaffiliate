import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Config riêng cho INTEGRATION test — kết nối DB thật (dev).
 *
 * Chạy: npm run test:integration
 *
 * An toàn:
 *  - setupFiles nạp .env.local (DB dev) + set INTEGRATION_DB=1.
 *  - helpers.assertSafeTestDb() chặn nếu DATABASE_URL trỏ vào production.
 *  - singleThread + không chạy song song để tránh tranh chấp DB.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globals: true,
    setupFiles: ["./tests/integration/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
