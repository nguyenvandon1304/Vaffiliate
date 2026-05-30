import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest config — unit test cho logic thuần (không cần DB / network).
 *
 * Quy ước:
 *  - Test nằm trong thư mục `tests/`, đặt tên `*.test.ts`.
 *  - Chạy ở môi trường node (không jsdom) vì ta test lib logic, không phải React.
 *  - Alias `@/` trỏ vào `src/` để khớp với tsconfig paths.
 */
export default defineConfig({
  test: {
    environment: "node",
    // Unit test mặc định: CHỈ logic thuần, KHÔNG đụng DB.
    // Integration test (tests/integration) chạy riêng qua `npm run test:integration`.
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/integration/**", "node_modules/**"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
