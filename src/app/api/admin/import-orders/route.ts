import { NextRequest, NextResponse } from "next/server";
import { addImportHistory, importOrders, logAudit } from "@/lib/db";
import type { ImportOrderItem } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  try {
    const body = await request.json() as { items: ImportOrderItem[]; fileName?: string };
    const { items } = body;
    const fileName = (body.fileName ?? "").toString().slice(0, 200) || null;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Không có dữ liệu đơn hàng" }, { status: 400 });
    }

    const result = await importOrders(items);
    await addImportHistory(auth.user.id, fileName, {
      total: result.total,
      matched: result.matched,
      updated: result.updated,
      duplicated: result.duplicated,
      unmatched: result.unmatched,
    });
    await logAudit("admin.import.csv", {
      userId: auth.user.id,
      target: fileName ? `file=${fileName}` : null,
      ip: getClientIp(request.headers),
      userAgent: request.headers.get("user-agent"),
      detail: `total=${result.total}, matched=${result.matched}, updated=${result.updated}, dup=${result.duplicated}, unmatched=${result.unmatched}`,
    });
    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("[ImportOrders] Error:", err);
    return NextResponse.json({ success: false, error: "Lỗi xử lý import" }, { status: 500 });
  }
}
