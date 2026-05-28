import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb, logAudit } from "@/lib/db";
import { csvResponse, toCSV, formatCSVDate } from "@/lib/csv";
import { getClientIp } from "@/lib/turnstile";

interface UserExportRow {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  role: string;
  is_active: number;
  email_verified: number;
  created_at: string;
  last_login: string | null;
}

/**
 * GET /api/admin/export/users — export tất cả user thành CSV.
 * Audit log mỗi lần export để track admin activity.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const db = await getDb();
  const rows = await db.all(
    `SELECT id, username, email, display_name, phone, role, is_active, email_verified, created_at, last_login
     FROM users ORDER BY id ASC`,
    [],
  );

  const csv = toCSV(rows as unknown as UserExportRow[], [
    { key: "id", label: "ID" },
    { key: "username", label: "Tên đăng nhập" },
    { key: "email", label: "Email" },
    { key: "display_name", label: "Họ tên" },
    { key: "phone", label: "SĐT" },
    { key: "role", label: "Role" },
    { key: "is_active", label: "Active", format: (v) => (Number(v) === 1 ? "1" : "0") },
    { key: "email_verified", label: "Email verified", format: (v) => (Number(v) === 1 ? "1" : "0") },
    { key: "created_at", label: "Ngày đăng ký", format: (v) => formatCSVDate(v) },
    { key: "last_login", label: "Login gần nhất", format: (v) => formatCSVDate(v) },
  ]);

  await logAudit("admin.export_users", {
    userId: auth.user.id,
    detail: `count=${rows.length}`,
    ip: getClientIp(request.headers),
  });

  const today = new Date().toISOString().slice(0, 10);
  return csvResponse(csv, `users_${today}.csv`);
}
