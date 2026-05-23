// Khôi phục user từ caffiliate.backup.db sang caffiliate.db.
// - Chỉ insert user chưa có trong DB mới (theo username)
// - Đánh dấu email_verified = 1 cho user cũ (đã sử dụng trước khi có rule verify)
// - Bỏ qua sessions cũ (token đã hết hạn theo logic mới, lại đụng schema cột mới)
//
// Chạy: node scripts/restore-users.mjs
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";

if (!fs.existsSync("caffiliate.backup.db")) {
  console.error("Không tìm thấy caffiliate.backup.db");
  process.exit(1);
}

const dst = new DatabaseSync("caffiliate.db");
dst.exec("PRAGMA journal_mode = WAL");
dst.exec("PRAGMA foreign_keys = ON");

const src = new DatabaseSync("caffiliate.backup.db");

const srcCols = src.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
console.log("Cột users (backup):", srcCols.join(", "));

// Đọc tất cả user từ backup
const backupUsers = src.prepare("SELECT * FROM users").all();
console.log(`Backup có ${backupUsers.length} user.`);

let restored = 0;
let skipped = 0;

for (const u of backupUsers) {
  const exists = dst.prepare("SELECT id FROM users WHERE username = ?").get(u.username);
  if (exists) {
    console.log(`  - skip (đã có): ${u.username}`);
    skipped++;
    continue;
  }
  // Insert user — đánh dấu email_verified = 1 (đây là user cũ trước khi áp rule verify).
  dst
    .prepare(
      `INSERT INTO users
        (username, email, password_hash, salt, display_name, phone,
         withdraw_pin_hash, withdraw_pin_salt, role, is_active,
         email_verified, created_at, updated_at, last_login)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    )
    .run(
      u.username,
      u.email,
      u.password_hash,
      u.salt ?? "",
      u.display_name ?? null,
      u.phone ?? null,
      u.withdraw_pin_hash ?? null,
      u.withdraw_pin_salt ?? null,
      u.role ?? "user",
      u.is_active ?? 1,
      u.created_at ?? new Date().toISOString(),
      u.updated_at ?? new Date().toISOString(),
      u.last_login ?? null,
    );
  console.log(`  + restored: ${u.username} (${u.email})`);
  restored++;
}

// Khôi phục thêm các bảng phụ thuộc nếu user backup có dữ liệu (orders, wallet, bank_accounts, notifications, affiliate_links)
const aux = ["orders", "wallet", "bank_accounts", "notifications", "affiliate_links"];
for (const table of aux) {
  // Map user_id cũ → user_id mới (theo username)
  const rows = src.prepare(`SELECT * FROM ${table}`).all();
  if (rows.length === 0) continue;
  let copied = 0;
  for (const r of rows) {
    const oldUser = src.prepare("SELECT username FROM users WHERE id = ?").get(r.user_id);
    if (!oldUser) continue;
    const newUser = dst.prepare("SELECT id FROM users WHERE username = ?").get(oldUser.username);
    if (!newUser) continue;
    // Nếu order_code đã tồn tại thì skip (UNIQUE constraint)
    if (table === "orders") {
      const dup = dst.prepare("SELECT id FROM orders WHERE order_code = ?").get(r.order_code);
      if (dup) continue;
    }
    const cols = Object.keys(r).filter((c) => c !== "id");
    const placeholders = cols.map(() => "?").join(", ");
    const vals = cols.map((c) => (c === "user_id" ? newUser.id : r[c]));
    try {
      dst.prepare(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`).run(...vals);
      copied++;
    } catch (err) {
      console.log(`    ! ${table} skip 1 row: ${err.message}`);
    }
  }
  if (copied > 0) console.log(`  ✓ ${table}: copied ${copied} rows`);
}

console.log(`\nXong. Restored ${restored} user (${skipped} skip).`);
src.close();
dst.close();
