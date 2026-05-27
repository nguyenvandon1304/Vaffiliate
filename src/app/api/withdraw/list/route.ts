import { NextRequest, NextResponse } from "next/server";
import { getUserWithdrawals } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/**
 * /api/withdraw/list — lấy lịch sử yêu cầu rút tiền của user hiện tại.
 * Trả về 50 yêu cầu gần nhất kèm thông tin ngân hàng.
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const withdrawals = await getUserWithdrawals(auth.user.id);
  return NextResponse.json({ success: true, withdrawals });
}
