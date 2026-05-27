import { NextRequest, NextResponse } from "next/server";
import { addBalance, logAudit, subtractBalance, createNotification, getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";
import { isPositiveInt } from "@/lib/validate";

/**
 * Tạo notification cho user khi admin điều chỉnh số dư.
 * Tách ra hàm riêng vì gọi 2 lần (credit + debit) với template khác nhau.
 *
 * Fail-safe: nếu không tìm thấy user_id hoặc DB lỗi → log warn nhưng KHÔNG
 * fail toàn bộ request (balance đã cộng/trừ thành công).
 */
async function notifyBalanceChange(
  username: string,
  type: "credit" | "debit",
  amount: number,
  label: string,
): Promise<void> {
  try {
    const db = await getDb();
    const row = await db.get(
      "SELECT id FROM users WHERE LOWER(username) = LOWER(?)",
      [username],
    );
    if (!row?.id) {
      console.warn(`[balance] notifyBalanceChange: user '${username}' not found`);
      return;
    }
    const userId = Number(row.id);
    const sign = type === "credit" ? "+" : "-";
    const formatted = amount.toLocaleString("vi-VN");
    const title = type === "credit" ? "💰 Tiền vừa về ví của bạn!" : "📤 Số dư vừa được điều chỉnh";
    const message =
      type === "credit"
        ? `Chúc mừng! Ví của bạn vừa được cộng thêm ${sign}${formatted}đ.${label ? ` Lý do: ${label}.` : ""} Mở ví ngay để kiểm tra số dư mới nhé! 🎉`
        : `Số dư của bạn vừa được điều chỉnh ${sign}${formatted}đ.${label ? ` Lý do: ${label}.` : ""} Vào ví để xem chi tiết. Nếu có thắc mắc, hãy liên hệ V-Affiliate ngay nhé!`;
    await createNotification(userId, title, message, "wallet");
  } catch (e) {
    console.error("[balance] notifyBalanceChange failed:", e);
  }
}

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
  const noteLabel = label || "Biến động số dư";

  if (type === "credit") {
    const result = await addBalance(username, amount, noteLabel);
    if (!result.success) return NextResponse.json(result, { status: 400 });
    await logAudit("admin.balance.credit", { userId: auth.user.id, target: username, ip, userAgent, detail: `+${amount}: ${label ?? ""}` });
    await notifyBalanceChange(username, "credit", amount, noteLabel);
    return NextResponse.json({ success: true, message: `Đã cộng ${amount.toLocaleString("vi-VN")}đ cho ${username}` });
  }

  if (type === "debit") {
    const result = await subtractBalance(username, amount, noteLabel);
    if (!result.success) return NextResponse.json(result, { status: 400 });
    await logAudit("admin.balance.debit", { userId: auth.user.id, target: username, ip, userAgent, detail: `-${amount}: ${label ?? ""}` });
    await notifyBalanceChange(username, "debit", amount, noteLabel);
    return NextResponse.json({ success: true, message: `Đã trừ ${amount.toLocaleString("vi-VN")}đ của ${username}` });
  }

  return NextResponse.json({ success: false, error: "type phải là 'credit' hoặc 'debit'" }, { status: 400 });
}
