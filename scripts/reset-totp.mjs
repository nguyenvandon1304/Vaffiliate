// Reset TOTP cho 1 user — dùng khi secret cũ bị hỏng (do bug đã fix).
// Chạy: node scripts/reset-totp.mjs <username>
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const username = process.argv[2];
if (!username) {
  console.error("Usage: node scripts/reset-totp.mjs <username>");
  process.exit(1);
}

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "caffiliate.db");
const db = new DatabaseSync(dbPath);

const stmt = db.prepare("UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE username = ?");
const result = stmt.run(username);

if (Number(result.changes) > 0) {
  console.log(`✓ Đã reset TOTP cho user "${username}". Vào /dashboard/security để setup lại.`);
} else {
  console.error(`✗ Không tìm thấy user "${username}".`);
  process.exit(1);
}
