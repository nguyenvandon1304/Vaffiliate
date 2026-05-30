import { NextRequest, NextResponse } from "next/server";
import { updateUserProfile, verifyUserPassword } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isEmail, pickString } from "@/lib/validate";

export async function PUT(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));

  const display_name = pickString(body?.display_name, 80);
  const email = pickString(body?.email, 200);
  const phone = pickString(body?.phone, 30);
  const current_password = typeof body?.current_password === "string" ? body.current_password : "";

  if (email !== undefined && !isEmail(email)) {
    return NextResponse.json({ success: false, error: "Email không hợp lệ" }, { status: 400 });
  }

  // Step-up bảo mật: đổi email là thao tác nhạy cảm (có thể dẫn tới chiếm tài
  // khoản qua forgot-password). Nếu email thực sự đổi → bắt buộc nhập đúng mật
  // khẩu hiện tại. So sánh với email hiện tại để chỉ yêu cầu khi cần.
  if (email !== undefined && email.toLowerCase() !== (auth.user.email ?? "").toLowerCase()) {
    if (!current_password) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập mật khẩu hiện tại để đổi email", needPassword: true },
        { status: 400 },
      );
    }
    const ok = await verifyUserPassword(auth.user.id, current_password);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Mật khẩu hiện tại không đúng" }, { status: 400 });
    }
  }

  const result = await updateUserProfile(auth.user.id, { display_name, email, phone });

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: result.emailChanged
      ? "Đã cập nhật. Email mới cần được xác minh lại — vui lòng kiểm tra hộp thư."
      : "Cập nhật thành công",
    emailChanged: result.emailChanged ?? false,
  });
}
