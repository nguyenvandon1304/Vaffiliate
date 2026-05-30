import { NextRequest, NextResponse } from "next/server";
import { addImportHistory, importOrders, logAudit } from "@/lib/db";
import type { ImportOrderItem } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getClientIp } from "@/lib/turnstile";
import { notifyCustom } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response;

  try {
    const body = await request.json() as { items: ImportOrderItem[]; fileName?: string };
    const { items } = body;
    const fileName = (body.fileName ?? "").toString().slice(0, 200) || null;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Không có dữ liệu đơn hàng" }, { status: 400 });
    }

    // C2: giới hạn số dòng/lần import — tránh transaction quá dài gây lock/DoS.
    const MAX_ITEMS = 5000;
    if (items.length > MAX_ITEMS) {
      return NextResponse.json(
        { success: false, error: `Tối đa ${MAX_ITEMS} đơn mỗi lần import. File có ${items.length} đơn — vui lòng chia nhỏ.` },
        { status: 400 },
      );
    }

    // C1: validate + sanitize từng item TRƯỚC khi vào importOrders. Chặn
    // commission/amount là NaN, âm, hoặc vô lý → ngăn ghi rác/âm vào ví.
    const MAX_MONEY = 1_000_000_000; // 1 tỷ — chặn giá trị phi lý
    const cleanItems: ImportOrderItem[] = [];
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      const orderCode = String(raw.orderCode ?? "").trim();
      const itemId = String(raw.itemId ?? "").trim();
      if (!orderCode || !itemId) {
        return NextResponse.json(
          { success: false, error: "Dữ liệu import thiếu mã đơn hoặc itemId" },
          { status: 400 },
        );
      }
      const amount = Number(raw.amount);
      const commission = Number(raw.commission);
      if (!Number.isFinite(amount) || amount < 0 || amount > MAX_MONEY ||
          !Number.isFinite(commission) || commission < 0 || commission > MAX_MONEY) {
        return NextResponse.json(
          { success: false, error: `Đơn ${orderCode}: số tiền/hoa hồng không hợp lệ` },
          { status: 400 },
        );
      }
      cleanItems.push({
        orderCode: orderCode.slice(0, 100),
        shopId: String(raw.shopId ?? "").trim().slice(0, 50),
        itemId: itemId.slice(0, 50),
        productName: String(raw.productName ?? "").trim().slice(0, 300),
        amount: Math.floor(amount),
        commission: Math.floor(commission),
        status: String(raw.status ?? "").trim().slice(0, 50),
        subId: raw.subId ? String(raw.subId).trim().slice(0, 100) : undefined,
      });
    }

    const result = await importOrders(cleanItems);
    await addImportHistory(auth.user.id, fileName, {
      total: result.total,
      matched: result.matched,
      updated: result.updated,
      duplicated: result.duplicated,
      unmatched: result.unmatched,
    });
    await logAudit("admin.import.csv", {
      userId: auth.user.id,
      target: fileName ? `file=${fileName}` : null,
      ip: getClientIp(request.headers),
      userAgent: request.headers.get("user-agent"),
      detail: `total=${result.total}, matched=${result.matched}, updated=${result.updated}, dup=${result.duplicated}, unmatched=${result.unmatched}`,
    });

    // Telegram summary cho admin sau khi import — fire-and-forget.
    void notifyCustom(
      "Import CSV hoàn tất",
      `Tổng: ${result.total} đơn\n` +
      `✅ Match mới: ${result.matched}\n` +
      `🔄 Cập nhật: ${result.updated}\n` +
      `⏭️ Trùng: ${result.duplicated}\n` +
      `❓ Không match: ${result.unmatched}`,
    );

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("[ImportOrders] Error:", err);
    return NextResponse.json({ success: false, error: "Lỗi xử lý import" }, { status: 500 });
  }
}
