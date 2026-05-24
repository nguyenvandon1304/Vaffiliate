import { NextRequest, NextResponse } from "next/server";
import { setWithdrawPin, verifyWithdrawPin } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const auth = await requireVerifiedUser(request);
  if (!auth.user) return auth.response;

  const body = await request.json();
  const { current_pin, new_pin } = body;

  if (!new_pin || new_pin.length < 4 || new_pin.length > 6) {
    return NextResponse.json({ success: false, error: "Mật khẩu rút tiền phải từ 4-6 ký tự" }, { status: 400 });
  }

  if (auth.user.has_withdraw_pin) {
    if (!current_pin) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập mật khẩu rút tiền hiện tại" }, { status: 400 });
    }
    const result = await verifyWithdrawPin(auth.user.id, current_pin);
    if (!result.valid) {
      if (result.lockedUntil) {
        const minutes = Math.max(1, Math.ceil((new Date(result.lockedUntil).getTime() - Date.now()) / 60000));
        return NextResponse.json({ success: false, error: `Mật khẩu rút tiền bị khoá tạm thời. Thử lại sau ~${minutes} phút.` }, { status: 400 });
      }
      if (result.remaining !== undefined) {
        return NextResponse.json({ success: false, error: `Mật khẩu rút tiền hiện tại không đúng (còn ${result.remaining} lần thử)` }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: "Mật khẩu rút tiền hiện tại không đúng" }, { status: 400 });
    }
  }

  const result = await setWithdrawPin(auth.user.id, new_pin);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: auth.user.has_withdraw_pin ? "Đổi mật khẩu rút tiền thành công" : "Cài đặt mật khẩu rút tiền thành công",
  });
}
