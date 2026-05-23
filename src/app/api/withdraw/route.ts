import { NextRequest, NextResponse } from "next/server";
import { createNotification, createWithdrawRequest, getSetting } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  // Admin có thể tắt rút tiền (vd. khi đối soát hệ thống) hoặc đổi min withdraw.
  if ((await getSetting("withdrawals_enabled")) === "0") {
    return NextResponse.json(
      { success: false, error: "Tính năng rút tiền đang tạm khoá. Vui lòng quay lại sau." },
      { status: 503 },
    );
  }
  const minWithdraw = Math.max(0, Number(await getSetting("min_withdraw_amount")) || 50000);

  const body = await request.json();
  const { bank_account_id, amount, pin } = body;

  if (!bank_account_id || !amount || !pin) {
    return NextResponse.json({ success: false, error: "Thiếu thông tin" }, { status: 400 });
  }

  if (amount < minWithdraw) {
    return NextResponse.json({ success: false, error: `Số tiền rút tối thiểu là ${minWithdraw.toLocaleString("vi-VN")}đ` }, { status: 400 });
  }

  const result = await createWithdrawRequest(auth.user.id, bank_account_id, amount, pin);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  await createNotification(auth.user.id, "Yêu cầu rút tiền", `Bạn đã gửi yêu cầu rút ${amount.toLocaleString("vi-VN")}đ. Đang xử lý...`, "withdraw");

  return NextResponse.json({ success: true, message: "Yêu cầu rút tiền đã được gửi" });
}
