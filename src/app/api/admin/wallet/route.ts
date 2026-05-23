import { NextRequest, NextResponse } from "next/server";
import { getWalletBalance, logAudit, resetWallet } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  const result = await getWalletBalance(username);
  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });

  const result = await resetWallet(username);
  if (!result.success) return NextResponse.json(result, { status: 400 });

  await logAudit("admin.wallet.reset", {
    userId: auth.user.id,
    target: username,
    ip: getClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
  });

  return NextResponse.json({ success: true, message: `Đã xóa toàn bộ lịch sử ví của ${username}` });
}
