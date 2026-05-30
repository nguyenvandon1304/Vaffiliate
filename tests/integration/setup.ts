/**
 * Setup cho integration test — nạp biến môi trường từ .env.local (chứa DATABASE_URL
 * trỏ DB dev) trước khi bất kỳ test nào import @/lib/db.
 *
 * Không dùng thư viện dotenv (tránh thêm dependency) — tự parse file đơn giản.
 * Set INTEGRATION_DB=1 để qua được guard assertSafeTestDb().
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "../../.env.local");

try {
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // Bỏ quote bao quanh nếu có.
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // Không ghi đè biến đã có sẵn từ shell (cho phép override khi cần).
    if (process.env[key] === undefined) process.env[key] = val;
  }
} catch (e) {
  console.warn("[integration setup] Không đọc được .env.local:", (e as Error).message);
}

// Đánh dấu chủ đích chạy integration test.
process.env.INTEGRATION_DB = "1";
