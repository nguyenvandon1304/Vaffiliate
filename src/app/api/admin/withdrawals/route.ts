import { NextRequest, NextResponse } from "next/server";
import {
  getAllWithdrawalsPaged,
  getDb,
  logAudit,
  updateWithdrawalStatus,
  type WithdrawalListFilter,
} from "@/lib/db";
import { grantBadge } from "@/lib/achievements";
import { requireAdmin } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const url = new URL(request.url);
  const filter: WithdrawalListFilter = {
    search: url.searchParams.get("search") ?? undefined,
    status: (url.searchParams.get("status") as WithdrawalListFilter["status"]) ?? undefined,
    fromDate: url.searchParams.get("from") ?? undefined,
    toDate: url.searchParams.get("to") ?? undefined,
    page: Number(url.searchParams.get("page")) || 1,
    pageSize: Number(url.searchParams.get("pageSize")) || 20,
  };

  const result = await getAllWithdrawalsPaged(filter);
  return NextResponse.json({
    success: true,
    withdrawals: result.rows,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  });
}

/**
 * PATCH /api/admin/withdrawals
 *   body { id, status: "approved" | "rejected", note?: string }
 *   note dùng cho rejected — sẽ gửi cho user kèm thông báo.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const { id, status, note } = await request.json();
  if (!id || !status) return NextResponse.json({ success: false, error: "id và status required" }, { status: 400 });
  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ success: false, error: "status phải là 'approved' hoặc 'rejected'" }, { status: 400 });
  }

  const result = await updateWithdrawalStatus(id, status, note);
  if (!result.success) return NextResponse.json(result, { status: 400 });

  await logAudit(`admin.withdrawal.${status}`, {
    userId: auth.user.id,
    target: `withdrawal_id=${id}`,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
    detail: note ? `note=${note}` : null,
  });

  // Grant badge "first_withdraw" cho user khi withdrawal được approve.
  if (status === "approved") {
    try {
      const db = await getDb();
      const wd = await db.get(
        "SELECT user_id FROM withdrawals WHERE id = ?",
        [id],
      );
      if (wd) void grantBadge(Number(wd.user_id), "first_withdraw");
    } catch (e) {
      console.warn("[withdraw] grant badge failed:", e);
    }
  }

  return NextResponse.json(result);
}
