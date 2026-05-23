import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken, logAudit } from "@/lib/db";
import { getClientIp } from "@/lib/turnstile";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : null;
  if (!token) {
    return NextResponse.json({ success: false, error: "Thiếu token" }, { status: 400 });
  }

  const result = await verifyEmailToken(token);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  await logAudit("user.email.verified", {
    userId: result.userId ?? null,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ success: true, message: "Xác thực email thành công" });
}
