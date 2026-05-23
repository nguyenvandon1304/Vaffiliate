import { NextRequest, NextResponse } from "next/server";
import { deleteUserAccount, logAudit } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";

/** DELETE /api/auth/account — xoá tài khoản hiện tại, yêu cầu password. */
export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response;

  const body = await request.json().catch(() => ({}));
  const password = body?.password;
  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ success: false, error: "Vui lòng nhập mật khẩu để xác nhận" }, { status: 400 });
  }

  const username = auth.user.username;
  const result = await deleteUserAccount(auth.user.id, password);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  await logAudit("user.account.delete", {
    userId: null, // user vừa bị xoá
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
    detail: `username=${username}`,
  });

  const response = NextResponse.json({ success: true, message: "Đã xoá tài khoản" });
  response.cookies.delete("session_token");
  return response;
}
