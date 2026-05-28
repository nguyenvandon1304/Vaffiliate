import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb, logAudit } from "@/lib/db";
import { csvResponse, toCSV, formatCSVDate } from "@/lib/csv";
import { getClientIp } from "@/lib/turnstile";

interface OrderExportRow {
  id: number;
  order_code: string;
  user_id: number;
  username: string | null;
  display_name: string | null;
  store: string;
  amount: number;
  cashback: number;
  status: string;
  created_at: string;
}

/** GET /api/admin/export/orders?from=YYYY-MM-DD&to=YYYY-MM-DD — export orders CSV. */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const db = await getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (from) {
    conditions.push("o.created_at >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("o.created_at < ?");
    // Plus 1 day để inclusive
    const next = new Date(to);
    next.setDate(next.getDate() + 1);
    params.push(next.toISOString().slice(0, 10));
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await db.all(
    `SELECT o.id, o.order_code, o.user_id, u.username, u.display_name,
            o.store, o.amount, o.cashback, o.status, o.created_at
     FROM orders o LEFT JOIN users u ON o.user_id = u.id
     ${where}
     ORDER BY o.created_at DESC`,
    params,
  );

  const csv = toCSV(rows as unknown as OrderExportRow[], [
    { key: "id", label: "ID" },
    { key: "order_code", label: "Mã đơn" },
    { key: "user_id", label: "User ID" },
    { key: "username", label: "Username" },
    { key: "display_name", label: "Họ tên" },
    { key: "store", label: "Cửa hàng" },
    { key: "amount", label: "Giá trị (đ)" },
    { key: "cashback", label: "Cashback (đ)" },
    { key: "status", label: "Trạng thái" },
    { key: "created_at", label: "Ngày tạo", format: (v) => formatCSVDate(v) },
  ]);

  await logAudit("admin.export_orders", {
    userId: auth.user.id,
    detail: `count=${rows.length}; from=${from ?? ""}; to=${to ?? ""}`,
    ip: getClientIp(request.headers),
  });

  const today = new Date().toISOString().slice(0, 10);
  const suffix = from || to ? `_${from ?? "all"}_${to ?? today}` : "";
  return csvResponse(csv, `orders${suffix}.csv`);
}
