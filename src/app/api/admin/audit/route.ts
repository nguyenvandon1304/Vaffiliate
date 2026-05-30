import { NextRequest, NextResponse } from "next/server";
import { searchAuditLogs, getDistinctAuditActions, type AuditLogFilter } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/admin/audit
 *
 * Query params:
 * - action?: string
 * - userId?: number
 * - username?: string
 * - ip?: string
 * - search?: string (free text — search action/target/detail/username)
 * - fromDate?: yyyy-mm-dd
 * - toDate?: yyyy-mm-dd
 * - limit?: number (default 200, max 5000)
 * - offset?: number
 * - export?: "csv" → trả về CSV file (limit max 10000)
 * - actions?: "list" → trả về danh sách distinct actions cho dropdown
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const { searchParams } = new URL(request.url);

  // Mode: list distinct actions
  if (searchParams.get("actions") === "list") {
    const actions = await getDistinctAuditActions();
    return NextResponse.json({ success: true, actions });
  }

  const filter: AuditLogFilter = {
    action: searchParams.get("action") || undefined,
    userId: searchParams.get("userId") ? Number(searchParams.get("userId")) : undefined,
    username: searchParams.get("username") || undefined,
    ip: searchParams.get("ip") || undefined,
    search: searchParams.get("search") || undefined,
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    limit: Number(searchParams.get("limit") ?? 200) || 200,
    offset: Number(searchParams.get("offset") ?? 0) || 0,
  };

  // Mode: export CSV
  if (searchParams.get("export") === "csv") {
    const csvFilter = { ...filter, limit: 10_000, offset: 0 };
    const result = await searchAuditLogs(csvFilter);
    const csv = buildCsv(result.rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const result = await searchAuditLogs(filter);
  return NextResponse.json({ success: true, ...result });
}

/**
 * Build CSV string từ audit log rows. Escape double quotes + wrap với quotes.
 */
function buildCsv(rows: ReturnType<typeof Object>[]): string {
  const headers = ["id", "created_at", "user_id", "username", "action", "target", "ip", "user_agent", "detail"];
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    // CSV formula injection guard — vô hiệu hoá field bắt đầu bằng = + - @ tab CR.
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    s = s.replace(/"/g, '""');
    return `"${s}"`;
  };
  const lines = [headers.join(",")];
  for (const r of rows as Array<Record<string, unknown>>) {
    lines.push([
      escape(r.id),
      escape(r.created_at),
      escape(r.user_id),
      escape(r.username),
      escape(r.action),
      escape(r.target),
      escape(r.ip),
      escape(r.user_agent),
      escape(r.detail),
    ].join(","));
  }
  // BOM cho Excel hiểu UTF-8
  return "\ufeff" + lines.join("\n");
}
