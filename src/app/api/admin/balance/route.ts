import { NextRequest, NextResponse } from "next/server";
import { addBalance, logAudit, subtractBalance } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";
import { isPositiveInt } from "@/lib/validate";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  const body = await request.json();
  const { username, amount, type, label } = body;

  if (!username || amount === undefined || amount === null || !type) {
    return NextResponse.json({ success: false, error: "Thiếu thông tin: username, amount, type (credit/debit)" }, { status: 400 });
  }
  if (!isPositiveInt(amount)) {
    return NextResponse.json({ success: false, error: "Số tiền phải là số nguyên dương" }, { status: 400 });
  }

  const ip = getClientIp(request.headers);
  const userAgent = request.headers.get("user-agent");

  if (type === "credit") {
    const result = await addBalance(username, amount, label || "Biến động số dư");
    if (!result.success) return NextResponse.json(result, { status: 400 });
    await logAudit("admin.balance.credit", { userId: auth.user.id, target: username, ip, userAgent, detail: `+${amount}: ${label ?? ""}` });
    return NextResponse.json({ success: true, message: `Đã cộng ${amount.toLocaleString("vi-VN")}đ cho ${username}` });
  }

  if (type === "debit") {
    const result = await subtractBalance(username, amount, label || "Biến động số dư");
    if (!result.success) return NextResponse.json(result, { status: 400 });
    await logAudit("admin.balance.debit", { userId: auth.user.id, target: username, ip, userAgent, detail: `-${amount}: ${label ?? ""}` });
    return NextResponse.json({ success: true, message: `Đã trừ ${amount.toLocaleString("vi-VN")}đ của ${username}` });
  }

  return NextResponse.json({ success: false, error: "type phải là 'credit' hoặc 'debit'" }, { status: 400 });
}
