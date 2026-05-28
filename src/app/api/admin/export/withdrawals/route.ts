import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb, logAudit } from "@/lib/db";
import { csvResponse, toCSV, formatCSVDate } from "@/lib/csv";
import { getClientIp } from "@/lib/turnstile";

interface WithdrawalExportRow {
  id: number;
  user_id: number;
  username: string | null;
  display_name: string | null;
  amount: number;
  status: string;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string | null;
}

/** GET /api/admin/export/withdrawals — export tất cả yêu cầu rút CSV. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const db = await getDb();
  const rows = await db.all(
    `SELECT w.id, w.user_id, u.username, u.display_name,
            w.amount, w.status,
            b.bank_name, b.account_number, b.account_holder,
            w.admin_note, w.created_at, w.updated_at
     FROM withdrawals w
     LEFT JOIN users u ON w.user_id = u.id
     LEFT JOIN bank_accounts b ON w.bank_account_id = b.id
     ORDER BY w.created_at DESC`,
    [],
  );

  const csv = toCSV(rows as unknown as WithdrawalExportRow[], [
    { key: "id", label: "ID" },
    { key: "user_id", label: "User ID" },
    { key: "username", label: "Username" },
    { key: "display_name", label: "Họ tên" },
    { key: "amount", label: "Số tiền (đ)" },
    { key: "status", label: "Trạng thái" },
    { key: "bank_name", label: "Ngân hàng" },
    { key: "account_number", label: "Số tài khoản" },
    { key: "account_holder", label: "Chủ tài khoản" },
    { key: "admin_note", label: "Ghi chú admin" },
    { key: "created_at", label: "Ngày tạo", format: (v) => formatCSVDate(v) },
    { key: "updated_at", label: "Ngày duyệt", format: (v) => formatCSVDate(v) },
  ]);

  await logAudit("admin.export_withdrawals", {
    userId: auth.user.id,
    detail: `count=${rows.length}`,
    ip: getClientIp(request.headers),
  });

  const today = new Date().toISOString().slice(0, 10);
  return csvResponse(csv, `withdrawals_${today}.csv`);
}
